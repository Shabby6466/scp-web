/**
 * Persistent rate limiting using database
 * This survives edge function cold starts and scales across instances
 */

interface RateLimitResult {
  allowed: boolean;
  current_count: number;
  max_requests: number;
  remaining: number;
}

export async function checkPersistentRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterMs?: number }> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow request if rate limit check fails
      return { allowed: true, remaining: maxRequests };
    }

    const result = data as RateLimitResult;
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      retryAfterMs: result.allowed ? undefined : windowMs,
    };
  } catch (err) {
    console.error("Rate limit error:", err);
    // Fail open
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Sanitize error messages for external responses
 * Prevents leaking internal details
 */
export function sanitizeErrorMessage(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message;
  
  const errorMappings: Record<string, string> = {
    "duplicate key": "Record already exists",
    "foreign key": "Referenced record not found",
    "violates row-level security": "Access denied",
    "JWT": "Authentication error",
    "token": "Authentication error",
    "SUPABASE_SERVICE_ROLE_KEY": "Configuration error",
    "permission denied": "Access denied",
    "unique constraint": "Record already exists",
    "null value in column": "Required field missing",
  };

  for (const [pattern, safeMessage] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return safeMessage;
    }
  }

  // For unknown errors, return generic message in production
  return "Operation failed. Please try again or contact support.";
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(
  retryAfterSeconds: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.", 
      retryAfter: retryAfterSeconds 
    }),
    {
      status: 429,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Extract identifier for rate limiting from request
 */
export function getRateLimitIdentifier(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    // Use a hash of the auth header (don't expose the token)
    return `auth:${simpleHash(authHeader)}`;
  }
  
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }
  
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }
  
  return "unknown";
}

/**
 * Simple hash for identifiers (not cryptographic, just for rate limiting)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
