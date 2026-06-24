import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const users = await prisma.adminUser.findMany({
      orderBy: { joined: "desc" }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error("Failed to fetch users from TiDB", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
