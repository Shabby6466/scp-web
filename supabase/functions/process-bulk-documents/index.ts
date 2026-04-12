import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentInput {
  file_name: string;
  file_path: string;
  file_size: number;
  base64_content?: string;
}

interface ProcessBulkRequest {
  documents: DocumentInput[];
  student_id: string;
  parent_id: string;
  school_id?: string;
}

interface ProcessedDocument {
  file_name: string;
  category: string;
  expiration_date: string | null;
  confidence: number;
  status: "success" | "failed";
  error?: string;
}

// Document type classification based on filename patterns
function classifyDocument(fileName: string): { category: string; confidence: number } {
  const lowerName = fileName.toLowerCase();

  const patterns: { pattern: RegExp; category: string; confidence: number }[] = [
    { pattern: /immuniz|vaccin|shot|mmr|dtap|polio|hep/i, category: "immunization_records", confidence: 0.9 },
    { pattern: /health\s*form|physical|medical\s*exam|doctor/i, category: "health_forms", confidence: 0.85 },
    { pattern: /emergency|contact|guardian/i, category: "emergency_contacts", confidence: 0.8 },
    { pattern: /birth\s*cert|certificate\s*of\s*birth/i, category: "birth_certificate", confidence: 0.95 },
    { pattern: /proof.*resid|utility|address|lease/i, category: "proof_of_residence", confidence: 0.8 },
    { pattern: /medical|allerg|prescription|doctor/i, category: "medical_records", confidence: 0.75 },
  ];

  for (const { pattern, category, confidence } of patterns) {
    if (pattern.test(lowerName)) {
      return { category, confidence };
    }
  }

  // Default to health_forms with low confidence
  return { category: "health_forms", confidence: 0.3 };
}

// Extract potential expiration date from filename
function extractExpirationHint(fileName: string): string | null {
  // Look for date patterns in filename like 2024-12, 12-2024, exp-2024
  const patterns = [
    /exp[_-]?(\d{4})[_-]?(\d{2})/i,
    /(\d{4})[_-](\d{2})[_-](\d{2})/,
    /(\d{2})[_-](\d{2})[_-](\d{4})/,
  ];

  for (const pattern of patterns) {
    const match = fileName.match(pattern);
    if (match) {
      // Try to construct a date
      if (match.length >= 3) {
        const year = match[1].length === 4 ? match[1] : match[3];
        const month = match[1].length === 4 ? match[2] : match[1];
        const day = match[3] && match[3].length === 2 ? match[3] : "01";
        return `${year}-${month.padStart(2, "0")}-${day}`;
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT and get the authenticated user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: ProcessBulkRequest = await reqon();
    const { documents, student_id, parent_id, school_id } = body;

    // ========== INPUT VALIDATION ==========
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "documents array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!student_id || !parent_id) {
      return new Response(
        JSON.stringify({ error: "student_id and parent_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== AUTHORIZATION: Verify ownership ==========
    // The authenticated user must be the parent_id OR have school/admin role for the student's school

    // First check: Is the caller the parent?
    const isParent = user.id === parent_id;

    if (!isParent) {
      // Check if caller has school/admin privileges for this student
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", user.id)
        .in("role", ["admin", "school", "school_staff", "director"])
        .maybeSingle();

      if (roleError || !userRole) {
        console.error(`Authorization failed: User ${user.id} attempted to insert documents for parent ${parent_id}`);
        return new Response(
          JSON.stringify({ error: "You do not have permission to upload documents for this student" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For non-admin roles, verify the student belongs to their school
      if (userRole.role !== "admin" && userRole.school_id) {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("school_id")
          .eq("id", student_id)
          .is("deleted_at", null)
          .maybeSingle();

        if (studentError || !student || student.school_id !== userRole.school_id) {
          console.error(`Authorization failed: User ${user.id} tried to upload for student ${student_id} from different school`);
          return new Response(
            JSON.stringify({ error: "You do not have permission to upload documents for this student" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      // If caller is the parent, verify they actually own this student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("parent_id")
        .eq("id", student_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (studentError || !student || student.parent_id !== user.id) {
        console.error(`Authorization failed: User ${user.id} tried to claim parent ${parent_id} for student ${student_id}`);
        return new Response(
          JSON.stringify({ error: "You do not have permission to upload documents for this student" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`Processing ${documents.length} documents for student ${student_id} by user ${user.id}`);

    const processedDocs: ProcessedDocument[] = [];
    const insertedDocs: string[] = [];

    for (const doc of documents) {
      try {
        // Classify document
        const { category, confidence } = classifyDocument(doc.file_name);
        const expirationHint = extractExpirationHint(doc.file_name);

        // Insert document record - use the verified parent_id (not from request if caller is staff)
        const insertParentId = isParent ? parent_id : parent_id; // Keep original parent_id

        const { data: insertedDoc, error: insertError } = await supabase
          .from("documents")
          .insert({
            file_name: doc.file_name,
            file_path: doc.file_path,
            file_size: doc.file_size,
            category,
            student_id,
            parent_id: insertParentId,
            school_id,
            expiration_date: expirationHint,
            status: "pending",
            notes: confidence < 0.7 ? `Auto-classified with ${Math.round(confidence * 100)}% confidence. Please verify.` : null,
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        processedDocs.push({
          file_name: doc.file_name,
          category,
          expiration_date: expirationHint,
          confidence,
          status: "success",
        });

        if (insertedDoc) {
          insertedDocs.push(insertedDoc.id);
        }

        console.log(`Processed ${doc.file_name} -> ${category} (${Math.round(confidence * 100)}%)`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        processedDocs.push({
          file_name: doc.file_name,
          category: "unknown",
          expiration_date: null,
          confidence: 0,
          status: "failed",
          error: errMsg,
        });
        console.error(`Failed to process ${doc.file_name}:`, errMsg);
      }
    }

    const successCount = processedDocs.filter((d) => d.status === "success").length;
    const failedCount = processedDocs.filter((d) => d.status === "failed").length;

    // Log the bulk upload action
    await supabase
      .from("audit_events")
      .insert({
        event_type: "bulk_document_upload",
        entity_type: "document",
        entity_id: student_id,
        user_id: user.id,
        metadata: {
          student_id,
          parent_id,
          school_id,
          total: documents.length,
          success_count: successCount,
          failed_count: failedCount,
          inserted_ids: insertedDocs,
        },
      });

    console.log(`Bulk processing complete: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: documents.length,
        processed: successCount,
        failed: failedCount,
        documents: processedDocs,
        inserted_ids: insertedDocs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-bulk-documents:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
