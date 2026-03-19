/**
 * 비즈니스 로직 유틸리티
 * - 이용권 만료 → 회원 상태 변경
 * - 출석 시 잔여횟수 차감
 * - 홀딩 잔여일수 계산/연장
 * - 결제 후 이용권 시작/종료일 자동 설정
 * - 마일리지 자동 적립/차감
 * - 락커 만료 자동 처리
 * - 쿠폰 만료 자동 처리
 * - 중복 결제/등록 방지
 */
import { supabase } from './supabase';

/** branchId 가져오기 */
const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// ─── 1. 이용권 만료 → 회원 상태 자동 변경 ───────────────────────
/** 만료된 이용권의 회원 상태를 EXPIRED로 변경 (배치/초기화 시 호출) */
export const syncExpiredMembers = async (): Promise<number> => {
  const branchId = getBranchId();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('members')
    .update({ status: 'EXPIRED', updatedAt: new Date().toISOString() })
    .eq('branchId', branchId)
    .eq('status', 'ACTIVE')
    .lt('membershipExpiry', `${today}T00:00:00`)
    .not('membershipExpiry', 'is', null)
    .select('id');

  if (error) {
    console.error('만료 회원 동기화 실패:', error.message);
    return 0;
  }
  return data?.length ?? 0;
};

// ─── 2. 출석 시 잔여횟수 차감 ────────────────────────────────
/** PT/GX 출석 시 해당 회원의 잔여 세션 차감 */
export const deductSession = async (
  memberId: number,
  type: 'PT' | 'GX'
): Promise<{ success: boolean; remaining?: number; message?: string }> => {
  // contracts 테이블에서 해당 회원의 활성 계약 조회
  const branchId = getBranchId();
  const now = new Date().toISOString();

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, remainingSessions, productName')
    .eq('branchId', branchId)
    .eq('memberId', memberId)
    .gt('remainingSessions', 0)
    .lte('startDate', now)
    .or(`endDate.gt.${now},endDate.is.null`)
    .order('startDate', { ascending: true })
    .limit(1);

  if (error || !contracts || contracts.length === 0) {
    // 잔여 세션이 있는 계약이 없으면 차감 없이 통과 (기간제 이용권일 수 있음)
    return { success: true, message: '차감 대상 계약 없음 (기간제)' };
  }

  const contract = contracts[0];
  const remaining = Number(contract.remainingSessions) - 1;

  const { error: updateError } = await supabase
    .from('contracts')
    .update({ remainingSessions: remaining })
    .eq('id', contract.id);

  if (updateError) {
    return { success: false, message: '세션 차감 실패: ' + updateError.message };
  }

  return { success: true, remaining, message: `${contract.productName} 잔여 ${remaining}회` };
};

// ─── 3. 홀딩 처리: 잔여일수 계산 + 종료일 연장 ─────────────────
/** 홀딩 시작: 회원 상태를 HOLDING으로 변경 */
export const startHolding = async (
  memberId: number,
  holdDays: number,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const { data: member, error: fetchError } = await supabase
    .from('members')
    .select('status, membershipExpiry')
    .eq('id', memberId)
    .single();

  if (fetchError || !member) {
    return { success: false, message: '회원 정보 조회 실패' };
  }

  if (member.status !== 'ACTIVE') {
    return { success: false, message: '활성 상태의 회원만 홀딩이 가능합니다.' };
  }

  const { error } = await supabase
    .from('members')
    .update({
      status: 'HOLDING',
      memo: `홀딩 ${holdDays}일${reason ? ' - ' + reason : ''} (원래 만료: ${member.membershipExpiry ?? 'N/A'})`,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    return { success: false, message: '홀딩 처리 실패: ' + error.message };
  }

  return { success: true, message: `${holdDays}일 홀딩이 시작되었습니다.` };
};

/** 홀딩 해제: 상태 ACTIVE + 종료일 연장 */
export const endHolding = async (
  memberId: number,
  holdDays: number
): Promise<{ success: boolean; newExpiry?: string; message: string }> => {
  const { data: member, error: fetchError } = await supabase
    .from('members')
    .select('status, membershipExpiry')
    .eq('id', memberId)
    .single();

  if (fetchError || !member) {
    return { success: false, message: '회원 정보 조회 실패' };
  }

  if (member.status !== 'HOLDING') {
    return { success: false, message: '홀딩 중인 회원만 해제가 가능합니다.' };
  }

  // 홀딩 일수만큼 종료일 연장
  let newExpiry = member.membershipExpiry;
  if (member.membershipExpiry) {
    const expiry = new Date(member.membershipExpiry);
    expiry.setDate(expiry.getDate() + holdDays);
    newExpiry = expiry.toISOString();
  }

  const { error } = await supabase
    .from('members')
    .update({
      status: 'ACTIVE',
      membershipExpiry: newExpiry,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    return { success: false, message: '홀딩 해제 실패: ' + error.message };
  }

  return {
    success: true,
    newExpiry: newExpiry ?? undefined,
    message: `홀딩이 해제되었습니다. 종료일이 ${holdDays}일 연장되었습니다.`,
  };
};

// ─── 4. 순매출 계산 (환불 건 반영) ───────────────────────────
/** 매출 통계에서 환불 건을 반영한 순매출 계산 */
export const getNetSalesStats = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  grossSales: number;
  refundAmount: number;
  netSales: number;
  completedCount: number;
  refundCount: number;
}> => {
  const branchId = getBranchId();

  let completedQuery = supabase
    .from('sales')
    .select('amount')
    .eq('branchId', branchId)
    .eq('status', 'COMPLETED');

  let refundQuery = supabase
    .from('sales')
    .select('amount')
    .eq('branchId', branchId)
    .eq('status', 'REFUNDED');

  if (params?.startDate) {
    completedQuery = completedQuery.gte('saleDate', params.startDate);
    refundQuery = refundQuery.gte('saleDate', params.startDate);
  }
  if (params?.endDate) {
    completedQuery = completedQuery.lte('saleDate', params.endDate);
    refundQuery = refundQuery.lte('saleDate', params.endDate);
  }

  const [{ data: completed }, { data: refunded }] = await Promise.all([
    completedQuery,
    refundQuery,
  ]);

  const grossSales = (completed ?? []).reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
  const refundAmount = (refunded ?? []).reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);

  return {
    grossSales,
    refundAmount,
    netSales: grossSales - refundAmount,
    completedCount: completed?.length ?? 0,
    refundCount: refunded?.length ?? 0,
  };
};

// ─── 7. 마일리지 적립/차감 ──────────────────────────────────
/** 결제 완료 시 마일리지 자동 적립 (결제금액의 1%) */
export const accruePoints = async (
  memberId: number,
  paymentAmount: number,
  rate: number = 0.01
): Promise<{ success: boolean; accrued: number; newBalance?: number }> => {
  const accrued = Math.floor(paymentAmount * rate);
  if (accrued <= 0) return { success: true, accrued: 0 };

  const { data: member, error: fetchErr } = await supabase
    .from('members')
    .select('mileage')
    .eq('id', memberId)
    .single();

  if (fetchErr || !member) {
    return { success: false, accrued: 0 };
  }

  const newBalance = (Number(member.mileage) || 0) + accrued;

  const { error } = await supabase
    .from('members')
    .update({ mileage: newBalance, updatedAt: new Date().toISOString() })
    .eq('id', memberId);

  if (error) return { success: false, accrued };
  return { success: true, accrued, newBalance };
};

/** 마일리지 차감 (마일리지 결제 시) */
export const deductPoints = async (
  memberId: number,
  amount: number
): Promise<{ success: boolean; newBalance?: number; message?: string }> => {
  const { data: member, error: fetchErr } = await supabase
    .from('members')
    .select('mileage')
    .eq('id', memberId)
    .single();

  if (fetchErr || !member) {
    return { success: false, message: '회원 정보 조회 실패' };
  }

  const current = Number(member.mileage) || 0;
  if (current < amount) {
    return { success: false, message: `마일리지 부족 (보유: ${current}, 필요: ${amount})` };
  }

  const newBalance = current - amount;
  const { error } = await supabase
    .from('members')
    .update({ mileage: newBalance, updatedAt: new Date().toISOString() })
    .eq('id', memberId);

  if (error) return { success: false, message: '마일리지 차감 실패' };
  return { success: true, newBalance };
};

// ─── 8. 결제 후 이용권 시작/종료일 자동 설정 ────────────────────
/** 계약 완료 후 회원의 membershipStart/Expiry 업데이트 */
export const updateMembershipPeriod = async (
  memberId: number,
  startDate: string,
  endDate: string,
  productName?: string
): Promise<{ success: boolean; message: string }> => {
  const { error } = await supabase
    .from('members')
    .update({
      membershipStart: startDate,
      membershipExpiry: endDate,
      membershipType: productName || undefined,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', memberId);

  if (error) {
    return { success: false, message: '이용권 기간 설정 실패: ' + error.message };
  }

  return { success: true, message: '이용권 기간이 설정되었습니다.' };
};

// ─── 9. 락커 만료 자동 처리 ─────────────────────────────────
/** 만료된 락커를 AVAILABLE로 변경 (배치/초기화 시 호출) */
export const syncExpiredLockers = async (): Promise<number> => {
  const branchId = getBranchId();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('lockers')
    .update({
      status: 'AVAILABLE',
      memberId: null,
      memberName: null,
      assignedAt: null,
      expiresAt: null,
    })
    .eq('branchId', branchId)
    .eq('status', 'IN_USE')
    .lt('expiresAt', now)
    .not('expiresAt', 'is', null)
    .select('id');

  if (error) {
    console.error('만료 락커 동기화 실패:', error.message);
    return 0;
  }
  return data?.length ?? 0;
};

// ─── 6. 쿠폰 만료 자동 처리 ────────────────────────────────
/** 만료된 쿠폰 상태를 비활성화 (배치/초기화 시 호출) */
export const syncExpiredCoupons = async (): Promise<number> => {
  const branchId = getBranchId();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('settings')
    .select('id, value')
    .eq('branchId', branchId)
    .eq('key', 'coupons');

  if (error || !data || data.length === 0) return 0;

  let expiredCount = 0;
  for (const row of data) {
    try {
      const coupons = JSON.parse(row.value);
      if (!Array.isArray(coupons)) continue;

      let changed = false;
      for (const coupon of coupons) {
        if (coupon.isActive && coupon.endDate && coupon.endDate < today) {
          coupon.isActive = false;
          changed = true;
          expiredCount++;
        }
      }

      if (changed) {
        await supabase
          .from('settings')
          .update({ value: JSON.stringify(coupons) })
          .eq('id', row.id);
      }
    } catch {
      // JSON 파싱 실패 시 무시
    }
  }
  return expiredCount;
};

// ─── 11. 중복 결제/등록 방지 ────────────────────────────────
/** 동일 회원+상품 중복 결제 확인 (최근 5분 이내) */
export const checkDuplicatePayment = async (
  memberId: number,
  amount: number
): Promise<{ isDuplicate: boolean; message?: string }> => {
  const branchId = getBranchId();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('sales')
    .select('id, saleDate')
    .eq('branchId', branchId)
    .eq('memberId', memberId)
    .eq('amount', amount)
    .eq('status', 'COMPLETED')
    .gte('saleDate', fiveMinAgo)
    .limit(1);

  if (error) return { isDuplicate: false };

  if (data && data.length > 0) {
    return {
      isDuplicate: true,
      message: '최근 5분 이내 동일한 금액의 결제가 이미 처리되었습니다. 중복 결제인지 확인해주세요.',
    };
  }
  return { isDuplicate: false };
};

/** 동일 전화번호 회원 중복 등록 확인 */
export const checkDuplicateMember = async (
  phone: string,
  excludeId?: number
): Promise<{ isDuplicate: boolean; existingName?: string }> => {
  const branchId = getBranchId();

  let query = supabase
    .from('members')
    .select('id, name')
    .eq('branchId', branchId)
    .eq('phone', phone)
    .is('deletedAt', null)
    .limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error) return { isDuplicate: false };

  if (data && data.length > 0) {
    return { isDuplicate: true, existingName: data[0].name };
  }
  return { isDuplicate: false };
};

// ─── FN-045. FC 즐겨찾기 회원 오늘 방문 조회 ────────────────────
/** 즐겨찾기 회원 중 오늘 출석한 회원 목록 반환 */
export const getFavoriteVisitsToday = async (): Promise<{ id: number; name: string }[]> => {
  const branchId = getBranchId();
  const today = new Date().toISOString().slice(0, 10);

  // 즐겨찾기 목록 조회
  const { data: favData } = await supabase
    .from('settings')
    .select('value')
    .eq('branchId', branchId)
    .eq('key', 'favorites')
    .single();

  if (!favData?.value) return [];

  let favIds: number[] = [];
  try { favIds = JSON.parse(favData.value); } catch { return []; }
  if (favIds.length === 0) return [];

  // 오늘 출석 기록 중 즐겨찾기 회원 필터
  const { data: attendances } = await supabase
    .from('attendance')
    .select('memberId, memberName')
    .eq('branchId', branchId)
    .in('memberId', favIds)
    .gte('checkInAt', `${today}T00:00:00`)
    .lte('checkInAt', `${today}T23:59:59`);

  if (!attendances || attendances.length === 0) return [];

  // 중복 제거
  const seen = new Set<number>();
  return attendances.filter(a => {
    if (seen.has(a.memberId)) return false;
    seen.add(a.memberId);
    return true;
  }).map(a => ({ id: a.memberId, name: a.memberName }));
};

// ─── FN-035. GX 출석 체크 자동화 ────────────────────────────────
/**
 * 해당 수업의 예약자 중 키오스크/앱 체크인이 있는 사람을 자동으로 출석 처리
 * attendance 테이블에 type='GX'로 삽입
 * @returns 자동 출석 처리된 인원 수
 */
export const autoCheckGxAttendance = async (classId: string, date: string): Promise<number> => {
  const branchId = getBranchId();

  // 1. 해당 수업의 예약자 목록 조회 (reservations 테이블 가정; 없으면 0 반환)
  const { data: reservations, error: resErr } = await supabase
    .from('reservations')
    .select('memberId, memberName')
    .eq('classId', classId)
    .eq('branchId', branchId)
    .eq('status', 'CONFIRMED');

  if (resErr || !reservations || reservations.length === 0) {
    return 0;
  }

  const dayStart = `${date}T00:00:00`;
  const dayEnd   = `${date}T23:59:59`;

  let checkedCount = 0;

  for (const reservation of reservations) {
    // 2. 해당 회원의 당일 키오스크/앱 체크인 여부 확인
    const { data: checkIn } = await supabase
      .from('attendance')
      .select('id')
      .eq('branchId', branchId)
      .eq('memberId', reservation.memberId)
      .gte('checkInAt', dayStart)
      .lte('checkInAt', dayEnd)
      .in('method', ['KIOSK', 'APP'])
      .limit(1);

    if (!checkIn || checkIn.length === 0) continue;

    // 3. 이미 GX 출석 기록이 있는지 중복 방지
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('branchId', branchId)
      .eq('memberId', reservation.memberId)
      .eq('type', 'GX')
      .eq('classId', classId)
      .gte('checkInAt', dayStart)
      .lte('checkInAt', dayEnd)
      .limit(1);

    if (existing && existing.length > 0) continue;

    // 4. GX 출석 삽입
    const { error: insertErr } = await supabase
      .from('attendance')
      .insert({
        branchId,
        memberId: reservation.memberId,
        memberName: reservation.memberName,
        type: 'GX',
        classId,
        checkInAt: new Date().toISOString(),
        method: 'AUTO',
      });

    if (!insertErr) {
      checkedCount++;
    }
  }

  return checkedCount;
};

// ─── 노쇼/취소 자동 정책 처리 ───────────────────────────────────

/** 레슨 정책 타입 */
interface LessonPolicy {
  cancelDeadlineHours: number;
  noShowDeductsSession: boolean;
  autoCompleteHours: number;
  lateCancelPenalty: boolean;
  maxNoShowCount: number;
}

/** 현재 지점의 레슨 정책 조회 */
const getLessonPolicy = async (): Promise<LessonPolicy> => {
  const branchId = getBranchId();
  const defaults: LessonPolicy = {
    cancelDeadlineHours: 3,
    noShowDeductsSession: true,
    autoCompleteHours: 24,
    lateCancelPenalty: true,
    maxNoShowCount: 3,
  };

  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('branchId', branchId)
    .eq('key', 'lesson_policy')
    .single();

  if (!data?.value) return defaults;

  try {
    const parsed = JSON.parse(data.value);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};

/**
 * 미처리 수업 자동 완료 처리 (배치/초기화 시 호출)
 * - 수업 종료 후 N시간 경과한 'scheduled'/'in_progress' 상태 수업을 자동 완료 처리
 * - 레슨북 참고: "하루 지나면 자동으로 수업 완료 처리"
 */
export const syncAutoCompleteClasses = async (): Promise<number> => {
  const branchId = getBranchId();
  const policy = await getLessonPolicy();
  const cutoff = new Date(Date.now() - policy.autoCompleteHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('classes')
    .update({
      lesson_status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('branchId', branchId)
    .in('lesson_status', ['scheduled', 'in_progress'])
    .lt('endTime', cutoff)
    .select('id');

  if (error) {
    console.error('자동 완료 처리 실패:', error.message);
    return 0;
  }
  return data?.length ?? 0;
};

/**
 * 취소 마감 시간 체크
 * @returns 취소 가능 여부 + 메시지
 */
export const checkCancelDeadline = async (
  classStartTime: string
): Promise<{ canCancel: boolean; message: string }> => {
  const policy = await getLessonPolicy();
  const deadline = new Date(
    new Date(classStartTime).getTime() - policy.cancelDeadlineHours * 60 * 60 * 1000
  );
  const now = new Date();

  if (now > deadline) {
    return {
      canCancel: false,
      message: `수업 시작 ${policy.cancelDeadlineHours}시간 전까지만 취소 가능합니다. (마감: ${deadline.toLocaleString('ko-KR')})`,
    };
  }

  return { canCancel: true, message: '취소 가능합니다.' };
};

/**
 * 노쇼 처리 + 정책 기반 패널티 적용
 * - 노쇼 시 세션 차감 (정책에 따라)
 * - 연속 노쇼 경고 기록
 */
export const processNoShowWithPolicy = async (
  memberId: number,
  classId: number
): Promise<{ success: boolean; message: string }> => {
  const branchId = getBranchId();
  const policy = await getLessonPolicy();

  // 수업 상태를 노쇼로 변경
  const { error: statusError } = await supabase
    .from('classes')
    .update({ lesson_status: 'no_show' })
    .eq('id', classId);

  if (statusError) {
    return { success: false, message: '노쇼 상태 변경 실패' };
  }

  // 세션 차감 (정책에 따라)
  if (policy.noShowDeductsSession && memberId) {
    await deductSession(memberId, 'PT');
  }

  // 연속 노쇼 체크
  const { data: recentClasses } = await supabase
    .from('classes')
    .select('lesson_status')
    .eq('branchId', branchId)
    .eq('member_id', memberId)
    .order('startTime', { ascending: false })
    .limit(policy.maxNoShowCount);

  const consecutiveNoShows =
    recentClasses != null &&
    recentClasses.length >= policy.maxNoShowCount &&
    recentClasses.every(c => c.lesson_status === 'no_show');

  if (consecutiveNoShows) {
    const warningMsg = `[경고] ${new Date().toLocaleDateString('ko-KR')} ${policy.maxNoShowCount}회 연속 노쇼`;
    const { data: member } = await supabase
      .from('members')
      .select('memo')
      .eq('id', memberId)
      .single();

    const existingMemo = member?.memo ? member.memo + '\n' : '';
    await supabase
      .from('members')
      .update({ memo: existingMemo + warningMsg, updatedAt: new Date().toISOString() })
      .eq('id', memberId);

    return {
      success: true,
      message: `노쇼 처리 완료. ${policy.maxNoShowCount}회 연속 노쇼 경고가 기록되었습니다.${policy.noShowDeductsSession ? ' (세션 차감됨)' : ''}`,
    };
  }

  return {
    success: true,
    message: `노쇼 처리 완료.${policy.noShowDeductsSession ? ' 세션이 차감되었습니다.' : ''}`,
  };
};

// ─── 초기화: 앱 시작 시 만료 항목 일괄 처리 ─────────────────────
/** 대시보드 로드 시 호출 - 만료 회원/락커/쿠폰/수업 일괄 처리 */
export const runDailySync = async (): Promise<{
  expiredMembers: number;
  expiredLockers: number;
  expiredCoupons: number;
  autoCompletedClasses: number;
}> => {
  const [expiredMembers, expiredLockers, expiredCoupons, autoCompletedClasses] = await Promise.all([
    syncExpiredMembers(),
    syncExpiredLockers(),
    syncExpiredCoupons(),
    syncAutoCompleteClasses(),
  ]);

  return { expiredMembers, expiredLockers, expiredCoupons, autoCompletedClasses };
};

// ─── FN-036. 노쇼 페널티 자동 처리 ──────────────────────────────
/**
 * GX/PT 예약 후 미출석(노쇼) 시 패널티 처리
 * - 활성 계약의 remainingSessions 1 차감
 * - 3회 연속 노쇼 시 회원 memo에 경고 기록
 */
export const processNoShowPenalty = async (
  memberId: number
): Promise<{ success: boolean; remaining?: number; warned?: boolean; message: string }> => {
  const branchId = getBranchId();
  const now = new Date().toISOString();

  // 1. 활성 계약 조회 (잔여 세션 있는 계약 우선)
  const { data: contracts, error: contractErr } = await supabase
    .from('contracts')
    .select('id, remainingSessions, productName')
    .eq('branchId', branchId)
    .eq('memberId', memberId)
    .gt('remainingSessions', 0)
    .lte('startDate', now)
    .or(`endDate.gt.${now},endDate.is.null`)
    .order('startDate', { ascending: true })
    .limit(1);

  if (contractErr || !contracts || contracts.length === 0) {
    return { success: false, message: '차감 가능한 활성 계약이 없습니다.' };
  }

  const contract = contracts[0];
  const remaining = Number(contract.remainingSessions) - 1;

  const { error: updateErr } = await supabase
    .from('contracts')
    .update({ remainingSessions: remaining })
    .eq('id', contract.id);

  if (updateErr) {
    return { success: false, message: '잔여 세션 차감 실패: ' + updateErr.message };
  }

  // 2. 3회 연속 노쇼 여부 확인 (attendances 테이블에서 최근 3건 조회)
  const { data: recentAttendances } = await supabase
    .from('attendances')
    .select('status')
    .eq('branchId', branchId)
    .eq('memberId', memberId)
    .order('checkInTime', { ascending: false })
    .limit(3);

  const consecutiveNoShows =
    recentAttendances !== null &&
    recentAttendances.length === 3 &&
    recentAttendances.every((a) => a.status === 'NO_SHOW');

  let warned = false;
  if (consecutiveNoShows) {
    const warningMsg = `[경고] ${new Date().toLocaleDateString('ko-KR')} 3회 연속 노쇼 패널티 적용`;

    // 기존 memo에 추가
    const { data: member } = await supabase
      .from('members')
      .select('memo')
      .eq('id', memberId)
      .single();

    const existingMemo = member?.memo ? member.memo + '\n' : '';

    const { error: memoErr } = await supabase
      .from('members')
      .update({
        memo: existingMemo + warningMsg,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (!memoErr) warned = true;
  }

  return {
    success: true,
    remaining,
    warned,
    message: warned
      ? `노쇼 패널티 적용 - 잔여 ${remaining}회. 3회 연속 노쇼 경고가 기록되었습니다.`
      : `노쇼 패널티 적용 - ${contract.productName} 잔여 ${remaining}회`,
  };
};

// ─── FN-052. 프로모션 할인 자동 적용 ─────────────────────────────
/** settings 테이블 key='promotions'에서 활성 프로모션 목록 조회 */
export interface Promotion {
  id: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export const getActivePromotions = async (branchId: number): Promise<Promotion[]> => {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('branchId', branchId)
    .eq('key', 'promotions')
    .single();

  if (error || !data?.value) return [];

  try {
    const promotions: Promotion[] = JSON.parse(data.value);
    if (!Array.isArray(promotions)) return [];

    return promotions.filter((p) => {
      if (!p.isActive) return false;
      if (p.startDate && p.startDate > today) return false;
      if (p.endDate && p.endDate < today) return false;
      return true;
    });
  } catch {
    return [];
  }
};

/**
 * 프로모션 할인 적용 금액 계산
 * @returns 할인 후 최종 금액 (0 미만으로 내려가지 않음)
 */
export const applyPromotion = async (
  originalPrice: number,
  promotionId: string
): Promise<{ finalPrice: number; discountAmount: number; message: string }> => {
  const branchId = getBranchId();
  const promotions = await getActivePromotions(branchId);
  const promotion = promotions.find((p) => p.id === promotionId);

  if (!promotion) {
    return {
      finalPrice: originalPrice,
      discountAmount: 0,
      message: '적용 가능한 프로모션을 찾을 수 없습니다.',
    };
  }

  let discountAmount = 0;
  if (promotion.discountType === 'PERCENT') {
    discountAmount = Math.floor(originalPrice * (promotion.discountValue / 100));
  } else {
    // FIXED
    discountAmount = promotion.discountValue;
  }

  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return {
    finalPrice,
    discountAmount,
    message: `${promotion.name} 적용 - ${discountAmount.toLocaleString()}원 할인`,
  };
};
