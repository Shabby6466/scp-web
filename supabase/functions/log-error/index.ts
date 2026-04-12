import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ErrorLogRequest {
  function_name: string;
  error_type: string;
  error_message: string;
  error_stack?: string;
  severity?: "warning" | "error" | "critical";
  school_id?: string;
  user_id?: string;
  request_id?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ErrorLogRequest = await reqon();

    // Validate required fields
    if (!body.function_name || !body.error_type || !body.error_message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: function_name, error_type, error_message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert error log
    const { data: errorLog, error: insertError } = await supabase
      .from("error_logs")
      .insert({
        function_name: body.function_name,
        error_type: body.error_type,
        error_message: body.error_message,
        error_stack: body.error_stack || null,
        severity: body.severity || "error",
        school_id: body.school_id || null,
        user_id: body.user_id || null,
        request_id: body.request_id || crypto.randomUUID(),
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert error log:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to log error", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${body.severity?.toUpperCase() || "ERROR"}] ${body.function_name}: ${body.error_message}`);

    // Send email alert for critical errors
    if (body.severity === "critical") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "SCP Alerts <onboarding@resend.dev>",
              to: ["alerts@SCP.com"], // Configure this
              subject: `🚨 CRITICAL ERROR: ${body.function_name}`,
              html: `
                <h2>Critical Error Alert</h2>
                <p><strong>Function:</strong> ${body.function_name}</p>
                <p><strong>Error Type:</strong> ${body.error_type}</p>
                <p><strong>Message:</strong> ${body.error_message}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                ${body.school_id ? `<p><strong>School ID:</strong> ${body.school_id}</p>` : ""}
                ${body.error_stack ? `<pre>${body.error_stack}</pre>` : ""}
                <hr>
                <p>Request ID: ${errorLog.request_id}</p>
              `,
            }),
          });
          console.log("Critical error alert email sent");
        } catch (emailError) {
          console.error("Failed to send critical error alert email:", emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, log_id: errorLog.id, request_id: errorLog.request_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in log-error function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
