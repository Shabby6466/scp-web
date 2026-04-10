import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  checkPersistentRateLimit, 
  createRateLimitResponse, 
  getRateLimitIdentifier,
  sanitizeErrorMessage 
} from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  parentEmail: string;
  schoolId: string;
  studentId: string; // Required - invitations must be child-scoped
  parentFirstName?: string;
  parentLastName?: string;
  branchId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Persistent rate limiting: 5 requests per minute (email sending)
    const identifier = getRateLimitIdentifier(req);
    const rateLimit = await checkPersistentRateLimit(
      supabaseClient, identifier, 'send-parent-invitation', 5, 60000
    );
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for ${identifier}`);
      return createRateLimitResponse(60, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { parentEmail, schoolId, studentId, parentFirstName, parentLastName, branchId }: InvitationRequest = await req.json();

    console.log('Creating invitation for:', parentEmail, 'from school:', schoolId);

    // Validate studentId is provided
    if (!studentId) {
      return new Response(
        JSON.stringify({ error: 'studentId is required for child-scoped invitations' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission to send invitations for this school
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('school_id, branch_id, role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.school_id !== schoolId || 
        !['school', 'school_staff', 'director'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have permission to send invitations for this school' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If director, verify student belongs to their branch
    if (userRole.role === 'director' && userRole.branch_id) {
      const { data: student, error: studentError } = await supabaseClient
        .from('students')
        .select('branch_id')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return new Response(
          JSON.stringify({ error: 'Student not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (student.branch_id && student.branch_id !== userRole.branch_id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Student is not in your branch' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get school details
    const { data: school, error: schoolError } = await supabaseClient
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return new Response(
        JSON.stringify({ error: 'School not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create invitation record - child-scoped
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('parent_invitations')
      .insert({
        school_id: schoolId,
        parent_email: parentEmail,
        created_by: user.id,
        student_id: studentId,
        branch_id: branchId || userRole.branch_id || null,
        parent_first_name: parentFirstName || null,
        parent_last_name: parentLastName || null,
        status: 'sent',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: inviteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create enrollment link
    const enrollmentLink = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''}/accept-parent-invite?token=${invitation.invitation_token}`;

    console.log('Invitation created successfully:', invitation.id);

    // Send email using Resend (if API key is configured)
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
            to: [parentEmail],
            subject: `${school.name} invites you to enroll your child on LittleLedger`,
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
                                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">LittleLedger</h1>
                                  <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500;">Secure Document Management for Preschools</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Welcome Badge -->
                        <tr>
                          <td style="padding: 0 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="padding-top: 32px;">
                                  <span style="display: inline-block; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); color: #1e3a5f; font-size: 12px; font-weight: 700; padding: 8px 20px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
                                    Parent Invitation
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                          <td style="padding: 32px 40px 40px;">
                            <h2 style="margin: 0 0 16px; color: #1e3a5f; font-size: 26px; font-weight: 700; text-align: center; line-height: 1.3;">
                              Welcome to ${school.name}!
                            </h2>
                            
                            <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.7; text-align: center;">
                              <strong style="color: #1e3a5f;">${school.name}</strong> has invited you to join LittleLedger to securely manage your child's enrollment documents.
                            </p>
                            
                            <!-- Features Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; margin: 24px 0; border: 1px solid #e8e0d5;">
                              <tr>
                                <td style="padding: 28px;">
                                  <p style="margin: 0 0 16px; color: #1e3a5f; font-size: 15px; font-weight: 600;">
                                    With LittleLedger, you can:
                                  </p>
                                  <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Securely upload and store enrollment documents</td></tr></table></td></tr>
                                    <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Track document status and compliance requirements</td></tr></table></td></tr>
                                    <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Receive expiration alerts before documents expire</td></tr></table></td></tr>
                                    <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Communicate directly with the school</td></tr></table></td></tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center" style="padding: 16px 0 24px;">
                                  <a href="${enrollmentLink}" 
                                     style="display: inline-block; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); color: #1e3a5f; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(229, 163, 28, 0.4); letter-spacing: 0.3px;">
                                    Start Enrollment
                                  </a>
                                </td>
                              </tr>
                            </table>
                            
                            <!-- Expiration Notice -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef7e6; border-radius: 10px; border-left: 4px solid #e5a31c;">
                              <tr>
                                <td style="padding: 16px 20px;">
                                  <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                    <strong>This invitation expires in 7 days.</strong><br>
                                    <span style="color: #b45309;">If you did not expect this email, you can safely ignore it.</span>
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #1e3a5f; padding: 32px 40px; text-align: center;">
                            <p style="margin: 0 0 8px; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">LittleLedger</p>
                            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 12px; line-height: 1.6;">
                              Secure document management for preschools.<br>
                              &copy; ${new Date().getFullYear()} LittleLedger. All rights reserved.
                            </p>
                          </td>
                        </tr>
                        
                      </table>
                      
                      <!-- Help Text -->
                      <table width="600" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 24px 40px; text-align: center;">
                            <p style="margin: 0; color: #718096; font-size: 12px;">
                              Questions? Contact us at <a href="mailto:support@littleledger.com" style="color: #1e3a5f; text-decoration: underline;">support@littleledger.com</a>
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
          console.error('Failed to send email:', errorText);
        } else {
          console.log('Email sent successfully to:', parentEmail);
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the request if email sending fails
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email send');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation,
        enrollmentLink,
        emailSent: !!resendApiKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-parent-invitation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});