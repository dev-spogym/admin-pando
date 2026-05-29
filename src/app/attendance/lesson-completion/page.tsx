'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileSignature,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';

type AttendanceStatus = 'pending' | 'attended' | 'completed' | 'missingSign' | 'pushSent' | 'noshow';

interface LessonOption {
  id: string;
  time: string;
  title: string;
  trainer: string;
  room: string;
  capacity: number;
}

interface LessonMember {
  id: string;
  name: string;
  phone: string;
  membership: string;
  status: AttendanceStatus;
  processedAt: string;
  processedBy: string;
  accessHint: string;
}

const LESSONS: LessonOption[] = [
  { id: 'L-1001', time: '09:00-09:50', title: 'PT 1:1 기초 자세 교정', trainer: '김도윤', room: 'PT Room 1', capacity: 6 },
  { id: 'L-1002', time: '11:00-11:50', title: '필라테스 리포머 A', trainer: '이서현', room: 'Studio A', capacity: 12 },
  { id: 'L-1003', time: '19:00-19:50', title: 'GX 서킷 트레이닝', trainer: '박민재', room: 'GX Room', capacity: 18 },
];

const INITIAL_MEMBERS: Record<string, LessonMember[]> = {
  'L-1001': [
    {
      id: 'M-1001',
      name: '정하린',
      phone: '010-2211-3401',
      membership: 'PT 20회권',
      status: 'attended',
      processedAt: '08:57',
      processedBy: '김도윤',
      accessHint: '08:42 입장',
    },
    {
      id: 'M-1002',
      name: '오민석',
      phone: '010-3190-4488',
      membership: 'PT 10회권',
      status: 'missingSign',
      processedAt: '09:02',
      processedBy: '김도윤',
      accessHint: '08:48 입장',
    },
    {
      id: 'M-1003',
      name: '한지우',
      phone: '010-7721-6502',
      membership: 'PT 체험권',
      status: 'pending',
      processedAt: '-',
      processedBy: '-',
      accessHint: '입장 기록 없음',
    },
    {
      id: 'M-1004',
      name: '문태겸',
      phone: '010-5582-1907',
      membership: 'PT 30회권',
      status: 'noshow',
      processedAt: '09:35',
      processedBy: '자동 처리',
      accessHint: '입장 기록 없음',
    },
  ],
  'L-1002': [
    {
      id: 'M-2001',
      name: '서윤아',
      phone: '010-9122-0441',
      membership: '필라테스 12회권',
      status: 'completed',
      processedAt: '11:53',
      processedBy: '이서현',
      accessHint: '10:41 입장',
    },
    {
      id: 'M-2002',
      name: '강태오',
      phone: '010-8181-3377',
      membership: '필라테스 8회권',
      status: 'pushSent',
      processedAt: '11:56',
      processedBy: '이서현',
      accessHint: '10:52 입장',
    },
    {
      id: 'M-2003',
      name: '배소영',
      phone: '010-6720-1009',
      membership: '필라테스 12회권',
      status: 'attended',
      processedAt: '10:59',
      processedBy: '스태프',
      accessHint: '10:36 입장',
    },
  ],
  'L-1003': [
    {
      id: 'M-3001',
      name: '이준호',
      phone: '010-4401-2299',
      membership: 'GX 월회원',
      status: 'pending',
      processedAt: '-',
      processedBy: '-',
      accessHint: '18:32 입장',
    },
    {
      id: 'M-3002',
      name: '최다은',
      phone: '010-3030-8821',
      membership: 'GX 월회원',
      status: 'pending',
      processedAt: '-',
      processedBy: '-',
      accessHint: '입장 기록 없음',
    },
  ],
};

const STATUS_META: Record<AttendanceStatus, { label: string; className: string }> = {
  pending: { label: '처리 대기', className: 'bg-gray-100 text-gray-700' },
  attended: { label: '출석 처리', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: '완료', className: 'bg-blue-100 text-blue-700' },
  missingSign: { label: '서명/확인 누락', className: 'bg-amber-100 text-amber-700' },
  pushSent: { label: 'Push 발송됨', className: 'bg-indigo-100 text-indigo-700' },
  noshow: { label: '노쇼', className: 'bg-red-100 text-red-700' },
};

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function LessonCompletionPage() {
  const [selectedLessonId, setSelectedLessonId] = useState(LESSONS[0].id);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [membersByLesson, setMembersByLesson] = useState(INITIAL_MEMBERS);

  const selectedLesson = LESSONS.find((lesson) => lesson.id === selectedLessonId) ?? LESSONS[0];
  const selectedMembers = membersByLesson[selectedLessonId] ?? [];

  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return selectedMembers.filter((member) => {
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      const matchesQuery =
        !keyword ||
        member.name.toLowerCase().includes(keyword) ||
        member.phone.replace(/\D/g, '').includes(keyword.replace(/\D/g, ''));
      return matchesStatus && matchesQuery;
    });
  }, [query, selectedMembers, statusFilter]);

  const summary = useMemo(() => {
    const count = (status: AttendanceStatus) => selectedMembers.filter((member) => member.status === status).length;
    return {
      total: selectedMembers.length,
      attended: count('attended') + count('completed') + count('missingSign') + count('pushSent'),
      pending: count('pending'),
      missingSign: count('missingSign') + count('pushSent'),
      noshow: count('noshow'),
    };
  }, [selectedMembers]);

  const updateStatus = (memberId: string, nextStatus: AttendanceStatus, processedBy = '현재 사용자') => {
    setMembersByLesson((current) => ({
      ...current,
      [selectedLessonId]: (current[selectedLessonId] ?? []).map((member) =>
        member.id === memberId
          ? {
              ...member,
              status: nextStatus,
              processedAt: nowTime(),
              processedBy,
            }
          : member,
      ),
    }));
  };

  const markAllNoShow = () => {
    setMembersByLesson((current) => ({
      ...current,
      [selectedLessonId]: (current[selectedLessonId] ?? []).map((member) =>
        member.status === 'pending'
          ? {
              ...member,
              status: 'noshow',
              processedAt: nowTime(),
              processedBy: '자동 처리',
            }
          : member,
      ),
    }));
  };

  return (
    <AppLayout>
      <PageHeader
        title="수업 출석/완료 확인"
        description="수업별 예약 회원의 출석, 완료 확인, 서명 누락, 노쇼 상태를 처리합니다."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={markAllNoShow}
          >
            <RefreshCw size={15} />
            미처리 노쇼 반영
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_240px]">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            수업 선택
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              value={selectedLessonId}
              onChange={(event) => setSelectedLessonId(event.target.value)}
            >
              {LESSONS.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.time} · {lesson.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            상태
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AttendanceStatus | 'all')}
            >
              <option value="all">전체</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            강사
            <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
              {selectedLesson.trainer}
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            회원 검색
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                placeholder="회원명 또는 연락처"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
        </div>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">예약 인원</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}명</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700">출석 처리</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.attended}명</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">미처리</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.pending}명</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700">서명/확인 누락</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary.missingSign}명</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">노쇼</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{summary.noshow}명</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        {selectedLesson.room} · 정원 {selectedLesson.capacity}명 · 수업 출석/완료 처리는 QR 인증이 아니라 담당자 처리와 회원앱 확인을 기준으로 기록합니다.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">회원</th>
              <th className="px-4 py-3 text-left">이용권</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">처리 정보</th>
              <th className="px-4 py-3 text-left">입/출입 참고</th>
              <th className="px-4 py-3 text-right">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredMembers.map((member) => {
              const status = STATUS_META[member.status];
              return (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.phone}</div>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{member.membership}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    <div>{member.processedAt}</div>
                    <div>{member.processedBy}</div>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">{member.accessHint}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        onClick={() => updateStatus(member.id, 'attended')}
                      >
                        <UserCheck size={13} />
                        출석
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        onClick={() => updateStatus(member.id, 'completed')}
                      >
                        <CheckCircle2 size={13} />
                        완료
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                        onClick={() => updateStatus(member.id, 'pushSent', selectedLesson.trainer)}
                      >
                        <Bell size={13} />
                        Push
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        onClick={() => updateStatus(member.id, 'noshow')}
                      >
                        <XCircle size={13} />
                        노쇼
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-sm text-gray-500">
            <Clock size={22} />
            조건에 맞는 예약 회원이 없습니다.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <FileSignature size={15} className="mt-0.5 shrink-0" />
        수업 완료 근거가 없는 회원은 서명/확인 누락으로 남기고, 회원앱 Push 확인 후 완료 상태로 확정합니다.
      </div>
    </AppLayout>
  );
}
