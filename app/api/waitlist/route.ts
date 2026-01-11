import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, fid, display_name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    await sql`
      INSERT INTO waitlist (email, fid, display_name)
      VALUES (${email}, ${fid || null}, ${display_name || null})
    `

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("API error:", err)

    // Handle duplicate email (PostgreSQL unique violation)
    if (err.code === "23505") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
