import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, randomInt, randomPick, randomBool } from '@/lib/simulator/utils'

const PRODUCTS = [
  { name: '헬스 1개월권', price: 80000, type: '이용권' },
  { name: '헬스 3개월권', price: 200000, type: '이용권' },
  { name: '헬스 6개월권', price: 350000, type: '이용권' },
  { name: 'PT 10회', price: 500000, type: 'PT' },
  { name: 'PT 20회', price: 900000, type: 'PT' },
  { name: 'PT 30회', price: 1200000, type: 'PT' },
  { name: 'GX 월정액', price: 60000, type: 'GX' },
] as const

const PAYMENT_METHODS = [
  'CARD', 'CARD', 'CARD', 'CARD', 'CARD', 'CARD', 'CARD', // 70%
  'CASH', 'CASH',                                           // 20%
  'TRANSFER',                                               // 10%
] as const

const SALE_CATEGORIES = ['신규', '재등록'] as const

function getDurationMonths(productName: string): number | null {
  if (productName.includes('1개월')) return 1
  if (productName.includes('3개월')) return 3
  if (productName.includes('6개월')) return 6
  if (productName === 'GX 월정액') return 1
  return null
}

// POST /api/simulate/sales
// 1-3건 매출 발생
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json()) as { branchId?: number }

  // 1. 활성 회원 조회
  const { data: members, error: membersError } = await supabaseAdmin
    .from('members')
    .select('id, name')
    .eq('branchId', branchId)
    .eq('status', 'ACTIVE')
    .limit(100)

  if (membersError) {
    return NextResponse.json({ ok: false, inserted: 0, details: [`회원 조회 실패: ${membersError.message}`] })
  }

  if (!members?.length) {
    return NextResponse.json({ ok: false, inserted: 0, details: ['활성 회원 없음'] })
  }

  // 2. 실제 staff 조회
  const { data: staffList } = await supabaseAdmin
    .from('staff')
    .select('id, name')
    .eq('branchId', branchId)
    .limit(20)

  const count = randomInt(1, 3)
  const details: string[] = []
  let inserted = 0

  for (let i = 0; i < count; i++) {
    try {
      const member = randomPick(members as { id: number; name: string }[])
      const product = randomPick(PRODUCTS)
      const paymentMethod = randomPick(PAYMENT_METHODS)
      const isCompleted = randomBool(0.9)
      const status = isCompleted ? 'COMPLETED' : 'UNPAID'
      const saleCategory = randomPick(SALE_CATEGORIES)

      // 할인 (20% 확률로 소폭 할인)
      const hasDiscount = randomBool(0.2)
      const discountPrice = hasDiscount ? randomInt(1, 5) * 10000 : 0
      const salePrice = product.price - discountPrice
      const amount = salePrice

      // staff 배정
      let staffId: number | null = null
      let staffName: string | null = null
      if (staffList?.length) {
        const staff = randomPick(staffList as { id: number; name: string }[])
        staffId = staff.id
        staffName = staff.name
      }

      const { error } = await supabaseAdmin.from('sales').insert({
        memberId: member.id,
        memberName: member.name,
        productName: product.name,
        saleDate: new Date().toISOString().split('T')[0],
        type: product.type,
        round: 1,
        quantity: 1,
        originalPrice: product.price,
        salePrice,
        discountPrice,
        amount,
        paymentMethod,
        status,
        unpaid: status === 'UNPAID' ? amount : 0,
        staffId,
        staffName,
        branchId,
        saleCategory,
        durationMonths: getDurationMonths(product.name),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      if (error) {
        details.push(`[FAIL] ${member.name} - ${product.name}: ${error.message}`)
        continue
      }

      details.push(`[OK] 매출 등록: ${member.name} / ${product.name} / ${amount.toLocaleString()}원 / ${paymentMethod} / ${status}`)
      inserted++
    } catch (err) {
      details.push(`[FAIL] 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ ok: inserted > 0, inserted, details })
}
