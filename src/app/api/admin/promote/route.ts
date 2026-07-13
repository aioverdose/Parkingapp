import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: users, error: findError } = await supabase
      .from("users")
      .select("id, role")
      .eq("email", email)
      .limit(1);

    if (findError || !users || users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", users[0].id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: { id: users[0].id, email, role: "admin" } });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
