import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringDocument {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  school_id: string;
  school_name: string;
  expiration_date: string;
  days_until_expiry: number;
}

interface ParentEmail {
  parent_id: string;
  email: string;
  full_name: string;
  documents: ExpiringDocument[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the caller is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin, director, school, or school_staff role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role, school_id')
      .eq('user_id', user.id)
      .in('role', ['admin', 'director', 'school', 'school_staff'])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Role check failed - user does not have required role:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSchoolScoped = ['director', 'school', 'school_staff'].includes(roleData.role);
    const scopedSchoolId = isSchoolScoped ? roleData.school_id : null;

    console.log(`${roleData.role} access verified for user:`, user.id, isSchoolScoped ? `(school: ${scopedSchoolId})` : '');

    const { threshold = 30, schoolId } = await reqon();

    // Get expiring documents
    const { data: allExpiringDocs, error: docsError } = await supabase
      .rpc('get_expiring_documents', { days_threshold: threshold });

    if (docsError) throw docsError;

    // Filter by school if school-scoped role or if schoolId is provided
    const filterSchoolId = isSchoolScoped ? scopedSchoolId : schoolId;
    const expiringDocs = filterSchoolId
      ? allExpiringDocs?.filter((doc: ExpiringDocument) => doc.school_id === filterSchoolId)
      : allExpiringDocs;

    if (!expiringDocs || expiringDocs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expiring documents found", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group documents by parent (for student documents)
    const parentDocsMap = new Map<string, ParentEmail>();

    for (const doc of expiringDocs) {
      if (doc.entity_type === 'student') {
        // Get parent info for this student
        const { data: student } = await supabase
          .from('students')
          .select('parent_id, profiles:parent_id(email, full_name)')
          .eq('id', doc.entity_id)
          .single();

        if (student && student.profiles) {
          const parentId = student.parent_id;
          const profile = student.profiles as any;

          if (!parentDocsMap.has(parentId)) {
            parentDocsMap.set(parentId, {
              parent_id: parentId,
              email: profile.email,
              full_name: profile.full_name,
              documents: []
            });
          }
          parentDocsMap.get(parentId)!.documents.push(doc);
        }
      }
    }

    // Send emails to parents
    let sentCount = 0;
    const resendUrl = "https://api.resend.com/emails";

    for (const [_, parentData] of parentDocsMap) {
      const criticalDocs = parentData.documents.filter(d => d.days_until_expiry <= 7);
      const urgentDocs = parentData.documents.filter(d => d.days_until_expiry > 7 && d.days_until_expiry <= 30);

      const emailHtml = `
        <h2>Document Expiration Reminder</h2>
        <p>Hello ${parentData.full_name},</p>
        <p>This is a friendly reminder that the following documents are expiring soon:</p>
        
        ${criticalDocs.length > 0 ? `
          <h3 style="color: #dc2626;">Critical (≤7 days):</h3>
          <ul>
            ${criticalDocs.map(doc =>
        `<li><strong>${doc.entity_name}</strong> - ${doc.document_type.replace(/_/g, ' ')} (expires in ${doc.days_until_expiry} days)</li>`
      ).join('')}
          </ul>
        ` : ''}
        
        ${urgentDocs.length > 0 ? `
          <h3 style="color: #f97316;">Urgent (8-30 days):</h3>
          <ul>
            ${urgentDocs.map(doc =>
        `<li><strong>${doc.entity_name}</strong> - ${doc.document_type.replace(/_/g, ' ')} (expires in ${doc.days_until_expiry} days)</li>`
      ).join('')}
          </ul>
        ` : ''}
        
        <p>Please log in to your dashboard to upload updated documents.</p>
        <p>Thank you,<br>SCP Team</p>
      `;

      try {
        const response = await fetch(resendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "SCP <onboarding@resend.dev>",
            to: [parentData.email],
            subject: `Document Expiration Reminder - ${parentData.documents.length} document${parentData.documents.length > 1 ? 's' : ''} expiring soon`,
            html: emailHtml,
          }),
        });

        if (response.ok) {
          sentCount++;
          console.log(`Sent reminder to ${parentData.email}`);
        } else {
          const errorData = await responseon();
          console.error(`Failed to send email to ${parentData.email}:`, errorData);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${parentData.email}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminder emails`,
        sent: sentCount,
        total_expiring: expiringDocs.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-expiration-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
