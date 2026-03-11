/**
 * 메시지 관련 API 함수
 */
import apiClient from '../client';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

/** 메시지 항목 */
export interface Message {
  id: number;
  type: 'SMS' | 'KAKAO' | 'PUSH';
  recipients: string[];
  content: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  branchId: number;
}

/** 메시지 발송 요청 */
export interface SendMessageRequest {
  type: 'SMS' | 'KAKAO' | 'PUSH';
  recipients: string[];
  content: string;
  scheduledAt?: string;
}

/** 메시지 발송 */
export const sendMessage = async (data: SendMessageRequest): Promise<ApiResponse<Message>> => {
  // const response = await apiClient.post<ApiResponse<Message>>('/messages/send', data);
  // return response.data;

  void apiClient;
  return {
    success: true,
    data: {
      id: Date.now(),
      type: data.type,
      recipients: data.recipients,
      content: data.content,
      sentAt: new Date().toISOString(),
      status: 'SENT',
      branchId: 1,
    },
    message: '메시지가 발송되었습니다.',
  };
};

/** 메시지 발송 이력 조회 */
export const getMessageHistory = async (
  params?: PaginationParams & { type?: string; startDate?: string; endDate?: string }
): Promise<ApiResponse<PaginatedResponse<Message>>> => {
  // const response = await apiClient.get<ApiResponse<PaginatedResponse<Message>>>('/messages/history', { params });
  // return response.data;

  void params;
  const mockList: Message[] = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    type: 'SMS',
    recipients: ['010-0000-0001'],
    content: `테스트 메시지 ${i + 1}`,
    sentAt: new Date().toISOString(),
    status: 'SENT',
    branchId: 1,
  }));
  return {
    success: true,
    data: {
      data: mockList,
      pagination: { page: 1, size: 10, total: 5, totalPages: 1 },
    },
  };
};
