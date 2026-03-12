/**
 * 설정 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse } from '../types';

const DEFAULT_BRANCH_ID = 1;

/** 앱 설정 */
export interface Settings {
  branchName: string;
  businessHours: {
    open: string;
    close: string;
    holidays: string[];
  };
  notifications: {
    smsEnabled: boolean;
    kakaoEnabled: boolean;
    pushEnabled: boolean;
  };
  membership: {
    autoExpireNotification: boolean;
    expireNoticeDays: number;
  };
}

/** 설정 조회 */
export const getSettings = async (branchId: number = DEFAULT_BRANCH_ID): Promise<ApiResponse<Settings>> => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('branchId', branchId)
    .maybeSingle();

  if (error) {
    return { success: false, data: null as unknown as Settings, message: error.message };
  }

  if (!data) {
    return {
      success: false,
      data: null as unknown as Settings,
      message: '설정 데이터를 찾을 수 없습니다.',
    };
  }

  return {
    success: true,
    data: {
      branchName: data.centerName ?? '',
      businessHours: {
        open: data.businessHoursOpen ?? '06:00',
        close: data.businessHoursClose ?? '22:00',
        holidays: (data.holidays as string[]) ?? [],
      },
      notifications: {
        smsEnabled: data.smsEnabled ?? false,
        kakaoEnabled: data.kakaoEnabled ?? false,
        pushEnabled: data.pushEnabled ?? false,
      },
      membership: {
        autoExpireNotification: data.autoExpireNotify ?? false,
        expireNoticeDays: data.expireNoticeDays ?? 7,
      },
    },
  };
};

/** 설정 수정 */
export const updateSettings = async (
  data: Partial<Settings>,
  branchId: number = DEFAULT_BRANCH_ID
): Promise<ApiResponse<Settings>> => {
  const updatePayload: Record<string, unknown> = {};

  if (data.branchName !== undefined) updatePayload.centerName = data.branchName;
  if (data.businessHours?.open !== undefined) updatePayload.businessHoursOpen = data.businessHours.open;
  if (data.businessHours?.close !== undefined) updatePayload.businessHoursClose = data.businessHours.close;
  if (data.businessHours?.holidays !== undefined) updatePayload.holidays = data.businessHours.holidays;
  if (data.notifications?.smsEnabled !== undefined) updatePayload.smsEnabled = data.notifications.smsEnabled;
  if (data.notifications?.kakaoEnabled !== undefined) updatePayload.kakaoEnabled = data.notifications.kakaoEnabled;
  if (data.notifications?.pushEnabled !== undefined) updatePayload.pushEnabled = data.notifications.pushEnabled;
  if (data.membership?.autoExpireNotification !== undefined) updatePayload.autoExpireNotify = data.membership.autoExpireNotification;
  if (data.membership?.expireNoticeDays !== undefined) updatePayload.expireNoticeDays = data.membership.expireNoticeDays;

  const { data: updated, error } = await supabase
    .from('settings')
    .update(updatePayload)
    .eq('branchId', branchId)
    .select()
    .single();

  if (error) {
    return { success: false, data: null as unknown as Settings, message: error.message };
  }

  return {
    success: true,
    data: {
      branchName: updated.centerName ?? '',
      businessHours: {
        open: updated.businessHoursOpen ?? '06:00',
        close: updated.businessHoursClose ?? '22:00',
        holidays: (updated.holidays as string[]) ?? [],
      },
      notifications: {
        smsEnabled: updated.smsEnabled ?? false,
        kakaoEnabled: updated.kakaoEnabled ?? false,
        pushEnabled: updated.pushEnabled ?? false,
      },
      membership: {
        autoExpireNotification: updated.autoExpireNotify ?? false,
        expireNoticeDays: updated.expireNoticeDays ?? 7,
      },
    },
    message: '설정이 저장되었습니다.',
  };
};
