'use client';
import React, { useState } from 'react';
import { Users, Search, Plus, Link, Unlink } from 'lucide-react';

const demoFamilies = [
  { id: 1, main: '김철수', members: ['김영희 (배우자)', '김민준 (자녀)'], joined: '2024.01.15' },
  { id: 2, main: '이수진', members: ['이준호 (배우자)'], joined: '2024.03.22' },
];

export default function FamilyMemberPage() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> 가족 회원 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">가족 관계 회원을 연결하고 관리합니다</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> 가족 연결
        </button>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input placeholder="회원명으로 검색" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* 가족 그룹 목록 */}
      <div className="space-y-4">
        {demoFamilies.map(family => (
          <div key={family.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">대표 회원</span>
                  <span className="text-sm font-semibold text-gray-800">{family.main}</span>
                </div>
                <div className="space-y-1.5">
                  {family.members.map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <Link className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{m}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">연결일 {family.joined}</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors">
                <Unlink className="w-3.5 h-3.5" /> 연결 해제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 가족 연결 모달 */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">가족 회원 연결</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대표 회원</label>
              <input placeholder="이름 검색" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">연결할 회원</label>
              <input placeholder="이름 검색" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>배우자</option>
                <option>자녀</option>
                <option>부모</option>
                <option>형제/자매</option>
                <option>기타</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">연결 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
