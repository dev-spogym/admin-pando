'use client';
import React, { useState } from 'react';
import { Filter, Plus, Users, Zap, ChevronRight, Tag } from 'lucide-react';

const segments = [
  { id: 1, name: '만료 임박 회원', desc: '30일 이내 이용권 만료 예정', count: 23, color: 'text-red-600 bg-red-50 border-red-200', auto: true },
  { id: 2, name: '장기 미방문', desc: '30일 이상 방문 없는 회원', count: 45, color: 'text-orange-600 bg-orange-50 border-orange-200', auto: true },
  { id: 3, name: '신규 가입 (30일)', desc: '최근 30일 이내 등록 회원', count: 18, color: 'text-blue-600 bg-blue-50 border-blue-200', auto: true },
  { id: 4, name: 'PT 미구매 회원', desc: 'PT 이용권 미보유 활성 회원', count: 134, color: 'text-purple-600 bg-purple-50 border-purple-200', auto: true },
  { id: 5, name: '생일 회원 (이번달)', desc: '이번 달 생일인 회원', count: 12, color: 'text-pink-600 bg-pink-50 border-pink-200', auto: true },
];

export default function SegmentPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" /> 세그먼트 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">회원 그룹을 만들어 타겟 마케팅에 활용합니다</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> 세그먼트 생성
        </button>
      </div>

      {/* 세그먼트 목록 */}
      <div className="space-y-3">
        {segments.map(seg => (
          <div key={seg.id} className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors p-5 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl border ${seg.color}`}>
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{seg.name}</p>
                  {seg.auto && (
                    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      <Zap className="w-3 h-3" /> 자동
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{seg.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-base font-bold text-gray-800">{seg.count}명</p>
                <div className="flex gap-1.5 mt-1">
                  <button className="text-xs text-blue-600 hover:underline">메시지 발송</button>
                  <span className="text-gray-300">·</span>
                  <button className="text-xs text-gray-500 hover:underline">보기</button>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      {/* 세그먼트 생성 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">새 세그먼트 만들기</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">세그먼트 이름</label>
              <input placeholder="예: 6개월 이상 장기회원" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">조건 설정</label>
              <div className="space-y-2">
                {[['이용권 상태','활성 / 만료 / 홀딩'],['마지막 방문일','N일 이내 / 이후'],['등급','VVIP / VIP / GOLD 등'],['성별','남성 / 여성']].map(([k,v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>{k}</option>
                    </select>
                    <span className="text-xs text-gray-400 w-24 truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
