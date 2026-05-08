'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import { Send, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

const responses = [
  { member: '김민준', score: 9, category: '추천', comment: '직원분들이 너무 친절하고 시설이 깔끔해서 친구에게 추천했어요.', date: '2026-04-26' },
  { member: '이서연', score: 10, category: '추천', comment: 'PT 프로그램이 정말 효과적입니다. 6개월 만에 원하는 목표를 달성했어요!', date: '2026-04-25' },
  { member: '박지훈', score: 6, category: '중립', comment: '시설은 좋은데 주차가 불편합니다.', date: '2026-04-25' },
  { member: '최유리', score: 3, category: '비추천', comment: '샤워실 온수가 자주 끊겨서 불편합니다. 개선이 필요합니다.', date: '2026-04-24' },
  { member: '정현우', score: 8, category: '추천', comment: '전반적으로 만족합니다. 가격 대비 좋은 서비스입니다.', date: '2026-04-24' },
];

const categoryColor: Record<string, string> = {
  '추천': 'bg-green-100 text-green-700',
  '중립': 'bg-gray-100 text-gray-600',
  '비추천': 'bg-red-100 text-red-700',
};

export default function NpsPage() {
  const [tab, setTab] = useState<'결과' | '설문발송'>('결과');
  const [channel, setChannel] = useState<'SMS' | '카카오' | '앱 푸시'>('SMS');
  const [target, setTarget] = useState('전체 활성 회원');
  const [campaigns, setCampaigns] = useState([
    { id: 'CMP-001', sentAt: '2026-04-26 14:00', target: '전체 활성 회원', channel: 'SMS', recipients: 842, status: '발송 완료' },
    { id: 'CMP-002', sentAt: '2026-04-12 10:30', target: '신규 가입 30일 회원', channel: '카카오', recipients: 124, status: '응답 수집 중' },
  ]);
  const promoters = responses.filter(r => r.score >= 9).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const nps = Math.round(((promoters - detractors) / responses.length) * 100);
  const neutral = responses.filter(r => r.score >= 7 && r.score <= 8).length;

  const handleSendSurvey = () => {
    const recipientMap: Record<string, number> = {
      '전체 활성 회원': 842,
      '이번 달 수업 참여 회원': 316,
      '신규 가입 30일 회원': 124,
    };
    const newCampaign = {
      id: `CMP-${String(campaigns.length + 1).padStart(3, '0')}`,
      sentAt: '2026-05-08 15:30',
      target,
      channel,
      recipients: recipientMap[target] ?? 0,
      status: '응답 수집 중',
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    setTab('결과');
    toast.success(`${channel} 채널로 NPS 설문을 발송했습니다.`);
  };

  return (
    <AppLayout>
      <PageHeader title="NPS 설문" description="회원 순추천지수(NPS)를 측정하고 개선 포인트를 파악합니다" actions={
        <button onClick={() => setTab('설문발송')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Send className="w-4 h-4" /> 설문 발송
        </button>
      } />

      {/* NPS 요약 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl border-2 p-5 text-center ${nps >= 50 ? 'bg-green-50 border-green-300' : nps >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300'}`}>
          <p className="text-xs text-gray-500 mb-1">NPS 점수</p>
          <p className={`text-4xl font-black ${nps >= 50 ? 'text-green-600' : nps >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{nps}</p>
          <p className="text-xs text-gray-500 mt-1">{nps >= 50 ? '우수' : nps >= 0 ? '양호' : '개선 필요'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ThumbsUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">추천 (9~10)</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{promoters}명</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Minus className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">중립 (7~8)</p>
          </div>
          <p className="text-2xl font-bold text-gray-600">{neutral}명</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ThumbsDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500">비추천 (0~6)</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{detractors}명</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['결과', '설문발송'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '결과' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">최근 발송 이력</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{campaign.target}</p>
                    <p className="mt-1 text-xs text-gray-500">{campaign.sentAt} · {campaign.channel} · {campaign.recipients}명</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${campaign.status === '발송 완료' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {campaign.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {responses.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${r.score >= 9 ? 'bg-green-100 text-green-700' : r.score >= 7 ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                      {r.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{r.member}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[r.category]}`}>{r.category}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설문 대상</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>전체 활성 회원</option><option>이번 달 수업 참여 회원</option><option>신규 가입 30일 회원</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발송 채널</label>
            <div className="flex gap-2">
              {(['SMS', '카카오', '앱 푸시'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setChannel(item)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg ${channel === item ? 'border-2 border-blue-500 text-blue-600' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-2">설문 미리보기</p>
            <p className="text-sm text-gray-700">안녕하세요! FitGenie CRM을 친구·가족에게 추천할 의향이 얼마나 되시나요?</p>
            <div className="flex gap-1 mt-3">
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                <div key={n} className="flex-1 h-8 bg-white border border-gray-200 rounded text-xs flex items-center justify-center text-gray-500">{n}</div>
              ))}
            </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>전혀 추천하지 않음</span><span>적극 추천</span>
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            발송 예상 대상: {target === '전체 활성 회원' ? 842 : target === '이번 달 수업 참여 회원' ? 316 : 124}명
          </div>
          <Button fullWidth icon={<Send className="w-4 h-4" />} onClick={handleSendSurvey}>
            설문 발송
          </Button>
        </div>
      )}
    </AppLayout>
  );
}
