import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkPersistentRateLimit,
  sanitizeErrorMessage,
  createRateLimitResponse,
  getRateLimitIdentifier,
} from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function logError(supabase: any, functionName: string, error: Error, schoolId?: string, userId?: string) {
  try {
    await supabase.from("error_logs").insert({
      function_name: functionName,
      error_type: error.name || "Error",
      error_message: error.message.substring(0, 1000), // Limit error message length
      error_stack: error.stack?.substring(0, 2000), // Limit stack trace length
      severity: "error",
      school_id: schoolId,
      user_id: userId,
      request_id: crypto.randomUUID(),
    });
  } catch (logErr) {
    console.error("Failed to log error to database:", logErr);
  }
}

async function logServiceRoleOperation(
  supabase: any,
  operation: string,
  userId: string,
  schoolId: string,
  metadata: Record<string, unknown>
) {
  try {
    await supabase.from("audit_events").insert({
      event_type: "service_role_operation",
      entity_type: "export",
      entity_id: schoolId,
      user_id: userId,
      metadata: {
        operation,
        function_name: "export-school-data",
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  } catch (err) {
    console.error("Failed to log service role operation:", err);
  }
}

Deno.serve(async (req) => {
  console.log("export-school-data function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let userId: string | null = null;
  let schoolId: string | null = null;

  try {
    // Persistent rate limiting: 5 exports per hour (resource intensive)
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await checkPersistentRateLimit(
      supabase,
      identifier,
      "export-school-data",
      5, // max requests
      3600000 // 1 hour window
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for export: ${identifier}`);
      return createRateLimitResponse(3600, corsHeaders);
    }

    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = user.id;

    // Check user role - only school admins can export
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - no role assigned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedRoles = ["admin", "school", "school_staff"];
    if (!allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden - insufficient permissions for data export" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    schoolId = roleData.school_id;
    if (!schoolId && roleData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "No school associated with your account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log service role operation at start
    await logServiceRoleOperation(supabase, "export_started", userId, schoolId!, {
      role: roleData.role,
    });

    console.log(`Exporting data for school: ${schoolId}, user: ${user.id}, role: ${roleData.role}`);

    // Fetch school info
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (schoolError) {
      await logError(supabase, "export-school-data", schoolError as Error, schoolId!, user.id);
      throw new Error("Failed to fetch school data");
    }

    // Fetch branches
    const { data: branches, error: branchesError } = await supabase
      .from("school_branches")
      .select("*")
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (branchesError) {
      await logError(supabase, "export-school-data", branchesError as Error, schoolId!, user.id);
    }

    // Fetch students (limited fields for security)
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, first_name, last_name, date_of_birth, grade_level, branch_id, created_at, updated_at")
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (studentsError) {
      await logError(supabase, "export-school-data", studentsError as Error, schoolId!, user.id);
    }

    // Fetch teachers (limited fields - use directory view for non-sensitive data)
    const { data: teachers, error: teachersError } = await supabase
      .from("teachers")
      .select("id, first_name, last_name, email, phone, employment_status, hire_date, certification_type, certification_expiry, background_check_date, background_check_expiry, branch_id, created_at, updated_at")
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (teachersError) {
      await logError(supabase, "export-school-data", teachersError as Error, schoolId!, user.id);
    }

    // Fetch student documents metadata (not files)
    const { data: studentDocs, error: studentDocsError } = await supabase
      .from("documents")
      .select("id, student_id, category, file_name, status, expiration_date, created_at, updated_at")
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (studentDocsError) {
      await logError(supabase, "export-school-data", studentDocsError as Error, schoolId!, user.id);
    }

    // Fetch teacher documents metadata
    const { data: teacherDocs, error: teacherDocsError } = await supabase
      .from("teacher_documents")
      .select("id, teacher_id, document_type, file_name, expiration_date, created_at, updated_at")
      .eq("school_id", schoolId)
      .is("deleted_at", null);

    if (teacherDocsError) {
      await logError(supabase, "export-school-data", teacherDocsError as Error, schoolId!, user.id);
    }

    // Fetch compliance requirements
    const { data: complianceReqs, error: complianceError } = await supabase
      .from("compliance_requirements")
      .select("id, title, description, status, frequency, due_date, next_due_date, risk_level, inspection_type_id, created_at, updated_at")
      .eq("school_id", schoolId);

    if (complianceError) {
      await logError(supabase, "export-school-data", complianceError as Error, schoolId!, user.id);
    }

    // Fetch inspection types
    const { data: inspectionTypes, error: inspectionError } = await supabase
      .from("inspection_types")
      .select("id, name, description, category, created_at")
      .eq("school_id", schoolId);

    if (inspectionError) {
      await logError(supabase, "export-school-data", inspectionError as Error, schoolId!, user.id);
    }

    // Fetch required documents config
    const { data: requiredDocs, error: reqDocsError } = await supabase
      .from("required_documents")
      .select("*")
      .eq("school_id", schoolId);

    if (reqDocsError) {
      await logError(supabase, "export-school-data", reqDocsError as Error, schoolId!, user.id);
    }

    // Fetch staff required documents config
    const { data: staffRequiredDocs, error: staffReqDocsError } = await supabase
      .from("staff_required_documents")
      .select("*")
      .eq("school_id", schoolId);

    if (staffReqDocsError) {
      await logError(supabase, "export-school-data", staffReqDocsError as Error, schoolId!, user.id);
    }

    // Fetch parents (limited fields for privacy)
    const { data: parents, error: parentsError } = await supabase
      .from("parents")
      .select("id, email, first_name, last_name, phone, created_at")
      .eq("school_id", schoolId);

    if (parentsError) {
      await logError(supabase, "export-school-data", parentsError as Error, schoolId!, user.id);
    }

    // Fetch student-parent relationships
    const { data: studentParents, error: spError } = await supabase
      .from("student_parents")
      .select("student_id, parent_id, relationship_type, is_primary_contact")
      .eq("school_id", schoolId);

    if (spError) {
      await logError(supabase, "export-school-data", spError as Error, schoolId!, user.id);
    }

    // Compile export data
    const exportData = {
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user.id,
        school_id: schoolId,
        version: "1.0",
      },
      school: school,
      branches: branches || [],
      students: students || [],
      teachers: teachers || [],
      parents: parents || [],
      student_parent_relationships: studentParents || [],
      student_documents: studentDocs || [],
      teacher_documents: teacherDocs || [],
      required_documents_config: requiredDocs || [],
      staff_required_documents_config: staffRequiredDocs || [],
      inspection_types: inspectionTypes || [],
      compliance_requirements: complianceReqs || [],
      statistics: {
        total_students: students?.length || 0,
        total_teachers: teachers?.length || 0,
        total_parents: parents?.length || 0,
        total_student_documents: studentDocs?.length || 0,
        total_teacher_documents: teacherDocs?.length || 0,
        total_compliance_requirements: complianceReqs?.length || 0,
      },
    };

    // Log the export event (service role operation completed)
    await logServiceRoleOperation(supabase, "export_completed", userId!, schoolId!, {
      record_counts: exportData.statistics,
    });

    console.log(`Export completed for school ${schoolId}:`, exportData.statistics);

    return new Response(
      JSON.stringify(exportData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="school_export_${schoolId}_${new Date().toISOString().split("T")[0]}on"`,
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in export-school-data:", err);

    // Log the error with service role context
    if (userId && schoolId) {
      await logError(supabase, "export-school-data", err, schoolId, userId);
    }

    // Sanitize error message for external response
    const safeMessage = sanitizeErrorMessage(err);

    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
