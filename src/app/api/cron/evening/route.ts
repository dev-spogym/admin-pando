import { NextResponse } from 'next/server'

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// GET /api/cron/evening (17:00)
// 저녁 피크 시나리오: 출석 러시 + 그룹수업 예약 + 신규 회원 + 매출
export async function GET() {
  const branchId = 1
  const base = getBaseUrl()
  const results: Record<string, unknown> = {}

  // 1. 저녁 피크 출석 (5-10명) → attendance API 2-3번 호출
  const attendanceRounds = Math.floor(Math.random() * 2) + 2 // 2 or 3
  for (let i = 0; i < attendanceRounds; i++) {
    try {
      const res = await fetch(`${base}/api/simulate/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId }),
      })
      results[`attendance_${i + 1}`] = await res.json()
    } catch (err) {
      results[`attendance_${i + 1}`] = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // 2. 그룹수업 예약 러시
  try {
    const res = await fetch(`${base}/api/simulate/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId }),
    })
    results.classes = await res.json()
  } catch (err) {
    results.classes = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 3. 신규 회원 등록 (1-2명)
  try {
    const res = await fetch(`${base}/api/simulate/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId }),
    })
    results.members = await res.json()
  } catch (err) {
    results.members = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 4. 매출 2-3건
  const salesRounds = Math.floor(Math.random() * 2) + 2 // 2 or 3
  for (let i = 0; i < salesRounds; i++) {
    try {
      const res = await fetch(`${base}/api/simulate/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId }),
      })
      results[`sales_${i + 1}`] = await res.json()
    } catch (err) {
      results[`sales_${i + 1}`] = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  return NextResponse.json({ ok: true, scenario: 'evening', timestamp: new Date().toISOString(), results })
}
