import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, fid, display_name, plan } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const sql = getDb()

    await sql`
      INSERT INTO signup (id, email, fid, display_name, plan, created_at)
      VALUES (gen_random_uuid(), ${email}, ${fid || null}, ${display_name || null}, ${plan || null}, NOW())
    `

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("API error:", err)

    if (err.code === "23505") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    if (err.message?.includes("DATABASE_URL")) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
