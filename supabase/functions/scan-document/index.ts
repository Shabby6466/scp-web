import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
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

    const { imageBase64, documentCategory } = await reqon();

    // Rate limiting: 20 requests per minute (per authenticated user)
    if (!checkRateLimit(user.id, 20, 60000)) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later.", retryAfter: 30 }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing document scan for user ${user.id} with enhanced AI (Gemini 2.5 Pro)...`);

    // Use vision model to analyze the document with retry logic
    let retries = 2;
    let response: Response | undefined;

    while (retries >= 0) {
      try {
        response = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert document analysis assistant. Analyze documents with high precision and extract all relevant information. Return ONLY valid JSON with no markdown formatting.",
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `Perform comprehensive analysis of this ${documentCategory || "document"}:

EXTRACTION REQUIREMENTS:
1. Expiration Date: Extract in YYYY-MM-DD format. Check common locations (header, footer, signature area). Label as "Expiration", "Valid Until", "Expires", etc.
2. Issue Date: Extract document issue/creation date in YYYY-MM-DD format. Label as "Date Issued", "Date of Issue", "Issued On", "Created", etc.
3. Verification Date: Extract verification/certification date in YYYY-MM-DD format. Label as "Verified On", "Certified Date", "Inspection Date", etc.
4. Birth Date: For birth certificates or forms with DOB, extract in YYYY-MM-DD format.
5. Student Information: Extract full name (firstName, lastName), middle name if present.
6. Parent Information: Extract parent/guardian names (primary and secondary if listed), relationship to child.
7. Address Information: Extract complete address including street, city, state, zip code.
8. Contact Information: Extract phone numbers (home, mobile, emergency), email addresses.
9. Emergency Contacts: Extract emergency contact names, relationships, phone numbers.
10. Medical Information: Extract allergies, medications, medical conditions, doctor names/contacts if present.
11. Document Type: Classify accurately (immunization_record, birth_certificate, health_form, emergency_contact, proof_of_residence, medical_record).
12. Quality Issues: Identify rotation needs, blur, poor contrast, low resolution, text cutoff, shadows.
13. Missing Information: Flag incomplete fields, missing signatures, missing dates, partial forms.
14. Data Validation: Check date format validity, date logic (expiration > issue), name consistency, address completeness.
15. Compliance: Verify required fields for document type, check for watermarks/stamps.
16. Text Content: Summarize key information including names, dates, locations, and critical details.

Return ONLY this JSON structure (no markdown):
{
  "expirationDate": "YYYY-MM-DD or null",
  "issueDate": "YYYY-MM-DD or null",
  "verificationDate": "YYYY-MM-DD or null",
  "birthDate": "YYYY-MM-DD or null",
  "studentName": {
    "firstName": "string or null",
    "lastName": "string or null",
    "middleName": "string or null",
    "fullName": "string or null"
  },
  "parentInfo": {
    "primaryParent": {
      "name": "string or null",
      "relationship": "string or null"
    },
    "secondaryParent": {
      "name": "string or null",
      "relationship": "string or null"
    }
  },
  "address": {
    "street": "string or null",
    "city": "string or null",
    "state": "string or null",
    "zipCode": "string or null",
    "fullAddress": "string or null"
  },
  "contactInfo": {
    "homePhone": "string or null",
    "mobilePhone": "string or null",
    "email": "string or null",
    "emergencyPhone": "string or null"
  },
  "emergencyContacts": [
    {
      "name": "string",
      "relationship": "string",
      "phone": "string"
    }
  ],
  "medicalInfo": {
    "allergies": ["string"],
    "medications": ["string"],
    "conditions": ["string"],
    "doctorName": "string or null",
    "doctorPhone": "string or null"
  },
  "documentType": "detected type",
  "qualityIssues": ["specific quality problems"],
  "missingInfo": ["specific missing fields"],
  "dataValidation": ["any validation warnings"],
  "complianceIssues": ["any compliance concerns"],
  "textSummary": "detailed summary with key data points",
  "confidence": 0-100,
  "recommendedActions": ["specific improvement suggestions"]
}`,
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: imageBase64.startsWith("data:")
                          ? imageBase64
                          : `data:image/jpeg;base64,${imageBase64}`,
                      },
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            if (retries > 0) {
              console.log(`Rate limited, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              retries--;
              continue;
            }
            return new Response(
              JSON.stringify({
                error: "Rate limit exceeded. Please try again in a moment.",
                retryAfter: 30,
              }),
              {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({
                error: "AI credits exhausted. Please add credits to continue scanning documents.",
              }),
              {
                status: 402,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          const errorText = await response.text();
          console.error("AI gateway error:", response.status, errorText);

          if (retries > 0) {
            console.log(`AI error, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries--;
            continue;
          }

          throw new Error(`AI processing failed: ${response.status}`);
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

    const aiResponse = await responseon();
    const content = aiResponse.choices[0].message.content;

    console.log("AI Response received, parsing...");

    // Enhanced JSON parsing with multiple fallback strategies
    let scanResult;
    try {
      // Strategy 1: Remove all markdown formatting
      let cleanContent = content
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .replace(/^```/gm, "")
        .trim();

      // Strategy 2: Extract JSON object if wrapped in text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      scanResult = JSON.parse(cleanContent);

      // Validate required fields
      if (!scanResult.documentType) {
        scanResult.documentType = documentCategory || "unknown";
      }
      if (!Array.isArray(scanResult.qualityIssues)) {
        scanResult.qualityIssues = [];
      }
      if (!Array.isArray(scanResult.missingInfo)) {
        scanResult.missingInfo = [];
      }
      if (typeof scanResult.confidence !== 'number') {
        scanResult.confidence = 75;
      }

      console.log("Successfully parsed scan result:", {
        type: scanResult.documentType,
        confidence: scanResult.confidence,
        hasExpiration: !!scanResult.expirationDate,
        hasPersonalInfo: !!(scanResult.studentName?.fullName || scanResult.address?.fullAddress),
        user_id: user.id
      });

    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw content:", content);
      if (parseError instanceof Error) {
        console.error("Parse error details:", parseError.message);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response. The AI returned invalid data.",
          details: "Please try scanning the document again or contact support if the issue persists.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...scanResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in scan-document function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
