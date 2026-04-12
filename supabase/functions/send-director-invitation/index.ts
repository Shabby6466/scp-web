import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  checkPersistentRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
  sanitizeErrorMessage
} from '../_shared/rate-limit.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DirectorInvitationRequest {
  invitationId: string;
}

Deno.serve(async (req) => {
  console.log("send-director-invitation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Persistent rate limiting: 20 requests per minute
    const identifier = getRateLimitIdentifier(req);
    const rateLimit = await checkPersistentRateLimit(
      supabase, identifier, 'send-director-invitation', 20, 60000
    );

    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for ${identifier}`);
      return createRateLimitResponse(60, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization");

    // Validate authorization
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check user role - only school admins can send director invitations
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      console.error("Role fetch error:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden - no role assigned" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const allowedRoles = ["admin", "school", "school_staff"];
    if (!allowedRoles.includes(roleData.role)) {
      console.error("User role not allowed:", roleData.role);
      return new Response(
        JSON.stringify({ error: "Forbidden - insufficient permissions" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invitationId }: DirectorInvitationRequest = await reqon();
    console.log("Processing director invitation:", invitationId);

    // Fetch invitation with school and branch details
    const { data: invitation, error: fetchError } = await supabase
      .from("director_invitations")
      .select(`
        *,
        schools:school_id(name),
        branches:branch_id(branch_name)
      `)
      .eq("id", invitationId)
      .single();

    if (fetchError || !invitation) {
      console.error("Error fetching invitation:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify school_id access for non-admin users
    if (roleData.role !== "admin" && roleData.school_id !== invitation.school_id) {
      console.error("User does not have access to this school:", {
        userSchoolId: roleData.school_id,
        invitationSchoolId: invitation.school_id
      });
      return new Response(
        JSON.stringify({ error: "Forbidden - no access to this school" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authorization validated for user:", user.id, "role:", roleData.role);
    console.log("Invitation found for:", invitation.email);

    const schoolName = invitation.schools?.name || "Your School";
    const branchName = invitation.branches?.branch_name || "";
    const inviteUrl = `${req.headers.get("origin") || "https://SCP.lovable.app"}/accept-director-invite?token=${invitation.invitation_token}`;

    const emailResponse = await resend.emails.send({
      from: "SCP <onboarding@resend.dev>",
      to: [invitation.email],
      subject: `You're invited to be a Director at ${schoolName} on SCP`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #1e3a5f; margin: 0; }
            .content { background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
            .button { display: inline-block; background: #d4a574; color: #1e3a5f; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .details p { margin: 8px 0; }
            .highlight { background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SCP</h1>
              <p>Document Management for Schools</p>
            </div>
            <div class="content">
              <h2>You're Invited to be a Director!</h2>
              <p>Hello${invitation.full_name ? ` ${invitation.full_name}` : ''},</p>
              <p><strong>${schoolName}</strong> has invited you to join their team as a <strong>Branch Director</strong> on SCP.</p>
              
              <div class="highlight">
                <p><strong>As a Director, you'll be able to:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Manage students and teachers at your assigned branch</li>
                  <li>Review and approve documents</li>
                  <li>Track compliance and expiration dates</li>
                  <li>Access your branch's dashboard and reports</li>
                </ul>
              </div>
              
              <div class="details">
                ${invitation.full_name ? `<p><strong>Name:</strong> ${invitation.full_name}</p>` : ""}
                <p><strong>Email:</strong> ${invitation.email}</p>
                <p><strong>School:</strong> ${schoolName}</p>
                ${branchName ? `<p><strong>Branch:</strong> ${branchName}</p>` : ""}
              </div>
              
              <p>Click the button below to create your account and get started:</p>
              <p style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </p>
              <p style="font-size: 14px; color: #666;">This invitation expires in 7 days.</p>
            </div>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} SCP. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Director invitation email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-director-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
