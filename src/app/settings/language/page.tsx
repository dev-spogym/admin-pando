'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Globe, Check, Save } from 'lucide-react';

const languages = [
  { code: 'ko', name: '한국어', flag: '🇰🇷', default: true },
  { code: 'en', name: 'English', flag: '🇺🇸', default: false },
  { code: 'zh', name: '中文 (简体)', flag: '🇨🇳', default: false },
  { code: 'ja', name: '日本語', flag: '🇯🇵', default: false },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', default: false },
];

const timezones = ['Asia/Seoul (UTC+9)', 'Asia/Tokyo (UTC+9)', 'America/New_York (UTC-5)', 'Europe/London (UTC+0)'];

export default function LanguageSettingsPage() {
  const [selected, setSelected] = useState('ko');
  const [timezone, setTimezone] = useState('Asia/Seoul (UTC+9)');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [currency, setCurrency] = useState('KRW (₩)');

  return (
    <AppLayout>
      <PageHeader title="다국어 설정" description="시스템 언어, 시간대, 날짜 형식, 통화 단위를 설정합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Save className="w-4 h-4" /> 저장
        </button>
      } />

      <div className="max-w-2xl space-y-6">
        {/* 언어 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" /> 시스템 언어
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {languages.map(lang => (
              <button key={lang.code} onClick={() => setSelected(lang.code)}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${selected === lang.code ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{lang.name}</p>
                    {lang.default && <p className="text-xs text-gray-400">기본값</p>}
                  </div>
                </div>
                {selected === lang.code && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* 지역 설정 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">지역 설정</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">시간대</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {timezones.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">날짜 형식</label>
              <div className="flex gap-2">
                {['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'].map(f => (
                  <button key={f} onClick={() => setDateFormat(f)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-all ${dateFormat === f ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">통화 단위</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>KRW (₩)</option><option>USD ($)</option><option>JPY (¥)</option><option>CNY (¥)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">설정 변경 후 저장하면 모든 직원 계정에 즉시 반영됩니다.</p>
        </div>
      </div>
    </AppLayout>
  );
}
