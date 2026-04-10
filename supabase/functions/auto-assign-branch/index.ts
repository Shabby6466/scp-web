import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignBranchRequest {
  student_id: string;
  school_id: string;
  date_of_birth: string;
}

interface Branch {
  id: string;
  branch_name: string;
  min_age: number | null;
  max_age: number | null;
  total_capacity: number | null;
  is_active: boolean;
  is_primary: boolean;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
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

    const body: AssignBranchRequest = await req.json();
    const { student_id, school_id, date_of_birth } = body;

    if (!student_id || !school_id || !date_of_birth) {
      return new Response(
        JSON.stringify({ error: "student_id, school_id, and date_of_birth are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== AUTHORIZATION ==========
    // Verify the caller has permission for this student/school
    
    // First, get the student to check ownership
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("parent_id, school_id")
      .eq("id", student_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (studentError || !student) {
      console.error("Student not found:", studentError);
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is the parent
    const isParent = user.id === student.parent_id;

    if (!isParent) {
      // Check if caller has school/admin privileges
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role, school_id")
        .eq("user_id", user.id)
        .in("role", ["admin", "school", "school_staff", "director"])
        .maybeSingle();

      if (roleError || !userRole) {
        console.error(`Authorization failed: User ${user.id} tried to assign branch for student ${student_id}`);
        return new Response(
          JSON.stringify({ error: "You do not have permission to modify this student" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For non-admin roles, verify the student belongs to their school
      if (userRole.role !== "admin" && userRole.school_id !== school_id) {
        console.error(`Authorization failed: User ${user.id} from school ${userRole.school_id} tried to modify student in school ${school_id}`);
        return new Response(
          JSON.stringify({ error: "You do not have permission to modify this student" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const studentAge = calculateAge(date_of_birth);
    console.log(`Assigning branch for student ${student_id}, age ${studentAge}, by user ${user.id}`);

    // Fetch all active branches for the school
    const { data: branches, error: branchError } = await supabase
      .from("school_branches")
      .select("*")
      .eq("school_id", school_id)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (branchError) {
      throw new Error(`Failed to fetch branches: ${branchError.message}`);
    }

    if (!branches || branches.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active branches found for this school", assigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find best matching branch based on age range
    let bestBranch: Branch | null = null;
    let primaryBranch: Branch | null = null;

    for (const branch of branches as Branch[]) {
      // Track primary branch as fallback
      if (branch.is_primary) {
        primaryBranch = branch;
      }

      // Check age fit
      const minAge = branch.min_age ?? 0;
      const maxAge = branch.max_age ?? 18;

      if (studentAge >= minAge && studentAge <= maxAge) {
        // Check capacity if specified
        if (branch.total_capacity) {
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("branch_id", branch.id)
            .is("deleted_at", null);

          if (count !== null && count >= branch.total_capacity) {
            console.log(`Branch ${branch.branch_name} is at capacity (${count}/${branch.total_capacity})`);
            continue;
          }
        }

        bestBranch = branch;
        break;
      }
    }

    // Use primary branch as fallback if no age-appropriate branch found
    const assignedBranch = bestBranch || primaryBranch;

    if (!assignedBranch) {
      return new Response(
        JSON.stringify({ error: "No suitable branch found", assigned: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update student with assigned branch
    const { error: updateError } = await supabase
      .from("students")
      .update({ branch_id: assignedBranch.id })
      .eq("id", student_id);

    if (updateError) {
      throw new Error(`Failed to update student: ${updateError.message}`);
    }

    console.log(`Student ${student_id} assigned to branch ${assignedBranch.branch_name} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        assigned: true,
        branch_id: assignedBranch.id,
        branch_name: assignedBranch.branch_name,
        reason: bestBranch ? "age_match" : "primary_fallback",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in auto-assign-branch:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
