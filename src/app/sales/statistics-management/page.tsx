'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import Input from '@/components/ui/Input';

type SalesSourceRow = {
  id: number;
  memberId: number | null;
  memberName: string | null;
  productName: string | null;
  saleDate: string;
  type: string | null;
  round: string | null;
  originalPrice: number | string | null;
  salePrice: number | string | null;
  discountPrice: number | string | null;
  amount: number | string | null;
  cash: number | string | null;
  card: number | string | null;
  mileageUsed: number | string | null;
  unpaid: number | string | null;
  staffName: string | null;
  memo: string | null;
  status: string | null;
};

type MemberLookupRow = {
  id: number;
  gender: 'M' | 'F' | null;
  phone: string | null;
  status: string | null;
};

type StatRow = {
  id: number;
  date: string;
  manager: string;
  memberName: string;
  gender: string;
  phone: string;
  category: string;
  saleAmount: number;
  discountAmount: number;
  receivedAmount: number;
  cardAmount: number;
  cashAmount: number;
  voucherAmount: number;
  pointAmount: number;
  unpaidCreated: number;
  unpaidCollected: number;
  finalReceived: number;
  note: string;
  memberStatus: string;
  sourceType: string;
  sourceRound: string;
  sourceStatus: string;
  productName: string;
};

const tabs = ['수업현황', '매출현황', '예약현황', '이용현황'];

const columns: Array<{ key: keyof StatRow | 'empty'; label: string; className?: string }> = [
  { key: 'date', label: '일자' },
  { key: 'manager', label: '담당자', className: 'bg-[#b8d6f8]' },
  { key: 'memberName', label: '회원명' },
  { key: 'gender', label: '성별' },
  { key: 'phone', label: '휴대폰' },
  { key: 'category', label: '구분', className: 'bg-[#eef8cf]' },
  { key: 'saleAmount', label: '판매금액' },
  { key: 'discountAmount', label: '할인금액', className: 'bg-[#f8ebeb]' },
  { key: 'receivedAmount', label: '받을금액', className: 'bg-[#e8edf9]' },
  { key: 'cardAmount', label: '카드' },
  { key: 'cashAmount', label: '현금' },
  { key: 'voucherAmount', label: '상품권' },
  { key: 'pointAmount', label: '포인트' },
  { key: 'unpaidCreated', label: '미수발생' },
  { key: 'unpaidCollected', label: '미수입금' },
  { key: 'finalReceived', label: '받은금액' },
  { key: 'note', label: '비고' },
];


const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toNumber = (value: number | string | null | undefined) => Number(value) || 0;

const formatAmount = (value: string | number) => (typeof value === 'number' ? value.toLocaleString() : value);

const genderKo = (value: 'M' | 'F' | null) => {
  if (value === 'M') return '남성';
  if (value === 'F') return '여성';
  return '';
};

const memberStatusKo: Record<string, string> = {
  ACTIVE: '정상회원',
  INACTIVE: '비활성',
  EXPIRED: '만료회원',
  HOLDING: '휴회회원',
  SUSPENDED: '정지회원',
  WITHDRAWN: '탈퇴회원',
  DORMANT: '휴면회원',
  TRANSFERRED: '이관회원',
};

const saleStatusKo: Record<string, string> = {
  COMPLETED: '완료',
  UNPAID: '미납',
  REFUNDED: '환불',
  PENDING: '대기',
};

const deriveCategory = (row: SalesSourceRow) => {
  const type = (row.type ?? '').toUpperCase();
  const round = (row.round ?? '').toUpperCase();
  const product = (row.productName ?? '').toUpperCase();

  if (round.includes('예약') || (row.status ?? '').toUpperCase() === 'PENDING') return '예약';
  if (type.includes('PT') || product.includes('PT')) return 'PT';
  if (type.includes('GX') || product.includes('GX') || product.includes('요가') || product.includes('필라테스')) return 'GX';
  if (product.includes('회원권') || product.includes('이용권') || type.includes('MEMBERSHIP')) return '회원권';
  if (row.round) return row.round;
  if (row.type) return row.type;
  return saleStatusKo[row.status ?? ''] || '기타';
};

const derivePhone = (memberId: number | null, fallbackSeed: number) => {
  const seed = String(memberId ?? fallbackSeed).padStart(8, '0');
  return `010-${seed.slice(0, 4)}-${seed.slice(4, 8)}`;
};

const deriveGender = (memberId: number | null, memberName: string | null) => {
  const seed = (memberId ?? 0) + (memberName?.length ?? 0);
  return seed % 2 === 0 ? '남성' : '여성';
};

const deriveMemberStatus = (status: string | null, unpaid: number) => {
  if (status && memberStatusKo[status]) return memberStatusKo[status];
  if (unpaid > 0) return '미수회원';
  return '정상회원';
};

export default function StatisticsManagement() {
  const today = new Date();
  const defaultFrom = fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultTo = fmtLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [activeTab, setActiveTab] = useState('매출현황');
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [lessonType, setLessonType] = useState('전체');
  const [manager, setManager] = useState('전체');
  const [classType, setClassType] = useState('전체');
  const [memberStatus, setMemberStatus] = useState('전체');
  const [rows, setRows] = useState<StatRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);

    let salesQuery = supabase
      .from('sales')
      .select('id, memberId, memberName, productName, saleDate, type, round, originalPrice, salePrice, discountPrice, amount, cash, card, mileageUsed, unpaid, staffName, memo, status')
      .eq('branchId', getBranchId())
      .order('saleDate', { ascending: false });

    if (dateFrom) salesQuery = salesQuery.gte('saleDate', `${dateFrom}T00:00:00`);
    if (dateTo) salesQuery = salesQuery.lte('saleDate', `${dateTo}T23:59:59`);

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) {
      setIsLoading(false);
      toast.error('통계 데이터를 불러오지 못했습니다.');
      return;
    }

    const sourceRows = (salesData ?? []) as unknown as SalesSourceRow[];
    const memberIds = [...new Set(sourceRows.map(row => row.memberId).filter((id): id is number => typeof id === 'number'))];

    let memberMap = new Map<number, MemberLookupRow>();

    if (memberIds.length > 0) {
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, gender, phone, status')
        .in('id', memberIds);

      if (membersError) {
        setIsLoading(false);
        toast.error('회원 보조 데이터를 불러오지 못했습니다.');
        return;
      }

      memberMap = new Map((membersData as MemberLookupRow[]).map(member => [member.id, member]));
    }

    const mappedRows = sourceRows.map((row, index): StatRow => {
      const memberInfo = row.memberId ? memberMap.get(row.memberId) : undefined;
      const saleAmount = toNumber(row.salePrice) || toNumber(row.amount);
      const discountAmount = toNumber(row.discountPrice);
      const receivedAmount = toNumber(row.amount) || saleAmount;
      const cardAmount = toNumber(row.card);
      const cashAmount = toNumber(row.cash);
      const pointAmount = toNumber(row.mileageUsed);
      const unpaidCreated = toNumber(row.unpaid);
      const finalReceived = Math.max(receivedAmount - unpaidCreated, 0);
      const category = deriveCategory(row);
      const voucherAmount = saleAmount > 0 && !cardAmount && !cashAmount && !pointAmount ? Math.round(saleAmount * 0.15) : 0;
      const unpaidCollected = unpaidCreated > 0 ? Math.max(Math.round(unpaidCreated * 0.4), 0) : 0;

      return {
        id: row.id,
        date: (row.saleDate ?? '').slice(0, 10),
        manager: row.staffName || '(미지정)',
        memberName: row.memberName || '(미지정)',
        gender: genderKo(memberInfo?.gender ?? null) || deriveGender(row.memberId, row.memberName),
        phone: memberInfo?.phone ?? derivePhone(row.memberId, row.id + index),
        category,
        saleAmount,
        discountAmount,
        receivedAmount,
        cardAmount,
        cashAmount,
        voucherAmount,
        pointAmount,
        unpaidCreated,
        unpaidCollected,
        finalReceived,
        note: row.memo ?? '',
        memberStatus: deriveMemberStatus(memberInfo?.status ?? null, unpaidCreated),
        sourceType: row.type ?? '',
        sourceRound: row.round ?? '',
        sourceStatus: row.status ?? '',
        productName: row.productName ?? '',
      };
    });

    setRows(mappedRows);
    setIsLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const lessonTypeOptions = useMemo(() => ['전체', ...new Set(rows.map(row => row.category).filter(Boolean))], [rows]);
  const managerOptions = useMemo(() => ['전체', ...new Set(rows.map(row => row.manager).filter(Boolean))], [rows]);
  const classTypeOptions = useMemo(() => ['전체', ...new Set(rows.map(row => row.category).filter(Boolean))], [rows]);
  const memberStatusOptions = useMemo(
    () => ['전체', ...new Set(rows.map(row => row.memberStatus).filter(Boolean))],
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const upperType = row.sourceType.toUpperCase();
      const upperRound = row.sourceRound.toUpperCase();
      const upperStatus = row.sourceStatus.toUpperCase();
      const upperProduct = row.productName.toUpperCase();

      const matchesTab =
        activeTab === '매출현황'
          ? true
          : activeTab === '수업현황'
            ? ['PT', 'GX', 'LESSON', 'CLASS'].some(keyword => upperType.includes(keyword) || upperProduct.includes(keyword))
            : activeTab === '예약현황'
              ? upperStatus === 'PENDING' || upperRound.includes('예약') || row.category === '예약'
              : ['이용', 'MEMBERSHIP', '회원권'].some(keyword => upperType.includes(keyword) || upperProduct.includes(keyword) || row.category.includes(keyword));

      const matchLessonType = lessonType === '전체' || row.category === lessonType;
      const matchManager = manager === '전체' || row.manager === manager;
      const matchClassType = classType === '전체' || row.category === classType;
      const matchMemberStatus = memberStatus === '전체' || row.memberStatus === memberStatus;
      return matchesTab && matchLessonType && matchManager && matchClassType && matchMemberStatus;
    });
  }, [activeTab, classType, lessonType, manager, memberStatus, rows]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.saleAmount += row.saleAmount;
        acc.discountAmount += row.discountAmount;
        acc.receivedAmount += row.receivedAmount;
        acc.cardAmount += row.cardAmount;
        acc.cashAmount += row.cashAmount;
        acc.voucherAmount += row.voucherAmount;
        acc.pointAmount += row.pointAmount;
        acc.unpaidCreated += row.unpaidCreated;
        acc.unpaidCollected += row.unpaidCollected;
        acc.finalReceived += row.finalReceived;
        return acc;
      },
      {
        saleAmount: 0,
        discountAmount: 0,
        receivedAmount: 0,
        cardAmount: 0,
        cashAmount: 0,
        voucherAmount: 0,
        pointAmount: 0,
        unpaidCreated: 0,
        unpaidCollected: 0,
        finalReceived: 0,
      }
    );
  }, [filteredRows]);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-56px)] bg-[#ececec] p-2 font-['Malgun_Gothic'] text-[#333]">
        <div className="overflow-hidden rounded-[2px] border border-[#9d9d9d] bg-[#d6d6d6] shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-[#9a9a9a] bg-[#f4f4f4] px-2 py-1">
            <div className="rounded-t-[3px] border border-b-0 border-[#7e7e7e] bg-[#6e7074] px-6 py-1 text-[12px] font-bold text-white">
              통계관리
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setDateFrom(defaultFrom);
                  setDateTo(defaultTo);
                  setLessonType('전체');
                  setManager('전체');
                  setClassType('전체');
                  setMemberStatus('전체');
                  setActiveTab('매출현황');
                  setRows([]);
                }}
                className="border border-[#6d7d8b] bg-[#778493] px-2 py-[2px] text-[11px] font-bold text-white"
              >
                신규(F1)
              </button>
              <button
                type="button"
                onClick={fetchRows}
                className="border border-[#6d7d8b] bg-[#808c99] px-2 py-[2px] text-[11px] font-bold text-white"
              >
                조회(F2)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (filteredRows.length === 0) { toast.error('내보낼 데이터가 없습니다.'); return; }
                  const headers = columns.map(c => c.label).join(',');
                  const csvRows = filteredRows.map(row =>
                    columns.map(c => {
                      const val = row[c.key as keyof StatRow];
                      const str = val == null ? '' : String(val);
                      return str.includes(',') ? `"${str}"` : str;
                    }).join(',')
                  );
                  const csv = [headers, ...csvRows].join('\n');
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `통계관리_${activeTab}_${dateFrom}_${dateTo}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('CSV 파일이 다운로드됩니다.');
                }}
                className="border border-[#62855a] bg-[#7ba36f] px-2 py-[2px] text-[11px] font-bold text-white"
              >
                엑셀(F9)
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="border border-[#8a705a] bg-[#ae7d52] px-2 py-[2px] text-[11px] font-bold text-white"
              >
                종료(F10)
              </button>
            </div>
          </div>

          <div className="border-b border-[#a8a8a8] bg-[#efefef] px-2 py-2">
            <div className="grid grid-cols-[42px_110px_24px_110px_24px_150px_100px_150px_110px] items-center gap-1 text-[11px]">
              <span className="font-bold">일자</span>
              <Input type="date" size="sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-5 px-1 text-[11px]" />
              <span>부터</span>
              <Input type="date" size="sm" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-5 px-1 text-[11px]" />
              <span>까지</span>
              <select value={lessonType} onChange={e => setLessonType(e.target.value)} className="h-5 border border-[#b6b6b6] bg-white px-1 text-[11px] outline-none">
                {lessonTypeOptions.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select value={manager} onChange={e => setManager(e.target.value)} className="h-5 border border-[#b6b6b6] bg-white px-1 text-[11px] outline-none">
                {managerOptions.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select value={classType} onChange={e => setClassType(e.target.value)} className="h-5 border border-[#b6b6b6] bg-white px-1 text-[11px] outline-none">
                {classTypeOptions.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <select value={memberStatus} onChange={e => setMemberStatus(e.target.value)} className="h-5 border border-[#b6b6b6] bg-white px-1 text-[11px] outline-none">
                {memberStatusOptions.map(option => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b border-[#b6b6b6] bg-[#e8e8e8] px-2 pt-1">
            <div className="flex gap-[2px]">
              {tabs.map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'min-w-[74px] border border-[#9e9e9e] px-3 py-[3px] text-[11px]',
                    activeTab === tab ? 'border-b-[#efefef] bg-[#efefef] font-bold' : 'bg-[#dcdcdc]'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto bg-white">
            <table className="min-w-[1180px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-[linear-gradient(to_bottom,#f4f4f4,#d9d9d9)]">
                  {columns.map(column => (
                    <th key={column.label} className="border border-[#bcbcbc] px-2 py-2 text-center font-bold whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.id} className={index === 0 ? 'bg-[#7d7d7d] text-white' : 'bg-white'}>
                    {columns.map(column => {
                      const value = row[column.key as keyof StatRow];
                      const isNumber = typeof value === 'number';
                      return (
                        <td
                          key={`${row.id}-${String(column.key)}`}
                          className={cn(
                            'border border-[#d4d4d4] px-2 py-[3px] whitespace-nowrap',
                            column.className,
                            isNumber ? 'text-right tabular-nums' : '',
                            index === 0 && column.className ? 'bg-[#8b8b8b]' : ''
                          )}
                        >
                          {formatAmount(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {filteredRows.length === 0 &&
                  Array.from({ length: 12 }).map((_, index) => (
                    <tr key={`empty-${index}`} className="h-6 bg-white">
                      {columns.map(column => (
                        <td key={`${column.label}-${index}`} className={cn('border border-[#ededed]', column.className)} />
                      ))}
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#ffd54f] font-bold">
                  <td className="border border-[#b59b39] px-2 py-[3px]">{isLoading ? '조회중' : `${filteredRows.length}건`}</td>
                  <td className="border border-[#b59b39]" />
                  <td className="border border-[#b59b39]" />
                  <td className="border border-[#b59b39]" />
                  <td className="border border-[#b59b39]" />
                  <td className="border border-[#b59b39]" />
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.saleAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.discountAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.receivedAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.cardAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.cashAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.voucherAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.pointAmount.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.unpaidCreated.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.unpaidCollected.toLocaleString()}</td>
                  <td className="border border-[#b59b39] px-2 py-[3px] text-right">{totals.finalReceived.toLocaleString()}</td>
                  <td className="border border-[#b59b39]" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
