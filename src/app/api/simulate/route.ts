import { NextRequest, NextResponse } from 'next/server'

// GET /api/simulate - 상태 확인
export async function GET() {
  return NextResponse.json({ ok: true, message: 'FitGenie Simulator Ready' })
}

// POST /api/simulate
// body: { type: 'all' | 'attendance' | 'members' | 'sales' | 'classes' | 'facilities' | 'staff', branchId?: number }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type = 'all', branchId = 1 } = body as {
    type?: 'all' | 'attendance' | 'members' | 'sales' | 'classes' | 'facilities' | 'staff'
    branchId?: number
  }

  const baseUrl = req.nextUrl.origin
  const results: Record<string, unknown> = {}

  const endpoints =
    type === 'all'
      ? ['attendance', 'members', 'sales', 'classes', 'facilities', 'staff']
      : [type]

  await Promise.all(
    endpoints.map(async (ep) => {
      try {
        const res = await fetch(`${baseUrl}/api/simulate/${ep}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branchId }),
        })
        results[ep] = await res.json()
      } catch (err) {
        results[ep] = {
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      }
    }),
  )

  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() })
}
