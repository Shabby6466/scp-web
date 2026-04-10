import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter - sliding window (per authenticated user)
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimiter.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimiter.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Check if URL points to a PDF file
function isPdfUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  // Check file extension in the path
  if (urlLower.includes('.pdf')) {
    return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and get the authenticated user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageUrl, documentType } = await req.json();

    // Rate limiting: 10 requests per minute (per authenticated user)
    if (!checkRateLimit(user.id, 10, 60000)) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later.", retryAfter: 30 }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Authenticating document for user ${user.id}:`, { documentType, imageUrl: imageUrl?.substring(0, 100) });

    // Check if the document is a PDF - AI vision doesn't support PDFs
    const isPdf = isPdfUrl(imageUrl);
    
    if (isPdf) {
      console.log('PDF document detected - returning manual review required');
      return new Response(
        JSON.stringify({ 
          success: true,
          analysis: {
            authenticityScore: 50,
            isAuthentic: true,
            forgeryIndicators: [],
            securityFeatures: ['Unable to analyze - PDF format'],
            qualityIssues: ['PDF documents cannot be analyzed by AI vision'],
            extractedData: {},
            complianceIssues: [],
            dataValidation: [],
            recommendation: 'REVIEW',
            reasoning: 'PDF documents require manual review. AI image analysis only supports image formats (PNG, JPEG, GIF, WEBP). Please review the document manually or upload an image version for automated analysis.',
            confidence: 'low',
            criticalFindings: ['Document is in PDF format - automated vision analysis not available'],
            isPdf: true
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Retry logic for AI requests
    let retries = 2;
    let response: Response | undefined;
    
    while (retries >= 0) {
      try {
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an expert document forensics and authentication specialist. Analyze documents with extreme precision and identify any signs of forgery, tampering, or manipulation. Return ONLY valid JSON with no markdown formatting.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Perform comprehensive forensic authentication of this ${documentType} document:

ANALYSIS REQUIREMENTS:
1. **Authenticity Score** (0-100): Likelihood document is genuine
2. **Forgery Detection**: Identify tampering, digital editing, photoshop artifacts
3. **Security Features**: Check watermarks, seals, signatures, official stamps
4. **Typography Analysis**: Font consistency, spacing, alignment, kerning
5. **Print Quality**: Resolution, scanning artifacts, compression artifacts
6. **Data Integrity**: Date consistency, logical information flow
7. **Compliance Validation**: Required fields, proper formatting
8. **Template Matching**: Compare against known templates
9. **Metadata Analysis**: File creation info, editing history indicators
10. **Physical Document Signs**: Paper texture, ink quality, official markings

RED FLAGS TO CHECK:
- Stock photo watermarks (PSDSTORES, Shutterstock, etc.)
- Adobe/Photoshop metadata or logos
- Perfect digital fonts on supposedly printed documents
- Misaligned or inconsistent text
- Missing security features for document type
- Suspicious shadows or lighting inconsistencies
- Copy/paste artifacts
- Low quality scans hiding tampering
- Template file indicators
- Mock-up presentation styles

Return ONLY this JSON structure (no markdown):
{
  "authenticityScore": 0-100,
  "isAuthentic": boolean,
  "forgeryIndicators": ["specific indicators found"],
  "securityFeatures": ["present/missing security elements"],
  "qualityIssues": ["specific quality problems"],
  "extractedData": {"key": "value pairs"},
  "complianceIssues": ["specific compliance problems"],
  "dataValidation": ["consistency checks results"],
  "recommendation": "APPROVE|REVIEW|REJECT",
  "reasoning": "detailed explanation",
  "confidence": "high|medium|low",
  "criticalFindings": ["most serious issues if any"]
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
                }
              ]
            }
          ],
          max_completion_tokens: 2000
        }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Lovable AI API error:', response.status, error);
          
          if (response.status === 429) {
            if (retries > 0) {
              console.log(`Rate limited, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              retries--;
              continue;
            }
            return new Response(
              JSON.stringify({ 
                success: false,
                error: "Rate limit exceeded. Please try again in a moment.",
                analysis: {
                  authenticityScore: 0,
                  isAuthentic: false,
                  forgeryIndicators: ['Analysis rate limited'],
                  qualityIssues: [],
                  extractedData: {},
                  complianceIssues: [],
                  recommendation: 'REVIEW',
                  reasoning: 'Rate limited - manual review required',
                  confidence: 'low'
                }
              }),
              {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ 
                success: false,
                error: "AI credits exhausted. Please add credits to continue.",
                analysis: {
                  authenticityScore: 0,
                  isAuthentic: false,
                  forgeryIndicators: ['Analysis unavailable - credits exhausted'],
                  qualityIssues: [],
                  extractedData: {},
                  complianceIssues: [],
                  recommendation: 'REVIEW',
                  reasoning: 'Credits exhausted - manual review required',
                  confidence: 'low'
                }
              }),
              {
                status: 402,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          // Check for unsupported format errors (400)
          if (response.status === 400 && error.includes('mimetype')) {
            console.log('Unsupported file format detected from API error');
            return new Response(
              JSON.stringify({ 
                success: true,
                analysis: {
                  authenticityScore: 50,
                  isAuthentic: true,
                  forgeryIndicators: [],
                  securityFeatures: ['Unable to analyze - unsupported format'],
                  qualityIssues: ['Document format not supported for AI vision analysis'],
                  extractedData: {},
                  complianceIssues: [],
                  dataValidation: [],
                  recommendation: 'REVIEW',
                  reasoning: 'This document format is not supported for automated AI analysis. Please review the document manually or upload an image version (PNG, JPEG, GIF, or WEBP) for automated analysis.',
                  confidence: 'low',
                  criticalFindings: ['Document format not supported for automated analysis']
                }
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          if (retries > 0) {
            console.log(`AI error, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries--;
            continue;
          }
          
          throw new Error(`AI API error: ${response.status}`);
        }
        
        break; // Success, exit retry loop
      } catch (fetchError) {
        if (retries > 0) {
          console.error(`Fetch error, retrying... (${retries} attempts left)`, fetchError);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
          continue;
        }
        throw fetchError;
      }
    }

    if (!response) {
      throw new Error("Failed to get response from AI after retries");
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    console.log('AI Authentication Analysis received, parsing...');

    // Enhanced JSON parsing with multiple strategies
    let analysis;
    try {
      // Strategy 1: Remove all markdown formatting
      let cleanContent = analysisText
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .replace(/^```/gm, "")
        .trim();
      
      // Strategy 2: Extract JSON object if wrapped in text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      analysis = JSON.parse(cleanContent);
      
      // Validate and normalize required fields
      if (typeof analysis.authenticityScore !== 'number') {
        analysis.authenticityScore = 50;
      }
      if (typeof analysis.isAuthentic !== 'boolean') {
        analysis.isAuthentic = analysis.authenticityScore >= 70;
      }
      if (!Array.isArray(analysis.forgeryIndicators)) {
        analysis.forgeryIndicators = [];
      }
      if (!Array.isArray(analysis.qualityIssues)) {
        analysis.qualityIssues = [];
      }
      if (!analysis.recommendation) {
        analysis.recommendation = 'REVIEW';
      }
      
      console.log('Successfully parsed authentication analysis:', {
        score: analysis.authenticityScore,
        authentic: analysis.isAuthentic,
        recommendation: analysis.recommendation,
        user_id: user.id
      });
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      if (parseError instanceof Error) {
        console.error('Parse error details:', parseError.message);
      }
      console.error('Raw analysis text:', analysisText);
      // Fallback to basic analysis
      analysis = {
        authenticityScore: 50,
        isAuthentic: true,
        forgeryIndicators: [],
        qualityIssues: ['Unable to perform detailed analysis'],
        extractedData: {},
        complianceIssues: [],
        recommendation: 'REVIEW',
        reasoning: 'Manual review recommended - automated analysis incomplete',
        confidence: 'low'
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in authenticate-document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        analysis: {
          authenticityScore: 0,
          isAuthentic: false,
          forgeryIndicators: ['Analysis failed'],
          qualityIssues: [],
          extractedData: {},
          complianceIssues: [],
          recommendation: 'REVIEW',
          reasoning: 'Automated authentication failed - manual review required',
          confidence: 'low'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
