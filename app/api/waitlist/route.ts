import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email, fid, display_name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("waitlist").insert({ email, fid, display_name })

    if (error) {
      // Handle duplicate email
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 })
      }
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to save email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("API error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
