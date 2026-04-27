import { NextResponse } from 'next/server'

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// GET /api/cron/lunch (12:00)
// 점심 시나리오: 출석 소량 + 수업 예약 + 매출 1-2건
export async function GET() {
  const branchId = 1
  const base = getBaseUrl()
  const results: Record<string, unknown> = {}

  // 1. 출석 소량 (1-3명) - attendance는 랜덤 3-8명이므로 1회 호출
  try {
    const res = await fetch(`${base}/api/simulate/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId }),
    })
    results.attendance = await res.json()
  } catch (err) {
    results.attendance = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 2. 수업 예약 추가
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

  // 3. 매출 1-2건
  try {
    const res = await fetch(`${base}/api/simulate/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId }),
    })
    results.sales = await res.json()
  } catch (err) {
    results.sales = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  return NextResponse.json({ ok: true, scenario: 'lunch', timestamp: new Date().toISOString(), results })
}
