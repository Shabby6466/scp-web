import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  checkPersistentRateLimit,
  sanitizeErrorMessage,
  createRateLimitResponse,
  getRateLimitIdentifier,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allowed auth event types (whitelist to prevent abuse)
const ALLOWED_EVENT_TYPES = [
  'sign_up',
  'sign_in',
  'sign_out',
  'password_reset_request',
  'password_reset_complete',
  'password_change',
  'session_refresh',
  'failed_login'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with service role for rate limit checks
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Persistent rate limiting: 20 requests per minute per identifier
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await checkPersistentRateLimit(
      supabase,
      identifier,
      "log-auth-event",
      20, // max requests
      60000 // 1 minute window
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for identifier ${identifier}`);
      return createRateLimitResponse(60, corsHeaders);
    }

    const { event_type, email, user_id, metadata } = await reqon();

    // Strict validation of event_type (whitelist only)
    if (!event_type || !ALLOWED_EVENT_TYPES.includes(event_type)) {
      console.log(`Rejected invalid event_type: ${event_type}`);
      return new Response(
        JSON.stringify({ error: "Invalid event_type" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format if provided
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || email.length > 255) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate user_id format if provided (should be UUID)
    if (user_id && typeof user_id === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid user_id format" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Sanitize metadata - only allow specific safe keys with length limits
    const safeMetadata: Record<string, unknown> = {};
    if (metadata && typeof metadata === 'object') {
      const allowedMetadataKeys = ['browser', 'os', 'device', 'timestamp', 'error_message'];
      for (const key of allowedMetadataKeys) {
        if (key in metadata) {
          const value = metadata[key];
          // Only allow string/number/boolean values with length limits
          if (typeof value === 'string') {
            safeMetadata[key] = value.substring(0, 200); // Limit string length
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            safeMetadata[key] = value;
          }
        }
      }
    }

    // Extract IP and user agent with sanitization
    const rawIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ip_address = rawIp.split(",")[0].trim().substring(0, 45); // IPv6 max length
    const user_agent = (req.headers.get("user-agent") || "unknown").substring(0, 500);

    console.log(`Logging auth event: ${event_type} for ${email ? "[email]" : user_id || 'unknown'}`);

    const { error: insertError } = await supabase
      .from("auth_audit_logs")
      .insert({
        user_id: user_id || null,
        email: email || null,
        event_type,
        ip_address,
        user_agent,
        metadata: safeMetadata,
      });

    if (insertError) {
      console.error("Error inserting audit log:", insertError);
      throw insertError;
    }

    console.log(`Successfully logged ${event_type} event`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in log-auth-event function:", error);
    // Sanitize error message for external response
    const safeMessage = sanitizeErrorMessage(error instanceof Error ? error : String(error));
    return new Response(
      JSON.stringify({ error: safeMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
