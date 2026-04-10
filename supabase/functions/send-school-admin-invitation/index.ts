import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  school_id: string;
  admin_email: string;
  admin_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the user's JWT from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Create client with user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is an admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      throw new Error("Only platform admins can send school admin invitations");
    }

    const { school_id, admin_email, admin_name }: InvitationRequest = await req.json();

    if (!school_id || !admin_email) {
      throw new Error("school_id and admin_email are required");
    }

    // Get school details
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id, name, is_approved")
      .eq("id", school_id)
      .single();

    if (schoolError || !school) {
      throw new Error("School not found");
    }

    if (!school.is_approved) {
      throw new Error("Cannot invite admin to unapproved school");
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("school_admin_invitations")
      .select("id")
      .eq("school_id", school_id)
      .eq("admin_email", admin_email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      throw new Error("An invitation is already pending for this email");
    }

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from("school_admin_invitations")
      .insert({
        school_id,
        admin_email: admin_email.toLowerCase(),
        admin_name: admin_name || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      throw new Error("Failed to create invitation");
    }

    // Build the acceptance URL
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") 
      || "https://littleledger.lovable.app";
    const acceptUrl = `${appUrl}/accept-school-invite?token=${invitation.invitation_token}`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "LittleLedger <onboarding@resend.dev>",
      to: [admin_email],
      subject: `Welcome to LittleLedger - Set Up ${school.name}`,
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
                              You are Invited
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
                        ${admin_name ? `Hello ${admin_name}!` : 'Hello!'}
                      </h2>
                      
                      <p style="margin: 0 0 24px; color: #4a5568; font-size: 16px; line-height: 1.7; text-align: center;">
                        Great news! <strong style="color: #1e3a5f;">${school.name}</strong> has been approved on LittleLedger, and you have been invited to manage its account.
                      </p>
                      
                      <!-- Features Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #fdf9f3 0%, #f8f4ed 100%); border-radius: 12px; margin: 24px 0; border: 1px solid #e8e0d5;">
                        <tr>
                          <td style="padding: 28px;">
                            <p style="margin: 0 0 16px; color: #1e3a5f; font-size: 15px; font-weight: 600;">
                              As School Administrator, you will be able to:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Manage student enrollments and track documents</td></tr></table></td></tr>
                              <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Add and manage teachers and staff records</td></tr></table></td></tr>
                              <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Configure required documents and compliance rules</td></tr></table></td></tr>
                              <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Monitor compliance and send expiration reminders</td></tr></table></td></tr>
                              <tr><td style="padding: 8px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="width: 28px; vertical-align: top;"><span style="color: #e5a31c; font-size: 16px;">&#10003;</span></td><td style="color: #4a5568; font-size: 14px; line-height: 1.5;">Communicate securely with parents</td></tr></table></td></tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 16px 0 24px;">
                            <a href="${acceptUrl}" 
                               style="display: inline-block; background: linear-gradient(135deg, #e5a31c 0%, #d4920a 100%); color: #1e3a5f; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(229, 163, 28, 0.4); letter-spacing: 0.3px;">
                              Accept Invitation
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
    });

    console.log("School admin invitation sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        message: `Invitation sent to ${admin_email}` 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-school-admin-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
