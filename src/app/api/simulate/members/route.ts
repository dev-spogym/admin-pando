import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomPick, randomBool, randomKoreanName, randomPhone } from '@/lib/simulator/utils'

const MEMBERSHIP_TYPES = ['헬스', 'PT', 'GX', '헬스+PT'] as const
const GENDERS = ['M', 'F'] as const
const REFERRAL_SOURCES = ['지인 소개', '온라인', '현수막', '인스타그램', '네이버', '전단지'] as const
const LEAD_SOURCES = ['온라인', '전화', '방문', '인스타그램', '네이버'] as const

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// POST /api/simulate/members
// 신규 회원 1-3명 등록
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json()) as { branchId?: number }

  const count = randomInt(1, 3)
  const details: string[] = []
  let inserted = 0

  for (let i = 0; i < count; i++) {
    try {
      const name = randomKoreanName()
      const phone = randomPhone()
      const gender = randomPick(GENDERS)
      const membershipType = randomPick(MEMBERSHIP_TYPES)
      const membershipStart = new Date().toISOString().split('T')[0]
      const durationMonths = randomInt(1, 12)
      const membershipExpiry = addMonths(new Date(), durationMonths).toISOString().split('T')[0]

      // 생년월일: 1970~2005년 랜덤
      const birthYear = randomInt(1970, 2005)
      const birthMonth = String(randomInt(1, 12)).padStart(2, '0')
      const birthDay = String(randomInt(1, 28)).padStart(2, '0')
      const birthDate = `${birthYear}-${birthMonth}-${birthDay}`

      const { error } = await supabaseAdmin.from('members').insert({
        name,
        phone,
        gender,
        birthDate,
        branchId,
        status: 'ACTIVE',
        membershipType,
        membershipStart,
        membershipExpiry,
        referralSource: randomPick(REFERRAL_SOURCES),
        memberType: 'individual',
        isFavorite: false,
        lastVisitAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      if (error) {
        details.push(`[FAIL] ${name}: ${error.message}`)
        continue
      }

      details.push(`[OK] 회원 등록: ${name} (${membershipType}, ${durationMonths}개월)`)
      inserted++

      // 30% 확률로 leads에도 등록 (상담 후 전환 시뮬레이션)
      if (randomBool(0.3)) {
        const { error: leadError } = await supabaseAdmin.from('leads').insert({
          branchId,
          name,
          phone,
          source: randomPick(LEAD_SOURCES),
          status: '전환',
          memo: `시뮬레이터 자동 전환 (${membershipType})`,
          inquiryDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        if (!leadError) {
          details.push(`[OK] 리드 전환 등록: ${name}`)
        }
      }
    } catch (err) {
      details.push(`[FAIL] 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: inserted > 0, inserted, details })
}
