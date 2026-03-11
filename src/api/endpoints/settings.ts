/**
 * 설정 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse } from '../types';

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
export const getSettings = async (): Promise<ApiResponse<Settings>> => {
  // const response = await apiClient.get<ApiResponse<Settings>>('/settings');
  // return response.data;

  void apiClient;
  return {
    success: true,
    data: {
      branchName: '판도 피트니스',
      businessHours: {
        open: '06:00',
        close: '22:00',
        holidays: ['SUNDAY'],
      },
      notifications: {
        smsEnabled: true,
        kakaoEnabled: true,
        pushEnabled: false,
      },
      membership: {
        autoExpireNotification: true,
        expireNoticeDays: 7,
      },
    },
  };
};

/** 설정 수정 */
export const updateSettings = async (data: Partial<Settings>): Promise<ApiResponse<Settings>> => {
  // const response = await apiClient.put<ApiResponse<Settings>>('/settings', data);
  // return response.data;

  void data;
  return {
    success: true,
    data: {
      branchName: data.branchName ?? '판도 피트니스',
      businessHours: data.businessHours ?? { open: '06:00', close: '22:00', holidays: [] },
      notifications: data.notifications ?? { smsEnabled: true, kakaoEnabled: true, pushEnabled: false },
      membership: data.membership ?? { autoExpireNotification: true, expireNoticeDays: 7 },
    },
    message: '설정이 저장되었습니다.',
  };
};
