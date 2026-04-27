import { NextResponse } from 'next/server'
import { supabaseAdmin, randomBool } from '@/lib/simulator/utils'

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

// GET /api/cron/night (22:00)
// 야간 마무리 시나리오: 체크아웃 처리 + 직원 퇴근 마무리
export async function GET() {
  const branchId = 1
  const base = getBaseUrl()
  const results: Record<string, unknown> = {}

  const today = new Date().toISOString().split('T')[0]

  // 1. 오늘 checkOutAt이 null인 출석 조회 → 70% 체크아웃 처리
  try {
    const { data: openAttendance, error: fetchError } = await supabaseAdmin
      .from('attendance')
      .select('id, checkInAt, memberId')
      .eq('branchId', branchId)
      .gte('checkInAt', today + 'T00:00:00')
      .is('checkOutAt', null)

    if (fetchError) {
      results.checkout = { ok: false, error: fetchError.message }
    } else if (!openAttendance?.length) {
      results.checkout = { ok: true, processed: 0, message: '미체크아웃 없음' }
    } else {
      const toCheckOut = openAttendance.filter(() => randomBool(0.7))
      let processed = 0

      for (const record of toCheckOut) {
        try {
          const checkInTime = new Date(record.checkInAt)
          // 체크인 후 1-3시간 사이로 체크아웃
          const stayMinutes = Math.floor(Math.random() * 120) + 60
          const checkOutTime = new Date(checkInTime.getTime() + stayMinutes * 60000)

          const { error } = await supabaseAdmin
            .from('attendance')
            .update({ checkOutAt: checkOutTime.toISOString() })
            .eq('id', record.id)

          if (!error) processed++
        } catch (err) {
          void err
        }
      }

      results.checkout = { ok: true, processed, total: openAttendance.length }
    }
  } catch (err) {
    results.checkout = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // 2. 직원 퇴근 마무리
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

  return NextResponse.json({ ok: true, scenario: 'night', timestamp: new Date().toISOString(), results })
}
