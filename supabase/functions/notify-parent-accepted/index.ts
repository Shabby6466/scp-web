import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  invitationToken: string;
  parentName: string;
  parentEmail: string;
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

    const { invitationToken, parentName, parentEmail }: NotificationRequest = await req.json();

    console.log('Processing parent acceptance notification for:', parentEmail, 'by user:', user.id);

    if (!invitationToken) {
      return new Response(
        JSON.stringify({ error: 'Invitation token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the invitation details
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('parent_invitations')
      .select(`
        id,
        school_id,
        parent_email,
        status,
        created_by,
        school:schools(name, email)
      `)
      .eq('invitation_token', invitationToken)
      .single();

    if (inviteError || !invitation) {
      console.log('Invitation not found or error:', inviteError);
      return new Response(
        JSON.stringify({ success: true, message: 'No invitation to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the caller's email matches the invitation email (the parent accepting the invite)
    if (user.email?.toLowerCase() !== invitation.parent_email?.toLowerCase()) {
      console.error('Email mismatch - user:', user.email, 'invitation:', invitation.parent_email);
      return new Response(
        JSON.stringify({ error: 'You can only accept invitations sent to your email' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseClient
      .from('parent_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation status:', updateError);
    }

    // Get the school admin who sent the invitation
    const { data: inviter, error: inviterError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('id', invitation.created_by)
      .single();

    const school = Array.isArray(invitation.school) ? invitation.school[0] : invitation.school;
    const schoolName = school?.name || 'Your School';
    const schoolEmail = school?.email;
    const inviterEmail = inviter?.email || schoolEmail;

    if (!inviterEmail) {
      console.log('No recipient email found for notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Invitation accepted but no notification sent - no recipient email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send notification email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LittleLedger <onboarding@resend.dev>',
            to: [inviterEmail],
            subject: `${parentName || parentEmail} has joined ${schoolName} on LittleLedger`,
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
                          <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 40px; text-align: center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <div style="display: inline-block; background-color: #e5a31c; width: 48px; height: 48px; border-radius: 10px; margin-bottom: 12px; text-align: center; line-height: 48px;">
                                    <span style="color: #1e3a5f; font-size: 20px; font-weight: 700;">LL</span>
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td align="center">
                                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">LittleLedger</h1>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Success Badge -->
                        <tr>
                          <td style="padding: 0 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="padding-top: 32px;">
                                  <span style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 20px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
                                    ✓ New Parent Enrolled
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                          <td style="padding: 32px 40px 40px;">
                            <h2 style="margin: 0 0 16px; color: #1e3a5f; font-size: 24px; font-weight: 700; text-align: center; line-height: 1.3;">
                              Great News!
                            </h2>
                            
                            <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.7; text-align: center;">
                              A parent has accepted your invitation and created their account on LittleLedger.
                            </p>
                            
                            <!-- Parent Details Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; margin: 24px 0; border: 1px solid #e8e0d5;">
                              <tr>
                                <td style="padding: 28px;">
                                  <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                      <td style="padding: 8px 0;">
                                        <p style="margin: 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Parent Name</p>
                                        <p style="margin: 4px 0 0; color: #1e3a5f; font-size: 18px; font-weight: 600;">${parentName || 'Not provided'}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 16px 0 8px; border-top: 1px solid #e8e0d5;">
                                        <p style="margin: 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</p>
                                        <p style="margin: 4px 0 0; color: #1e3a5f; font-size: 16px;">${parentEmail}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style="padding: 16px 0 8px; border-top: 1px solid #e8e0d5;">
                                        <p style="margin: 0; color: #718096; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">School</p>
                                        <p style="margin: 4px 0 0; color: #1e3a5f; font-size: 16px;">${schoolName}</p>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <p style="margin: 0 0 24px; color: #4a5568; font-size: 14px; line-height: 1.7; text-align: center;">
                              The parent can now log in and begin uploading their child's documents. You'll be able to review and approve submitted documents from your dashboard.
                            </p>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="padding: 16px 0;">
                                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''}/school-dashboard" 
                                     style="display: inline-block; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); color: #1e3a5f; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(229, 163, 28, 0.4); letter-spacing: 0.3px;">
                                    View Dashboard
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #1e3a5f; padding: 28px 40px; text-align: center;">
                            <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">LittleLedger</p>
                            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6;">
                              Secure document management for preschools.<br>
                              &copy; ${new Date().getFullYear()} LittleLedger. All rights reserved.
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
          console.error('Failed to send notification email:', errorText);
        } else {
          console.log('Notification email sent successfully to:', inviterEmail);
        }
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping notification email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Parent acceptance notification processed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-parent-accepted function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
