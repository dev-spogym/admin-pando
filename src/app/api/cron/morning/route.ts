import { NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomPick, randomKoreanName, randomPhone } from '@/lib/simulator/utils'

const LEAD_SOURCES = ['온라인', '전화', '방문', '인스타그램', '네이버'] as const
const LEAD_STATUSES = ['신규', '상담예약', '상담완료'] as const

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// GET /api/cron/morning (07:00)
// 아침 시나리오: 직원 출근 + 출석 러시 + 신규 리드 등록
export async function GET() {
  const branchId = 1
  const base = getBaseUrl()
  const results: Record<string, unknown> = {}

  // 1. 직원 출근 시뮬레이션
  try {
    const res = await fetch(`${base}/api/simulate/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId }),
    })
    results.staff = await res.json()
  } catch (err) {
    results.staff = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 2. 출석 러시 2번
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(`${base}/api/simulate/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId }),
      })
      const key = `attendance_${i + 1}`
      results[key] = await res.json()
    } catch (err) {
      results[`attendance_${i + 1}`] = { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  // 3. 신규 리드 1-2건 등록
  const leadCount = randomInt(1, 2)
  const leadsInserted: string[] = []

  for (let i = 0; i < leadCount; i++) {
    try {
      const name = randomKoreanName()
      const phone = randomPhone()
      const { error } = await supabaseAdmin.from('leads').insert({
        branchId,
        name,
        phone,
        source: randomPick(LEAD_SOURCES),
        status: randomPick(LEAD_STATUSES),
        memo: '아침 크론 자동 생성 리드',
        inquiryDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      if (!error) leadsInserted.push(name)
    } catch (err) {
      void err
    }
  }

  results.leads = { inserted: leadsInserted.length, names: leadsInserted }

  return NextResponse.json({ ok: true, scenario: 'morning', timestamp: new Date().toISOString(), results })
}
