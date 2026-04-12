import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WelcomeRequest {
  parentName: string;
  parentEmail: string;
  schoolId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify the JWT token and get user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { parentName, parentEmail, schoolId }: WelcomeRequest = await reqon();

    // Security check: Only allow sending welcome email to the authenticated user's own email
    if (user.email?.toLowerCase() !== parentEmail?.toLowerCase()) {
      console.error('Email mismatch - user:', user.email, 'requested:', parentEmail);
      return new Response(
        JSON.stringify({ error: 'You can only send welcome emails to your own email address' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending welcome email to:', parentEmail, 'by user:', user.id);

    // Get school name if schoolId provided
    let schoolName = 'your school';
    if (schoolId) {
      const { data: school } = await supabaseClient
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .single();

      if (school) {
        schoolName = school.name;
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping welcome email');
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped - no API key' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dashboardUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''}/dashboard`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SCP <onboarding@resend.dev>',
        to: [parentEmail],
        subject: `Welcome to SCP, ${parentName.split(' ')[0]}! 🎉`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fdf9f3;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdf9f3; padding: 48px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    
                    <!-- Header with Logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 48px 40px; text-align: center;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <div style="display: inline-block; background-color: #e5a31c; width: 56px; height: 56px; border-radius: 12px; margin-bottom: 16px; text-align: center; line-height: 56px;">
                                <span style="color: #1e3a5f; font-size: 24px; font-weight: 700;">LL</span>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td align="center">
                              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome to SCP!</h1>
                              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 18px; font-weight: 500;">Hi ${parentName.split(' ')[0]}, we're excited to have you!</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.7;">
                          Your account is all set up and you're ready to start managing your child's documents for <strong style="color: #1e3a5f;">${schoolName}</strong>. Here are some tips to get you started:
                        </p>
                        
                        <!-- Tips Section -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                          
                          <!-- Tip 1 -->
                          <tr>
                            <td style="padding: 16px 0;">
                              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; border: 1px solid #e8e0d5;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="48" valign="top">
                                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); border-radius: 10px; text-align: center; line-height: 40px;">
                                            <span style="color: #1e3a5f; font-size: 18px; font-weight: 700;">1</span>
                                          </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                          <h3 style="margin: 0 0 8px; color: #1e3a5f; font-size: 16px; font-weight: 700;">Add Your Child's Information</h3>
                                          <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">Start by adding your child's basic information including their name, date of birth, and grade level.</p>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Tip 2 -->
                          <tr>
                            <td style="padding: 16px 0;">
                              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; border: 1px solid #e8e0d5;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="48" valign="top">
                                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); border-radius: 10px; text-align: center; line-height: 40px;">
                                            <span style="color: #1e3a5f; font-size: 18px; font-weight: 700;">2</span>
                                          </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                          <h3 style="margin: 0 0 8px; color: #1e3a5f; font-size: 16px; font-weight: 700;">Upload Required Documents</h3>
                                          <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">Check your dashboard checklist to see which documents are required. You can upload photos or PDFs of immunization records, birth certificates, and more.</p>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Tip 3 -->
                          <tr>
                            <td style="padding: 16px 0;">
                              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; border: 1px solid #e8e0d5;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="48" valign="top">
                                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); border-radius: 10px; text-align: center; line-height: 40px;">
                                            <span style="color: #1e3a5f; font-size: 18px; font-weight: 700;">3</span>
                                          </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                          <h3 style="margin: 0 0 8px; color: #1e3a5f; font-size: 16px; font-weight: 700;">Use Smart Scan for Faster Uploads</h3>
                                          <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">Our AI-powered Smart Scan can automatically detect document types and expiration dates, saving you time on data entry.</p>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                          <!-- Tip 4 -->
                          <tr>
                            <td style="padding: 16px 0;">
                              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; border: 1px solid #e8e0d5;">
                                <tr>
                                  <td style="padding: 20px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td width="48" valign="top">
                                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); border-radius: 10px; text-align: center; line-height: 40px;">
                                            <span style="color: #1e3a5f; font-size: 18px; font-weight: 700;">4</span>
                                          </div>
                                        </td>
                                        <td style="padding-left: 16px;">
                                          <h3 style="margin: 0 0 8px; color: #1e3a5f; font-size: 16px; font-weight: 700;">Stay on Top of Expirations</h3>
                                          <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">We'll send you reminders before your documents expire so you can stay compliant without the stress.</p>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          
                        </table>
                        
                        <!-- CTA Button -->
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 24px 0;">
                              <a href="${dashboardUrl}" 
                                 style="display: inline-block; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); color: #1e3a5f; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(229, 163, 28, 0.4); letter-spacing: 0.3px;">
                                Go to My Dashboard
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Help Box -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border-radius: 10px; border: 1px solid #bae6fd; margin-top: 16px;">
                          <tr>
                            <td style="padding: 20px;">
                              <p style="margin: 0; color: #0369a1; font-size: 14px; line-height: 1.6;">
                                <strong>Need help?</strong> If you have any questions about uploading documents or using SCP, don't hesitate to reach out to your school or contact our support team.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #1e3a5f; padding: 32px 40px; text-align: center;">
                        <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">SCP</p>
                        <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6;">
                          Secure document management for preschools.<br>
                          &copy; ${new Date().getFullYear()} SCP. All rights reserved.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                  
                  <!-- Help Text -->
                  <table width="600" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 24px 40px; text-align: center;">
                        <p style="margin: 0; color: #718096; font-size: 12px;">
                          Questions? Contact us at <a href="mailto:support@SCP.com" style="color: #1e3a5f; text-decoration: underline;">support@SCP.com</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Failed to send welcome email:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Welcome email sent successfully to:', parentEmail);

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-parent-welcome function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
