import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

interface StudentData {
  firstName: string;
  lastName: string;
  dob?: string;
  gradeLevel?: string;
  classroom?: string;
  branchName?: string;
  studentId?: string;
}

interface ParentData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface ImportRow {
  student: StudentData | null;
  parents: ParentData[];
}

interface ImportRequest {
  schoolId: string;
  branchId?: string;
  fileName: string;
  importType: "students" | "parents" | "both";
  duplicateHandling: "skip" | "update";
  rows: ImportRow[];
}

// Input validation limits
const MAX_ROWS = 1000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_PHONE_LENGTH = 20;

function validateStudentData(student: StudentData): string | null {
  if (!student.firstName || student.firstName.length > MAX_NAME_LENGTH) {
    return "Invalid first name";
  }
  if (!student.lastName || student.lastName.length > MAX_NAME_LENGTH) {
    return "Invalid last name";
  }
  if (student.gradeLevel && student.gradeLevel.length > 50) {
    return "Grade level too long";
  }
  return null;
}

function validateParentData(parent: ParentData): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!parent.email || !emailRegex.test(parent.email) || parent.email.length > MAX_EMAIL_LENGTH) {
    return "Invalid email";
  }
  if (parent.firstName && parent.firstName.length > MAX_NAME_LENGTH) {
    return "First name too long";
  }
  if (parent.lastName && parent.lastName.length > MAX_NAME_LENGTH) {
    return "Last name too long";
  }
  if (parent.phone && parent.phone.length > MAX_PHONE_LENGTH) {
    return "Phone number too long";
  }
  return null;
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
      entity_type: "import",
      entity_id: schoolId,
      user_id: userId,
      metadata: {
        operation,
        function_name: "import-roster",
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  } catch (err) {
    console.error("Failed to log service role operation:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let userId: string | null = null;
  let schoolId: string | null = null;

  try {
    // Persistent rate limiting: 10 imports per hour
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await checkPersistentRateLimit(
      supabase,
      identifier,
      "import-roster",
      10, // max requests
      3600000 // 1 hour window
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for import: ${identifier}`);
      return createRateLimitResponse(3600, corsHeaders);
    }

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = user.id;

    // Check user has permission
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, school_id")
      .eq("user_id", user.id)
      .single();

    if (!userRole || !["admin", "school", "school_staff", "director"].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ImportRequest = await req.json();
    const { branchId, fileName, importType, duplicateHandling, rows } = body;
    schoolId = body.schoolId;

    // Verify school access
    if (userRole.role !== "admin" && userRole.school_id !== schoolId) {
      return new Response(
        JSON.stringify({ error: "Access denied to this school" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format for schoolId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(schoolId)) {
      return new Response(
        JSON.stringify({ error: "Invalid school ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate row count
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data to import" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_ROWS} rows allowed per import` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log service role operation at start
    await logServiceRoleOperation(supabase, "import_started", userId, schoolId, {
      role: userRole.role,
      row_count: rows.length,
      import_type: importType,
      file_name: fileName?.substring(0, 100),
    });

    console.log(`Starting import: ${rows.length} rows, type: ${importType}`);

    // Create import job
    const { data: importJob, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        school_id: schoolId,
        branch_id: branchId,
        created_by: user.id,
        file_name: fileName?.substring(0, 255),
        status: "processing",
        total_rows: rows.length,
        import_type: importType,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create import job:", jobError);
      throw new Error("Failed to create import job");
    }

    let createdStudents = 0;
    let updatedStudents = 0;
    let createdParents = 0;
    let matchedParents = 0;
    let linkedRelationships = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Account for header row

      try {
        let studentId: string | null = null;
        const parentIds: string[] = [];

        // Process student
        if (row.student && (importType === "students" || importType === "both")) {
          // Validate student data
          const studentError = validateStudentData(row.student);
          if (studentError) {
            errors.push({ row: rowNum, field: "Student", message: studentError });
            continue;
          }

          const { firstName, lastName, dob, gradeLevel } = row.student;

          // Check for existing student
          const { data: existingStudent } = await supabase
            .from("students")
            .select("id")
            .eq("school_id", schoolId)
            .eq("first_name", firstName.trim())
            .eq("last_name", lastName.trim())
            .is("deleted_at", null)
            .maybeSingle();

          if (existingStudent) {
            if (duplicateHandling === "update") {
              const { error: updateError } = await supabase
                .from("students")
                .update({
                  date_of_birth: dob || null,
                  grade_level: gradeLevel || null,
                  branch_id: branchId || null,
                })
                .eq("id", existingStudent.id);

              if (!updateError) {
                updatedStudents++;
                studentId = existingStudent.id;
              }
            } else {
              studentId = existingStudent.id; // Use existing for linking
            }
          } else {
            // Create new student - need a parent_id placeholder
            const { data: newStudent, error: studentError } = await supabase
              .from("students")
              .insert({
                school_id: schoolId,
                branch_id: branchId || null,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                date_of_birth: dob || null,
                grade_level: gradeLevel || null,
                parent_id: user.id, // Placeholder - will be updated when parent links
              })
              .select()
              .single();

            if (studentError) {
              errors.push({ row: rowNum, field: "Student", message: "Failed to create student" });
            } else {
              createdStudents++;
              studentId = newStudent.id;
            }
          }
        }

        // Process parents
        if (row.parents.length > 0 && (importType === "parents" || importType === "both")) {
          for (const parent of row.parents) {
            // Validate parent data
            const parentError = validateParentData(parent);
            if (parentError) {
              errors.push({ row: rowNum, field: "Parent", message: parentError });
              continue;
            }

            const email = parent.email.toLowerCase().trim();

            // Check for existing parent
            const { data: existingParent } = await supabase
              .from("parents")
              .select("id")
              .eq("school_id", schoolId)
              .eq("email", email)
              .maybeSingle();

            let parentId: string;

            if (existingParent) {
              matchedParents++;
              parentId = existingParent.id;

              if (duplicateHandling === "update") {
                await supabase
                  .from("parents")
                  .update({
                    first_name: parent.firstName?.trim() || null,
                    last_name: parent.lastName?.trim() || null,
                    phone: parent.phone?.trim() || null,
                  })
                  .eq("id", existingParent.id);
              }
            } else {
              // Create new parent
              const { data: newParent, error: parentInsertError } = await supabase
                .from("parents")
                .insert({
                  school_id: schoolId,
                  email,
                  first_name: parent.firstName?.trim() || null,
                  last_name: parent.lastName?.trim() || null,
                  phone: parent.phone?.trim() || null,
                })
                .select()
                .single();

              if (parentInsertError) {
                errors.push({ row: rowNum, field: "Parent", message: "Failed to create parent" });
                continue;
              }
              createdParents++;
              parentId = newParent.id;
            }

            parentIds.push(parentId);
          }
        }

        // Link student to parents
        if (studentId && parentIds.length > 0) {
          for (let j = 0; j < parentIds.length; j++) {
            const { error: linkError } = await supabase
              .from("student_parents")
              .upsert({
                school_id: schoolId,
                student_id: studentId,
                parent_id: parentIds[j],
                is_primary_contact: j === 0,
              }, { onConflict: "student_id,parent_id" });

            if (!linkError) {
              linkedRelationships++;
            }
          }
        }
      } catch (rowError) {
        console.error(`Error processing row ${rowNum}:`, rowError);
        errors.push({ row: rowNum, field: "Row", message: "Processing failed" });
      }
    }

    // Update import job
    await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        created_students: createdStudents,
        updated_students: updatedStudents,
        created_parents: createdParents,
        matched_parents: matchedParents,
        linked_relationships: linkedRelationships,
        error_count: errors.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importJob.id);

    // Log service role operation completion
    await logServiceRoleOperation(supabase, "import_completed", userId, schoolId, {
      import_job_id: importJob.id,
      created_students: createdStudents,
      updated_students: updatedStudents,
      created_parents: createdParents,
      matched_parents: matchedParents,
      linked_relationships: linkedRelationships,
      error_count: errors.length,
    });

    console.log(`Import complete: ${createdStudents} students, ${createdParents} parents, ${linkedRelationships} links`);

    return new Response(
      JSON.stringify({
        success: true,
        importJobId: importJob.id,
        createdStudents,
        updatedStudents,
        createdParents,
        matchedParents,
        linkedRelationships,
        errorCount: errors.length,
        errors: errors.slice(0, 50), // Limit error details returned
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Import error:", error);

    // Log failed operation
    if (userId && schoolId) {
      await logServiceRoleOperation(supabase, "import_failed", userId, schoolId, {
        error: error instanceof Error ? error.message.substring(0, 200) : "Unknown error",
      });
    }

    // Sanitize error message for external response
    const safeMessage = sanitizeErrorMessage(error instanceof Error ? error : String(error));
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
