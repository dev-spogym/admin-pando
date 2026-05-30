'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { getScopedBranchId } from '@/lib/branchScope';
import { toast } from 'sonner';
import { Star, Users, Settings, ChevronRight, Plus, Trash2 } from 'lucide-react';

// ─── SCR-M009 등급 관리 (MBR-EXT-03) ──────────────────────────────────────────
// docs4/V1+V2/D02-회원관리/회원관리.md ## SCR-M009
// 등급 기준은 누적 결제 금액, 이용 기간, 방문 횟수 중 하나 또는 조합으로 설정한다.

type CriteriaOperator = 'AND' | 'OR';
type RefreshCycle = '월간' | '분기' | '연간';

interface GradeCriteria {
  usePaymentAmount: boolean;
  minPaymentAmount: number;
  useUsageMonths: boolean;
  minUsageMonths: number;
  useVisitCount: boolean;
  minVisitCount: number;
  criteriaOperator: CriteriaOperator;
}

interface GradeItem {
  id?: number;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  count: number;
  criteria: GradeCriteria;
  mileageRate: number;
  discountRate: number;
  benefits: string[];
}

interface GradeMember {
  name: string;
  visits: number;
  usageMonths: number;
  paymentAmount: number;
  contract: string;
}

type GradeRuleRow = {
  id?: number;
  gradeCode: string;
  gradeName: string;
  sortOrder: number;
  colorClass?: string | null;
  minPaymentAmount?: number | string | null;
  minUsageMonths?: number | null;
  minVisitCount?: number | null;
  usePaymentAmount?: boolean | null;
  useUsageMonths?: boolean | null;
  useVisitCount?: boolean | null;
  criteriaOperator?: string | null;
  mileageRate?: number | string | null;
  discountRate?: number | string | null;
  benefits?: unknown;
  currentMemberCount?: number | null;
};

type MemberRow = {
  id: number;
  name: string;
  registeredAt: string | null;
  membershipType: string | null;
  membershipStart: string | null;
  membershipExpiry: string | null;
};

type SaleRow = {
  memberId: number;
  amount: number | string | null;
  status: string | null;
  durationMonths: number | null;
  productName: string | null;
  saleDate: string | null;
};

type AttendanceRow = {
  memberId: number;
};

const DEFAULT_CRITERIA_OPERATOR: CriteriaOperator = 'AND';

const DEFAULT_GRADES: GradeItem[] = [
  {
    code: 'diamond',
    name: '다이아몬드',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
    sortOrder: 1,
    count: 0,
    criteria: {
      usePaymentAmount: true,
      minPaymentAmount: 5000000,
      useUsageMonths: true,
      minUsageMonths: 12,
      useVisitCount: true,
      minVisitCount: 200,
      criteriaOperator: DEFAULT_CRITERIA_OPERATOR,
    },
    mileageRate: 5,
    discountRate: 15,
    benefits: ['전용 라커', '무료 PT 2회/월', '생일 혜택'],
  },
  {
    code: 'platinum',
    name: '플래티넘',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    sortOrder: 2,
    count: 0,
    criteria: {
      usePaymentAmount: true,
      minPaymentAmount: 3000000,
      useUsageMonths: true,
      minUsageMonths: 9,
      useVisitCount: true,
      minVisitCount: 100,
      criteriaOperator: DEFAULT_CRITERIA_OPERATOR,
    },
    mileageRate: 3,
    discountRate: 10,
    benefits: ['우선 예약', '10% 할인', '생일 혜택'],
  },
  {
    code: 'gold',
    name: '골드',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    sortOrder: 3,
    count: 0,
    criteria: {
      usePaymentAmount: true,
      minPaymentAmount: 1500000,
      useUsageMonths: true,
      minUsageMonths: 6,
      useVisitCount: true,
      minVisitCount: 50,
      criteriaOperator: DEFAULT_CRITERIA_OPERATOR,
    },
    mileageRate: 2,
    discountRate: 5,
    benefits: ['5% 할인', '생일 혜택'],
  },
  {
    code: 'silver',
    name: '실버',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    sortOrder: 4,
    count: 0,
    criteria: {
      usePaymentAmount: true,
      minPaymentAmount: 500000,
      useUsageMonths: true,
      minUsageMonths: 3,
      useVisitCount: true,
      minVisitCount: 20,
      criteriaOperator: DEFAULT_CRITERIA_OPERATOR,
    },
    mileageRate: 1,
    discountRate: 0,
    benefits: ['생일 혜택'],
  },
  {
    code: 'bronze',
    name: '브론즈',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    sortOrder: 5,
    count: 0,
    criteria: {
      usePaymentAmount: true,
      minPaymentAmount: 0,
      useUsageMonths: true,
      minUsageMonths: 0,
      useVisitCount: true,
      minVisitCount: 0,
      criteriaOperator: DEFAULT_CRITERIA_OPERATOR,
    },
    mileageRate: 0.5,
    discountRate: 0,
    benefits: ['기본 서비스'],
  },
];

const FALLBACK_GRADE_MEMBERS: Record<string, GradeMember[]> = {
  다이아몬드: [
    { name: '김민준', visits: 244, usageMonths: 18, paymentAmount: 6200000, contract: '프리미엄 PT 12개월' },
    { name: '정서윤', visits: 228, usageMonths: 15, paymentAmount: 5800000, contract: '골프+PT 패키지' },
  ],
  플래티넘: [
    { name: '이서연', visits: 164, usageMonths: 12, paymentAmount: 3800000, contract: 'PT 24회' },
    { name: '박현우', visits: 121, usageMonths: 10, paymentAmount: 3400000, contract: '헬스 12개월' },
  ],
  골드: [
    { name: '최유리', visits: 88, usageMonths: 7, paymentAmount: 1800000, contract: '헬스 6개월' },
    { name: '장도윤', visits: 71, usageMonths: 6, paymentAmount: 1600000, contract: '요가 48회' },
  ],
  실버: [
    { name: '한지민', visits: 36, usageMonths: 4, paymentAmount: 700000, contract: '필라테스 24회' },
    { name: '오지훈', visits: 24, usageMonths: 3, paymentAmount: 520000, contract: '헬스 3개월' },
  ],
  브론즈: [
    { name: '문서아', visits: 8, usageMonths: 1, paymentAmount: 120000, contract: '체험권' },
    { name: '임민재', visits: 3, usageMonths: 1, paymentAmount: 90000, contract: '헬스 1개월' },
  ],
};

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBenefits(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  return fallback;
}

function createCriteriaDraft(grades: GradeItem[]): Record<string, GradeCriteria> {
  return Object.fromEntries(
    grades.map((grade) => [grade.code, { ...grade.criteria }])
  );
}

function normalizeRuleRow(row: GradeRuleRow): GradeItem {
  const fallback = DEFAULT_GRADES.find((grade) => grade.code === row.gradeCode) ?? DEFAULT_GRADES[DEFAULT_GRADES.length - 1];
  const criteriaOperator = row.criteriaOperator === 'OR' ? 'OR' : 'AND';

  return {
    id: row.id,
    code: row.gradeCode,
    name: row.gradeName || fallback.name,
    color: row.colorClass || fallback.color,
    sortOrder: Number(row.sortOrder || fallback.sortOrder),
    count: Number(row.currentMemberCount ?? 0),
    criteria: {
      usePaymentAmount: row.usePaymentAmount ?? fallback.criteria.usePaymentAmount,
      minPaymentAmount: toNumber(row.minPaymentAmount),
      useUsageMonths: row.useUsageMonths ?? fallback.criteria.useUsageMonths,
      minUsageMonths: Number(row.minUsageMonths ?? fallback.criteria.minUsageMonths),
      useVisitCount: row.useVisitCount ?? fallback.criteria.useVisitCount,
      minVisitCount: Number(row.minVisitCount ?? fallback.criteria.minVisitCount),
      criteriaOperator,
    },
    mileageRate: toNumber(row.mileageRate),
    discountRate: toNumber(row.discountRate),
    benefits: parseBenefits(row.benefits, fallback.benefits),
  };
}

function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatCriteria(criteria: GradeCriteria): string {
  const parts: string[] = [];
  if (criteria.usePaymentAmount) parts.push(`결제 ${formatWon(criteria.minPaymentAmount)} 이상`);
  if (criteria.useUsageMonths) parts.push(`이용 ${criteria.minUsageMonths.toLocaleString('ko-KR')}개월 이상`);
  if (criteria.useVisitCount) parts.push(`방문 ${criteria.minVisitCount.toLocaleString('ko-KR')}회 이상`);

  if (parts.length === 0) return '기준 미설정';
  return parts.join(criteria.criteriaOperator === 'AND' ? ' + ' : ' 또는 ');
}

function getActiveCriterionCount(criteria: GradeCriteria): number {
  return [criteria.usePaymentAmount, criteria.useUsageMonths, criteria.useVisitCount].filter(Boolean).length;
}

function matchesGrade(criteria: GradeCriteria, metric: { paymentAmount: number; usageMonths: number; visits: number }): boolean {
  const checks: boolean[] = [];
  if (criteria.usePaymentAmount) checks.push(metric.paymentAmount >= criteria.minPaymentAmount);
  if (criteria.useUsageMonths) checks.push(metric.usageMonths >= criteria.minUsageMonths);
  if (criteria.useVisitCount) checks.push(metric.visits >= criteria.minVisitCount);
  if (checks.length === 0) return false;

  return criteria.criteriaOperator === 'OR' ? checks.some(Boolean) : checks.every(Boolean);
}

function validateGradeCriteria(grades: GradeItem[], draft: Record<string, GradeCriteria>): string | null {
  for (const grade of grades) {
    const criteria = draft[grade.code] ?? grade.criteria;
    if (getActiveCriterionCount(criteria) === 0) {
      return `${grade.name} 등급은 최소 1개 기준을 선택해야 합니다.`;
    }

    if (criteria.minPaymentAmount < 0 || criteria.minUsageMonths < 0 || criteria.minVisitCount < 0) {
      return '기준값은 0 이상 입력해주세요.';
    }
  }

  const checks: Array<{ key: keyof GradeCriteria; enabled: keyof GradeCriteria; label: string }> = [
    { key: 'minPaymentAmount', enabled: 'usePaymentAmount', label: '누적 결제금액' },
    { key: 'minUsageMonths', enabled: 'useUsageMonths', label: '총 이용기간' },
    { key: 'minVisitCount', enabled: 'useVisitCount', label: '누적 방문횟수' },
  ];

  for (let i = 0; i < grades.length - 1; i += 1) {
    const upper = draft[grades[i].code] ?? grades[i].criteria;
    const lower = draft[grades[i + 1].code] ?? grades[i + 1].criteria;

    for (const check of checks) {
      if (upper[check.enabled] && lower[check.enabled]) {
        const upperValue = Number(upper[check.key]);
        const lowerValue = Number(lower[check.key]);
        if (upperValue <= lowerValue) {
          return `${check.label}: 상위 등급(${grades[i].name})은 하위 등급(${grades[i + 1].name})보다 기준이 커야 합니다.`;
        }
      }
    }
  }

  return null;
}

function buildRulePayload(grade: GradeItem, branchId: number) {
  return {
    branchId,
    gradeCode: grade.code,
    gradeName: grade.name,
    sortOrder: grade.sortOrder,
    colorClass: grade.color,
    minPaymentAmount: grade.criteria.minPaymentAmount,
    minUsageMonths: grade.criteria.minUsageMonths,
    minVisitCount: grade.criteria.minVisitCount,
    usePaymentAmount: grade.criteria.usePaymentAmount,
    useUsageMonths: grade.criteria.useUsageMonths,
    useVisitCount: grade.criteria.useVisitCount,
    criteriaOperator: grade.criteria.criteriaOperator,
    mileageRate: grade.mileageRate,
    discountRate: grade.discountRate,
    benefits: grade.benefits,
    currentMemberCount: grade.count,
  };
}

function calculateUsageMonthsFromDates(member: MemberRow): number {
  if (!member.membershipStart || !member.membershipExpiry) return 0;

  const start = new Date(member.membershipStart);
  const end = new Date(member.membershipExpiry);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;

  const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(diffMonths, 0);
}

function attachMemberSnapshot(grades: GradeItem[], members: MemberRow[], sales: SaleRow[], attendance: AttendanceRow[]) {
  const visitsByMember = new Map<number, number>();
  attendance.forEach((row) => {
    visitsByMember.set(row.memberId, (visitsByMember.get(row.memberId) ?? 0) + 1);
  });

  const paymentByMember = new Map<number, number>();
  const usageByMember = new Map<number, number>();
  const lastContractByMember = new Map<number, string>();

  sales
    .filter((row) => row.status === 'COMPLETED')
    .sort((a, b) => String(a.saleDate ?? '').localeCompare(String(b.saleDate ?? '')))
    .forEach((row) => {
      paymentByMember.set(row.memberId, (paymentByMember.get(row.memberId) ?? 0) + toNumber(row.amount));
      usageByMember.set(row.memberId, (usageByMember.get(row.memberId) ?? 0) + Number(row.durationMonths ?? 0));
      if (row.productName) lastContractByMember.set(row.memberId, row.productName);
    });

  const membersByGrade: Record<string, GradeMember[]> = Object.fromEntries(grades.map((grade) => [grade.name, []]));

  members.forEach((member) => {
    const metric = {
      paymentAmount: paymentByMember.get(member.id) ?? 0,
      usageMonths: usageByMember.get(member.id) || calculateUsageMonthsFromDates(member),
      visits: visitsByMember.get(member.id) ?? 0,
    };
    const matchedGrade = grades.find((grade) => matchesGrade(grade.criteria, metric)) ?? grades[grades.length - 1];

    membersByGrade[matchedGrade.name] = [
      ...(membersByGrade[matchedGrade.name] ?? []),
      {
        name: member.name,
        visits: metric.visits,
        usageMonths: metric.usageMonths,
        paymentAmount: metric.paymentAmount,
        contract: lastContractByMember.get(member.id) ?? member.membershipType ?? '이용권 없음',
      },
    ];
  });

  return grades.map((grade) => ({
    ...grade,
    count: membersByGrade[grade.name]?.length ?? 0,
  }));
}

export default function GradeManagePage() {
  const [branchId, setBranchId] = useState(1);
  const [grades, setGrades] = useState<GradeItem[]>(DEFAULT_GRADES);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCriteriaOpen, setIsCriteriaOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeItem | null>(null);
  const [viewingMembersGrade, setViewingMembersGrade] = useState<GradeItem | null>(null);
  const [refreshCycle, setRefreshCycle] = useState<RefreshCycle>('월간');
  const [newBenefit, setNewBenefit] = useState('');
  const [criteriaDraft, setCriteriaDraft] = useState<Record<string, GradeCriteria>>(createCriteriaDraft(DEFAULT_GRADES));
  const [gradeMembers, setGradeMembers] = useState<Record<string, GradeMember[]>>(FALLBACK_GRADE_MEMBERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [isSavingBenefits, setIsSavingBenefits] = useState(false);

  useEffect(() => {
    setBranchId(getScopedBranchId());
  }, []);

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.name === selected) ?? null,
    [grades, selected]
  );

  const loadMemberSnapshot = useCallback(async (baseGrades: GradeItem[]) => {
    const [memberResult, saleResult, attendanceResult] = await Promise.all([
      supabase
        .from('members')
        .select('id, name, registeredAt, membershipType, membershipStart, membershipExpiry')
        .eq('branchId', branchId)
        .is('deletedAt', null),
      supabase
        .from('sales')
        .select('memberId, amount, status, durationMonths, productName, saleDate')
        .eq('branchId', branchId),
      supabase
        .from('attendance')
        .select('memberId')
        .eq('branchId', branchId),
    ]);

    if (memberResult.error || saleResult.error || attendanceResult.error) {
      return {
        grades: baseGrades.map((grade) => ({
          ...grade,
          count: grade.count || FALLBACK_GRADE_MEMBERS[grade.name]?.length || 0,
        })),
        membersByGrade: FALLBACK_GRADE_MEMBERS,
      };
    }

    const members = (memberResult.data ?? []) as MemberRow[];
    const sales = (saleResult.data ?? []) as SaleRow[];
    const attendance = (attendanceResult.data ?? []) as AttendanceRow[];
    const countedGrades = attachMemberSnapshot(baseGrades, members, sales, attendance);
    const membersByGrade: Record<string, GradeMember[]> = Object.fromEntries(countedGrades.map((grade) => [grade.name, []]));

    const visitsByMember = new Map<number, number>();
    attendance.forEach((row) => {
      visitsByMember.set(row.memberId, (visitsByMember.get(row.memberId) ?? 0) + 1);
    });

    const paymentByMember = new Map<number, number>();
    const usageByMember = new Map<number, number>();
    const lastContractByMember = new Map<number, string>();

    sales
      .filter((row) => row.status === 'COMPLETED')
      .sort((a, b) => String(a.saleDate ?? '').localeCompare(String(b.saleDate ?? '')))
      .forEach((row) => {
        paymentByMember.set(row.memberId, (paymentByMember.get(row.memberId) ?? 0) + toNumber(row.amount));
        usageByMember.set(row.memberId, (usageByMember.get(row.memberId) ?? 0) + Number(row.durationMonths ?? 0));
        if (row.productName) lastContractByMember.set(row.memberId, row.productName);
      });

    members.forEach((member) => {
      const metric = {
        paymentAmount: paymentByMember.get(member.id) ?? 0,
        usageMonths: usageByMember.get(member.id) || calculateUsageMonthsFromDates(member),
        visits: visitsByMember.get(member.id) ?? 0,
      };
      const matchedGrade = countedGrades.find((grade) => matchesGrade(grade.criteria, metric)) ?? countedGrades[countedGrades.length - 1];
      membersByGrade[matchedGrade.name] = [
        ...(membersByGrade[matchedGrade.name] ?? []),
        {
          name: member.name,
          visits: metric.visits,
          usageMonths: metric.usageMonths,
          paymentAmount: metric.paymentAmount,
          contract: lastContractByMember.get(member.id) ?? member.membershipType ?? '이용권 없음',
        },
      ];
    });

    return { grades: countedGrades, membersByGrade };
  }, [branchId]);

  const loadGradePolicy = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingResult, ruleResult] = await Promise.all([
        supabase
          .from('member_grade_settings')
          .select('refreshCycle')
          .eq('branchId', branchId)
          .maybeSingle(),
        supabase
          .from('member_grade_rules')
          .select('*')
          .eq('branchId', branchId)
          .order('sortOrder', { ascending: true }),
      ]);

      const settingError = settingResult.error;
      const ruleError = ruleResult.error;
      if (settingError || ruleError) {
        throw settingError ?? ruleError;
      }

      const nextCycle = (settingResult.data?.refreshCycle as RefreshCycle | undefined) ?? '월간';
      const ruleRows = (ruleResult.data ?? []) as GradeRuleRow[];
      const nextGrades = ruleRows.length > 0
        ? ruleRows.map(normalizeRuleRow).sort((a, b) => a.sortOrder - b.sortOrder)
        : DEFAULT_GRADES;

      const snapshot = await loadMemberSnapshot(nextGrades);
      setGrades(snapshot.grades);
      setGradeMembers(snapshot.membersByGrade);
      setCriteriaDraft(createCriteriaDraft(snapshot.grades));
      setRefreshCycle(nextCycle);
    } catch (error) {
      console.error('Failed to load member grade policy', error);
      const fallbackSnapshot = await loadMemberSnapshot(DEFAULT_GRADES);
      setGrades(fallbackSnapshot.grades);
      setGradeMembers(fallbackSnapshot.membersByGrade);
      setCriteriaDraft(createCriteriaDraft(fallbackSnapshot.grades));
      toast.error('등급 기준 DB를 불러오지 못해 기본값으로 표시합니다.');
    } finally {
      setIsLoading(false);
    }
  }, [branchId, loadMemberSnapshot]);

  useEffect(() => {
    void loadGradePolicy();
  }, [loadGradePolicy]);

  const persistGradePolicy = async (nextGrades: GradeItem[], nextRefreshCycle: RefreshCycle) => {
    const [settingResult, ruleResult] = await Promise.all([
      supabase
        .from('member_grade_settings')
        .upsert(
          {
            branchId,
            refreshCycle: nextRefreshCycle,
            downgradeProtection: true,
          },
          { onConflict: 'branchId' }
        ),
      supabase
        .from('member_grade_rules')
        .upsert(nextGrades.map((grade) => buildRulePayload(grade, branchId)), { onConflict: 'branchId,gradeCode' }),
    ]);

    if (settingResult.error || ruleResult.error) {
      throw settingResult.error ?? ruleResult.error;
    }
  };

  const handleSaveCriteria = async () => {
    const validationMessage = validateGradeCriteria(grades, criteriaDraft);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const nextGrades = grades.map((grade) => ({
      ...grade,
      criteria: criteriaDraft[grade.code] ?? grade.criteria,
    }));

    setIsSavingCriteria(true);
    try {
      await persistGradePolicy(nextGrades, refreshCycle);
      setIsCriteriaOpen(false);
      toast.success('등급 기준이 저장되었습니다.');
      await loadGradePolicy();
    } catch (error) {
      console.error('Failed to save member grade criteria', error);
      toast.error('등급 기준 저장에 실패했습니다.');
    } finally {
      setIsSavingCriteria(false);
    }
  };

  const handleSaveBenefits = async () => {
    if (!editingGrade) return;

    if (editingGrade.mileageRate < 0 || editingGrade.discountRate < 0) {
      toast.error('0 이상 입력해주세요.');
      return;
    }
    if (editingGrade.mileageRate > 10) {
      toast.error('마일리지 적립률은 10% 이하로 입력해주세요.');
      return;
    }
    if (editingGrade.discountRate > 100) {
      toast.error('할인율은 100% 이하로 입력해주세요.');
      return;
    }

    const nextGrades = grades.map((grade) => (grade.code === editingGrade.code ? editingGrade : grade));

    setIsSavingBenefits(true);
    try {
      await persistGradePolicy(nextGrades, refreshCycle);
      setGrades(nextGrades);
      setEditingGrade(null);
      setNewBenefit('');
      toast.success('등급 혜택이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save member grade benefits', error);
      toast.error('등급 혜택 저장에 실패했습니다.');
    } finally {
      setIsSavingBenefits(false);
    }
  };

  const updateCriteriaDraft = (gradeCode: string, patch: Partial<GradeCriteria>) => {
    setCriteriaDraft((prev) => {
      const current = prev[gradeCode] ?? grades.find((grade) => grade.code === gradeCode)?.criteria ?? DEFAULT_GRADES[0].criteria;
      return {
        ...prev,
        [gradeCode]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <PageHeader
          title="등급 관리"
          description="회원 등급 기준과 혜택을 설정합니다"
          actions={
            <Button variant="outline" size="sm" icon={<Settings className="w-4 h-4" />} onClick={() => setIsCriteriaOpen(true)}>
              등급 기준 설정
            </Button>
          }
        />

        <StatCardGrid cols={3}>
          <StatCard label="등급 수" value={grades.length} icon={<Star size={20} />} />
          <StatCard label="전체 등급 회원" value={grades.reduce((acc, grade) => acc + grade.count, 0)} icon={<Users size={20} />} variant="mint" />
          <StatCard label="갱신 주기" value={refreshCycle} icon={<Settings size={20} />} variant="peach" />
        </StatCardGrid>

        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">등급 기준을 불러오는 중입니다.</div>
        ) : (
          <div className="space-y-3">
            {grades.map((grade) => (
              <div
                key={grade.code}
                onClick={() => setSelected(selected === grade.name ? null : grade.name)}
                className={`bg-white rounded-xl border cursor-pointer transition-all ${selected === grade.name ? 'border-blue-400 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center justify-between p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold border ${grade.color}`}>{grade.name}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{formatCriteria(grade.criteria)}</p>
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
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">마일리지 적립 {grade.mileageRate}%</span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">이용권 할인 {grade.discountRate}%</span>
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                        {grade.criteria.criteriaOperator === 'AND' ? '모든 기준 충족' : '기준 중 하나 충족'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">혜택</p>
                    <div className="flex flex-wrap gap-2">
                      {grade.benefits.map((benefit) => (
                        <span key={benefit} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{benefit}</span>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditingGrade({ ...grade, benefits: [...grade.benefits] }); }} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">혜택 편집</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setViewingMembersGrade(grade); }} className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">해당 회원 보기</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isCriteriaOpen}
        onClose={() => setIsCriteriaOpen(false)}
        title="등급 기준 설정"
        size="xl"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setIsCriteriaOpen(false)}>닫기</Button>
            <Button onClick={handleSaveCriteria} disabled={isSavingCriteria}>{isSavingCriteria ? '저장 중' : '저장'}</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
            <p className="text-xs text-content-secondary">등급 갱신 주기</p>
            <div className="mt-sm flex gap-sm">
              {(['월간', '분기', '연간'] as RefreshCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setRefreshCycle(cycle)}
                  className={`rounded-lg px-3 py-2 text-sm ${refreshCycle === cycle ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-sm">
            {grades.map((grade) => {
              const draft = criteriaDraft[grade.code] ?? grade.criteria;
              return (
                <div key={grade.code} className="rounded-xl border border-line p-md">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div>
                      <p className="text-sm font-semibold text-content">{grade.name}</p>
                      <p className="text-xs text-content-secondary">결제 금액, 이용 기간, 방문 횟수 중 필요한 기준을 선택합니다.</p>
                    </div>
                    <select
                      value={draft.criteriaOperator}
                      onChange={(event) => updateCriteriaDraft(grade.code, { criteriaOperator: event.target.value as CriteriaOperator })}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="AND">모든 기준 충족</option>
                      <option value="OR">기준 중 하나 충족</option>
                    </select>
                  </div>

                  <div className="mt-md grid gap-sm md:grid-cols-3">
                    <label className="rounded-lg border border-gray-200 bg-white p-sm">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={draft.usePaymentAmount}
                          onChange={(event) => updateCriteriaDraft(grade.code, { usePaymentAmount: event.target.checked })}
                        />
                        누적 결제금액
                      </span>
                      <div className="mt-xs flex items-center gap-xs">
                        <input
                          type="number"
                          min={0}
                          step={10000}
                          disabled={!draft.usePaymentAmount}
                          value={draft.minPaymentAmount}
                          onChange={(event) => updateCriteriaDraft(grade.code, { minPaymentAmount: Number(event.target.value) || 0 })}
                          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-500">원</span>
                      </div>
                    </label>

                    <label className="rounded-lg border border-gray-200 bg-white p-sm">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={draft.useUsageMonths}
                          onChange={(event) => updateCriteriaDraft(grade.code, { useUsageMonths: event.target.checked })}
                        />
                        총 이용기간
                      </span>
                      <div className="mt-xs flex items-center gap-xs">
                        <input
                          type="number"
                          min={0}
                          disabled={!draft.useUsageMonths}
                          value={draft.minUsageMonths}
                          onChange={(event) => updateCriteriaDraft(grade.code, { minUsageMonths: Number(event.target.value) || 0 })}
                          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-500">개월</span>
                      </div>
                    </label>

                    <label className="rounded-lg border border-gray-200 bg-white p-sm">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                        <input
                          type="checkbox"
                          checked={draft.useVisitCount}
                          onChange={(event) => updateCriteriaDraft(grade.code, { useVisitCount: event.target.checked })}
                        />
                        누적 방문횟수
                      </span>
                      <div className="mt-xs flex items-center gap-xs">
                        <input
                          type="number"
                          min={0}
                          disabled={!draft.useVisitCount}
                          value={draft.minVisitCount}
                          onChange={(event) => updateCriteriaDraft(grade.code, { minVisitCount: Number(event.target.value) || 0 })}
                          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="text-sm text-gray-500">회</span>
                      </div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editingGrade !== null}
        onClose={() => {
          setEditingGrade(null);
          setNewBenefit('');
        }}
        title={editingGrade ? `${editingGrade.name} 혜택 편집` : '혜택 편집'}
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => {
              setEditingGrade(null);
              setNewBenefit('');
            }}>취소</Button>
            <Button onClick={handleSaveBenefits} disabled={isSavingBenefits}>{isSavingBenefits ? '저장 중' : '저장'}</Button>
          </div>
        }
      >
        {editingGrade && (
          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="text-xs font-semibold text-content-secondary">마일리지 적립률 (%)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={editingGrade.mileageRate}
                  onChange={(event) => setEditingGrade({ ...editingGrade, mileageRate: Number(event.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-content-tertiary">최대 10%까지 입력 가능</p>
              </div>
              <div className="space-y-xs">
                <label className="text-xs font-semibold text-content-secondary">이용권 할인율 (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editingGrade.discountRate}
                  onChange={(event) => setEditingGrade({ ...editingGrade, discountRate: Number(event.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-content-tertiary">최대 100%까지 입력 가능</p>
              </div>
            </div>
            <div className="flex gap-sm">
              <input
                type="text"
                value={newBenefit}
                onChange={(event) => setNewBenefit(event.target.value)}
                placeholder="새 혜택 입력"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm"
              />
              <Button
                variant="outline"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  if (!newBenefit.trim()) return;
                  setEditingGrade({ ...editingGrade, benefits: [...editingGrade.benefits, newBenefit.trim()] });
                  setNewBenefit('');
                }}
              >
                추가
              </Button>
            </div>
            <div className="space-y-sm">
              {editingGrade.benefits.map((benefit) => (
                <div key={benefit} className="flex items-center justify-between rounded-xl border border-line bg-surface-secondary/50 px-md py-sm">
                  <span className="text-sm text-content">{benefit}</span>
                  <button
                    type="button"
                    onClick={() => setEditingGrade({ ...editingGrade, benefits: editingGrade.benefits.filter((item) => item !== benefit) })}
                    className="rounded-md p-1 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={viewingMembersGrade !== null}
        onClose={() => setViewingMembersGrade(null)}
        title={viewingMembersGrade ? `${viewingMembersGrade.name} 회원 목록` : '회원 목록'}
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewingMembersGrade(null)}>닫기</Button>
          </div>
        }
      >
        {viewingMembersGrade && (
          <div className="space-y-sm">
            {(gradeMembers[viewingMembersGrade.name] ?? []).length === 0 ? (
              <div className="rounded-xl border border-line p-md text-sm text-content-secondary">해당 등급 회원이 없습니다.</div>
            ) : (
              (gradeMembers[viewingMembersGrade.name] ?? []).map((member) => (
                <div key={`${member.name}-${member.visits}-${member.paymentAmount}`} className="rounded-xl border border-line p-md">
                  <p className="text-sm font-semibold text-content">{member.name}</p>
                  <p className="mt-xs text-xs text-content-secondary">
                    누적 결제 {formatWon(member.paymentAmount)} · 이용 {member.usageMonths}개월 · 방문 {member.visits}회
                  </p>
                  <p className="mt-1 text-xs text-content-tertiary">최근 이용권 {member.contract}</p>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
