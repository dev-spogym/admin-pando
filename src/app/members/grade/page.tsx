'use client';
import React, { useState } from 'react';
import { Star, Users, Settings, ChevronRight } from 'lucide-react';

const grades = [
  { name: 'VVIP', color: 'bg-purple-100 text-purple-700 border-purple-200', count: 12, minVisit: 200, benefits: ['전용 라커', '무료 PT 2회/월', '생일 혜택'] },
  { name: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200', count: 48, minVisit: 100, benefits: ['우선 예약', '10% 할인', '생일 혜택'] },
  { name: 'GOLD', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', count: 127, minVisit: 50, benefits: ['5% 할인', '생일 혜택'] },
  { name: 'SILVER', color: 'bg-gray-100 text-gray-600 border-gray-200', count: 234, minVisit: 20, benefits: ['생일 혜택'] },
  { name: 'BRONZE', color: 'bg-orange-50 text-orange-600 border-orange-200', count: 456, minVisit: 0, benefits: ['기본 서비스'] },
];

export default function GradeManagePage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> 등급 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">회원 등급 기준과 혜택을 설정합니다</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">
          <Settings className="w-4 h-4" /> 등급 기준 설정
        </button>
      </div>

      {/* 등급 카드 */}
      <div className="space-y-3">
        {grades.map(grade => (
          <div key={grade.name}
            onClick={() => setSelected(selected === grade.name ? null : grade.name)}
            className={`bg-white rounded-xl border cursor-pointer transition-all ${selected === grade.name ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${grade.color}`}>{grade.name}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">방문 {grade.minVisit}회 이상</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{grade.count}명</span>
                  </div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selected === grade.name ? 'rotate-90' : ''}`} />
            </div>
            {selected === grade.name && (
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">혜택</p>
                <div className="flex flex-wrap gap-2">
                  {grade.benefits.map(b => (
                    <span key={b} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{b}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">혜택 편집</button>
                  <button className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">해당 회원 보기</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
