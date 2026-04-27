'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const SIMULATOR_ACTIONS = [
  { id: 'attendance', label: '출석 체크인', emoji: '👥', color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'members',    label: '신규 회원 등록', emoji: '👤', color: 'bg-green-500 hover:bg-green-600' },
  { id: 'sales',      label: '매출 발생', emoji: '💰', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { id: 'classes',    label: '수업 예약', emoji: '🏋️', color: 'bg-purple-500 hover:bg-purple-600' },
  { id: 'facilities', label: '락커 변경', emoji: '🔐', color: 'bg-orange-500 hover:bg-orange-600' },
  { id: 'staff',      label: '직원 출퇴근', emoji: '👔', color: 'bg-pink-500 hover:bg-pink-600' },
] as const

const CRON_SCHEDULE = [
  { time: '07:00', label: '아침 (출근 + 출석 러시)', emoji: '🌅' },
  { time: '12:00', label: '점심 (소량 출석 + 수업)', emoji: '☀️' },
  { time: '17:00', label: '저녁 (피크 + 신규 회원)', emoji: '🌆' },
  { time: '22:00', label: '야간 (정산 + 퇴근)', emoji: '🌙' },
]

export default function SimulatorPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const run = async (id: string, label: string, body?: object) => {
    setLoading(id)
    try {
      const url = id === 'all' ? '/api/simulate' : `/api/simulate/${id}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? { branchId: 1 }),
      })
      const data = await res.json()
      toast.success(`${label} 완료`, {
        description: JSON.stringify(data).slice(0, 100),
      })
      setLastRun(new Date().toLocaleTimeString('ko-KR'))
    } catch {
      toast.error(`${label} 실패`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {/* 고정 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
        className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-full shadow-2xl hover:bg-gray-700 transition-all text-[13px] font-bold"
      >
        <span>🎮</span>
        <span>시뮬레이터</span>
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998 }}
        />
      )}

      {/* 드로어 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '360px',
          zIndex: 9999,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
        }}
        className="bg-white shadow-2xl border-l border-gray-200"
      >
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold">라이브 시뮬레이터</h2>
              <p className="text-[11px] text-gray-400 mt-1">실제 운영 데이터를 자동으로 생성합니다</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors text-gray-400 hover:text-white text-[18px]"
            >
              ×
            </button>
          </div>
        </div>

        {/* 개별 실행 버튼들 */}
        <div className="p-6 space-y-3">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">개별 실행</p>

          {SIMULATOR_ACTIONS.map(action => (
            <button
              key={action.id}
              disabled={loading !== null}
              onClick={() => run(action.id, action.label)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-white text-[13px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
            >
              <span className="flex items-center gap-2">
                <span>{action.emoji}</span>
                <span>{action.label}</span>
              </span>
              {loading === action.id && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}

          {/* 전체 실행 */}
          <div className="pt-2 border-t border-gray-200">
            <button
              disabled={loading !== null}
              onClick={() => run('all', '전체 실행', { type: 'all', branchId: 1 })}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 text-white text-[13px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:from-gray-700 hover:to-gray-800"
            >
              <span className="flex items-center gap-2">
                <span>⚡</span>
                <span>전체 실행</span>
              </span>
              {loading === 'all' && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          </div>

          {/* 마지막 실행 시간 */}
          {lastRun && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
              <span className="text-green-500 text-[13px]">✓</span>
              <span className="text-[12px] text-green-700 font-medium">마지막 실행: {lastRun}</span>
            </div>
          )}
        </div>

        {/* 크론 일정 */}
        <div className="px-6 pb-6">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">크론 일정 (KST)</p>
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {CRON_SCHEDULE.map(item => (
              <div key={item.time} className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-[16px]">{item.emoji}</span>
                <div>
                  <span className="text-[12px] font-bold text-gray-800">{item.time}</span>
                  <span className="text-[11px] text-gray-500 ml-2">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
