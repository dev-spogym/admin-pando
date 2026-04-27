import { createClient } from '@supabase/supabase-js'

const SURNAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
  '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
  '홍', '고', '문', '양', '손', '배', '백', '허', '유', '남',
]

const FIRSTNAMES = [
  '민준', '서준', '예준', '도윤', '시우', '주원', '하준', '지호', '지후', '준서',
  '준혁', '현우', '도현', '지원', '수호', '유준', '건우', '우진', '민재', '현준',
  '서연', '서윤', '지우', '서현', '민서', '하윤', '윤서', '지유', '채원', '수아',
  '지민', '다은', '예린', '수빈', '하은', '지은', '예원', '나은', '다현', '소윤',
]

export function randomKoreanName(): string {
  return randomPick(SURNAMES) + randomPick(FIRSTNAMES)
}

export function randomPhone(): string {
  const mid = String(randomInt(1000, 9999)).padStart(4, '0')
  const end = String(randomInt(1000, 9999)).padStart(4, '0')
  return `010-${mid}-${end}`
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randomBool(prob = 0.5): boolean {
  return Math.random() < prob
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
)
