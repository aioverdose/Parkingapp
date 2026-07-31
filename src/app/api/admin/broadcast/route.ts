import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin" && profile?.role !== "moderator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, message, type, target, userIds } = await request.json();
    if (!title || !message) {
      return NextResponse.json({ error: "Title and message required" }, { status: 400 });
    }

    let targetIds: string[];
    if (target === "ids" && userIds?.length) {
      targetIds = userIds;
    } else {
      const { data: users } = await supabase.from("users").select("id");
      if (!users) {
        return NextResponse.json({ error: "No users found" }, { status: 404 });
      }
      targetIds = users.map((u: any) => u.id);
    }

    let sent = 0;
    let errors = 0;
    const batchSize = 100;
    for (let i = 0; i < targetIds.length; i += batchSize) {
      const batch = targetIds.slice(i, i + batchSize);
      const rows = batch.map((uid: string) => ({
        user_id: uid,
        title,
        message,
        type: type || "broadcast",
      }));
      const { error: insertError } = await supabase.from("notifications").insert(rows);
      if (insertError) {
        errors += batch.length;
      } else {
        sent += batch.length;
      }
    }

    return NextResponse.json({ sent, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
