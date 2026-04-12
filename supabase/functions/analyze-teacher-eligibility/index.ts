import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Position {
  id: string;
  name: string;
  min_education_level?: string;
  min_credits?: number;
  min_ece_credits?: number;
  min_years_experience?: number;
  requires_cda?: boolean;
  requires_state_cert?: boolean;
}

interface TeacherProfile {
  education_level?: string;
  education_field?: string;
  total_credits?: number;
  ece_credits?: number;
  years_experience?: number;
  cda_credential?: boolean;
  state_certification?: string;
  first_aid_certified?: boolean;
  cpr_certified?: boolean;
}

const EDUCATION_HIERARCHY: Record<string, number> = {
  'high_school': 1,
  'some_college': 2,
  'associates': 3,
  'bachelors': 4,
  'masters': 5,
  'doctorate': 6,
};

function meetsEducationRequirement(teacherLevel: string | undefined, requiredLevel: string | undefined): boolean {
  if (!requiredLevel) return true;
  if (!teacherLevel) return false;
  return (EDUCATION_HIERARCHY[teacherLevel] || 0) >= (EDUCATION_HIERARCHY[requiredLevel] || 0);
}

function checkPositionEligibility(profile: TeacherProfile, position: Position): { eligible: boolean; gaps: string[] } {
  const gaps: string[] = [];

  if (position.min_education_level && !meetsEducationRequirement(profile.education_level, position.min_education_level)) {
    gaps.push(`Requires ${position.min_education_level} education level`);
  }

  if (position.min_credits && (profile.total_credits || 0) < position.min_credits) {
    gaps.push(`Needs ${position.min_credits - (profile.total_credits || 0)} more college credits`);
  }

  if (position.min_ece_credits && (profile.ece_credits || 0) < position.min_ece_credits) {
    gaps.push(`Needs ${position.min_ece_credits - (profile.ece_credits || 0)} more ECE credits`);
  }

  if (position.min_years_experience && (profile.years_experience || 0) < position.min_years_experience) {
    gaps.push(`Needs ${position.min_years_experience - (profile.years_experience || 0)} more years experience`);
  }

  if (position.requires_cda && !profile.cda_credential) {
    gaps.push('CDA credential required');
  }

  if (position.requires_state_cert && !profile.state_certification) {
    gaps.push('State certification required');
  }

  return { eligible: gaps.length === 0, gaps };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teacherId, profile, positions } = await reqon() as {
      teacherId: string;
      profile: TeacherProfile;
      positions: Position[];
    };

    console.log('Analyzing eligibility for teacher:', teacherId);

    // First, do rule-based analysis (always works)
    const positionAnalysis = positions.map(position => {
      const { eligible, gaps } = checkPositionEligibility(profile, position);
      return {
        position: position.name,
        position_id: position.id,
        meets_requirements: eligible,
        gaps,
      };
    });

    // Calculate confidence scores based on rules
    const recommendedPositions = positionAnalysis
      .map(p => ({
        position: p.position,
        position_id: p.position_id,
        meets_requirements: p.meets_requirements,
        confidence: p.meets_requirements ? 100 : Math.max(0, 100 - (p.gaps.length * 20)),
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    // Build context for AI
    const profileSummary = `
Education: ${profile.education_level || 'Not specified'} in ${profile.education_field || 'Not specified'}
Credits: ${profile.total_credits || 0} total, ${profile.ece_credits || 0} ECE
Experience: ${profile.years_experience || 0} years
Certifications: ${[
        profile.cda_credential ? 'CDA' : null,
        profile.state_certification || null,
        profile.first_aid_certified ? 'First Aid' : null,
        profile.cpr_certified ? 'CPR' : null,
      ].filter(Boolean).join(', ') || 'None'}
    `.trim();

    const positionsSummary = positions.map(p =>
      `${p.name}: ${p.min_education_level || 'Any'} education, ${p.min_credits || 0} credits, ${p.min_ece_credits || 0} ECE, ${p.min_years_experience || 0}+ years${p.requires_cda ? ', CDA required' : ''}${p.requires_state_cert ? ', State cert required' : ''}`
    ).join('\n');

    // Check for AI API key - support multiple providers
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    // Try AI analysis if any key is available
    let aiInsights = { strengths: [], gaps: [], suggestions: [] };
    let aiEnabled = false;

    if (OPENAI_API_KEY) {
      aiEnabled = true;
      console.log('Using OpenAI for analysis');

      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert in early childhood education staffing and teacher qualifications. Analyze teacher qualifications and provide actionable insights for role placement. Be concise and practical.`
              },
              {
                role: 'user',
                content: `Analyze this teacher's qualifications for our available positions:

TEACHER PROFILE:
${profileSummary}

AVAILABLE POSITIONS:
${positionsSummary}

Based on their qualifications:
1. What are their key strengths? (2-3 bullet points)
2. What gaps should they address? (2-3 bullet points)  
3. What professional development would you suggest? (2-3 bullet points)

Format your response as JSON:
{
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`
              }
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponseon();
          const aiContent = aiData.choices?.[0]?.message?.content || '';

          try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiInsights = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.error('Failed to parse AI response:', e);
          }
        } else {
          console.error('OpenAI API error:', aiResponse.status, await aiResponse.text());
        }
      } catch (aiError) {
        console.error('AI request failed:', aiError);
      }
    } else if (ANTHROPIC_API_KEY) {
      aiEnabled = true;
      console.log('Using Anthropic for analysis');

      try {
        const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [
              {
                role: 'user',
                content: `You are an expert in early childhood education staffing. Analyze this teacher's qualifications:

TEACHER PROFILE:
${profileSummary}

AVAILABLE POSITIONS:
${positionsSummary}

Provide:
1. Key strengths (2-3 points)
2. Gaps to address (2-3 points)  
3. Professional development suggestions (2-3 points)

Respond ONLY with JSON:
{
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`
              }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponseon();
          const aiContent = aiData.content?.[0]?.text || '';

          try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              aiInsights = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            console.error('Failed to parse Anthropic response:', e);
          }
        } else {
          console.error('Anthropic API error:', aiResponse.status, await aiResponse.text());
        }
      } catch (aiError) {
        console.error('Anthropic request failed:', aiError);
      }
    }

    // If no AI available, return rules-based analysis only
    if (!aiEnabled) {
      console.log('No AI API key configured - returning rules-based analysis only');

      // Generate basic insights from rules
      const rulesGaps = positionAnalysis
        .filter(p => !p.meets_requirements)
        .flatMap(p => p.gaps)
        .slice(0, 3);

      const analysis = {
        recommended_positions: recommendedPositions,
        strengths: ['Profile data collected for review'],
        gaps: rulesGaps.length > 0 ? rulesGaps : ['Complete all qualification fields for detailed analysis'],
        suggestions: ['Complete all qualification fields for more accurate analysis'],
        ai_enabled: false,
      };

      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Combine rules-based and AI analysis
    const analysis = {
      recommended_positions: recommendedPositions,
      strengths: aiInsights.strengths?.length > 0
        ? aiInsights.strengths
        : ['Profile data collected for review'],
      gaps: aiInsights.gaps?.length > 0
        ? aiInsights.gaps
        : positionAnalysis.filter(p => !p.meets_requirements).flatMap(p => p.gaps).slice(0, 3),
      suggestions: aiInsights.suggestions?.length > 0
        ? aiInsights.suggestions
        : ['Complete all qualification fields for more accurate analysis'],
      ai_enabled: true,
    };

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-teacher-eligibility:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
