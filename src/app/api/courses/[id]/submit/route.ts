import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/api/auth-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { answers } = await request.json();

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: "answers must be an array" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const questions = course.quiz_questions as Array<{ correct: number }>;
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correct) {
        correct++;
      }
    }
    const percentage = Math.round((correct / questions.length) * 100);
    const passed = percentage >= 80;

    const { data: existing } = await supabase
      .from("user_course_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("user_course_progress")
        .update({
          status: passed ? "passed" : "failed",
          attempts: existing.attempts + 1,
          score: percentage,
          completed_at: passed ? new Date().toISOString() : null,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ progress: updated, passed, score: percentage });
    }

    const { data: newProgress, error: insertError } = await supabase
      .from("user_course_progress")
      .insert({
        user_id: user.id,
        course_id: id,
        status: passed ? "passed" : "failed",
        attempts: 1,
        score: percentage,
        completed_at: passed ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ progress: newProgress, passed, score: percentage });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
