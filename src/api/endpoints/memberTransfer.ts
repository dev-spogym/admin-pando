/**
 * 회원 이관/탈퇴 관련 API (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse } from '../types';

/** 이관 전 체크 결과 */
export interface TransferCheckResult {
  canTransfer: boolean;
  blockers: string[]; // 이관 불가 사유 목록
  warnings: string[]; // 주의사항
  hasUnpaidAmount: boolean;
  unpaidAmount: number;
  hasLocker: boolean;
  hasActiveHolding: boolean;
  hasActivePt: boolean;
  ptRemainingSessions: number;
  activeCoupons: number;
  mileageBalance: number;
}

/** 이관 요청 */
export interface MemberTransferRequest {
  memberId: number;
  toBranchId: number;
  transferType: 'KEEP_TICKET' | 'REFUND_NEW' | 'EXHAUST_THEN';
  reason?: string;
}

/** 탈퇴 요청 */
export interface MemberWithdrawRequest {
  memberId: number;
  reason?: string;
  refundTickets: boolean; // 잔여 이용권 환불 여부
}

const getTenantId = (): number => {
  const stored = localStorage.getItem('tenantId');
  return stored ? Number(stored) : 1;
};

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 이관 전 체크리스트 확인 */
export const checkTransferEligibility = async (
  memberId: number
): Promise<ApiResponse<TransferCheckResult>> => {
  try {
    // 1. 회원 정보 조회
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error || !member) throw new Error('회원을 찾을 수 없습니다.');

    const blockers: string[] = [];
    const warnings: string[] = [];

    // 2. 미납금 확인
    const { data: unpaidSales } = await supabase
      .from('sales')
      .select('unpaid')
      .eq('memberId', memberId)
      .gt('unpaid', 0);

    const unpaidAmount = (unpaidSales ?? []).reduce((sum: number, s: { unpaid: number }) => sum + Number(s.unpaid), 0);
    if (unpaidAmount > 0) {
      blockers.push(`미납금 ${unpaidAmount.toLocaleString()}원 정산이 필요합니다.`);
    }

    // 3. 락커 확인
    const { data: lockers } = await supabase
      .from('lockers')
      .select('id')
      .eq('memberId', memberId)
      .eq('status', 'IN_USE');

    const hasLocker = (lockers?.length ?? 0) > 0;
    if (hasLocker) {
      blockers.push('락커 반납이 필요합니다.');
    }

    // 4. 홀딩 확인
    const hasActiveHolding = member.status === 'HOLDING';
    if (hasActiveHolding) {
      warnings.push('현재 홀딩 중입니다. 홀딩 종료 후 이관을 권장합니다.');
    }

    // 5. PT 잔여 확인 (membershipType이 PT이고 만료 전)
    const hasActivePt = member.membershipType === 'PT' && member.status === 'ACTIVE';
    const ptRemainingSessions = 0; // 실제로는 contract/sale에서 계산

    // 6. 쿠폰 확인
    const { count: couponCount } = await supabase
      .from('coupons')
      .select('id', { count: 'exact', head: true })
      .eq('branchId', getBranchId())
      .eq('isActive', true);

    // 7. 마일리지
    const mileageBalance = member.mileage ?? 0;

    return {
      success: true,
      data: {
        canTransfer: blockers.length === 0,
        blockers,
        warnings,
        hasUnpaidAmount: unpaidAmount > 0,
        unpaidAmount,
        hasLocker,
        hasActiveHolding,
        hasActivePt,
        ptRemainingSessions,
        activeCoupons: couponCount ?? 0,
        mileageBalance,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '이관 체크에 실패했습니다.';
    return {
      success: false,
      data: {
        canTransfer: false, blockers: [message], warnings: [],
        hasUnpaidAmount: false, unpaidAmount: 0, hasLocker: false,
        hasActiveHolding: false, hasActivePt: false, ptRemainingSessions: 0,
        activeCoupons: 0, mileageBalance: 0,
      },
      message,
    };
  }
};

/** 회원 지점 이관 실행 */
export const transferMember = async (
  data: MemberTransferRequest
): Promise<ApiResponse<null>> => {
  try {
    // 1. 이관 전 체크
    const checkResult = await checkTransferEligibility(data.memberId);
    if (!checkResult.data.canTransfer) {
      return { success: false, data: null, message: checkResult.data.blockers.join('\n') };
    }

    // 2. members.branchId 변경
    const { error } = await supabase
      .from('members')
      .update({
        branchId: data.toBranchId,
        staffId: null, // 담당 FC 초기화 (새 지점에서 재배정)
        updatedAt: new Date().toISOString(),
      })
      .eq('id', data.memberId);

    if (error) throw error;

    // 3. 이관 로그 기록
    const userRaw = localStorage.getItem('auth_user');
    const user = userRaw ? JSON.parse(userRaw) : null;

    await supabase.from('member_transfer_log').insert({
      tenantId: getTenantId(),
      memberId: data.memberId,
      fromBranchId: getBranchId(),
      toBranchId: data.toBranchId,
      transferType: data.transferType,
      approvedBy: user?.id ? Number(user.id) : 0,
      reason: data.reason ?? null,
    });

    return { success: true, data: null, message: '회원 이관이 완료되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '회원 이관에 실패했습니다.';
    return { success: false, data: null, message };
  }
};

/** 회원 탈퇴 처리 */
export const withdrawMember = async (
  data: MemberWithdrawRequest
): Promise<ApiResponse<null>> => {
  try {
    // 1. 회원 상태 변경
    const { error } = await supabase
      .from('members')
      .update({
        status: 'WITHDRAWN',
        withdrawnAt: new Date().toISOString(),
        withdrawReason: data.reason ?? null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', data.memberId);

    if (error) throw error;

    // 2. 락커 자동 반납
    await supabase
      .from('lockers')
      .update({
        status: 'AVAILABLE',
        memberId: null,
        memberName: null,
        assignedAt: null,
        expiresAt: null,
      })
      .eq('memberId', data.memberId);

    // 3. 마일리지 소멸
    await supabase
      .from('members')
      .update({ mileage: 0 })
      .eq('id', data.memberId);

    return { success: true, data: null, message: '회원 탈퇴가 처리되었습니다.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : '회원 탈퇴 처리에 실패했습니다.';
    return { success: false, data: null, message };
  }
};

/** 이관 이력 조회 */
export const getMemberTransferHistory = async (
  memberId: number
): Promise<ApiResponse<{ fromBranchId: number; toBranchId: number; transferType: string; reason?: string; createdAt: string }[]>> => {
  try {
    const { data, error } = await supabase
      .from('member_transfer_log')
      .select('*')
      .eq('memberId', memberId)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : '이관 이력 조회에 실패했습니다.';
    return { success: false, data: [], message };
  }
};
