import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const logs = await prisma.systemLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 100, // Limit to recent 100 logs
    })
    
    // Map to match the frontend interface
    const formattedLogs = logs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString().replace('T', ' ').substring(0, 19)
    }))

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error("Failed to fetch logs from TiDB", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

// Optional endpoint to create logs dynamically
export async function POST(req: Request) {
  try {
    const { level, source, message } = await req.json()
    const log = await prisma.systemLog.create({
      data: { level, source, message }
    })
    return NextResponse.json(log)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 })
  }
}
