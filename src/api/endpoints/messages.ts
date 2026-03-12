/**
 * 메시지 관련 API 함수 (Supabase 연동)
 */
import { supabase } from '../../lib/supabase';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types';

const DEFAULT_BRANCH_ID = 1;

/** 메시지 항목 */
export interface Message {
  id: number;
  type: 'SMS' | 'KAKAO' | 'PUSH';
  title?: string;
  recipients: string[];
  content: string;
  sentAt: string;
  scheduledAt?: string;
  status: 'SENT' | 'FAILED' | 'PENDING' | 'SCHEDULED';
  branchId: number;
}

/** 메시지 발송 요청 */
export interface SendMessageRequest {
  type: 'SMS' | 'KAKAO' | 'PUSH';
  recipients: string[];
  content: string;
  title?: string;
  scheduledAt?: string;
}

/** DB row → Message 변환 */
function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as number,
    type: row.type as Message['type'],
    title: row.title as string | undefined,
    recipients: (row.recipients as string[]) ?? [],
    content: row.content as string,
    sentAt: (row.sentAt as string) ?? '',
    scheduledAt: row.scheduledAt as string | undefined,
    status: row.status as Message['status'],
    branchId: row.branchId as number,
  };
}

/** 메시지 발송 */
export const sendMessage = async (
  data: SendMessageRequest,
  branchId: number = DEFAULT_BRANCH_ID
): Promise<ApiResponse<Message>> => {
  const isScheduled = !!data.scheduledAt;

  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      type: data.type,
      title: data.title ?? null,
      content: data.content,
      recipients: data.recipients,
      sentAt: isScheduled ? null : new Date().toISOString(),
      scheduledAt: data.scheduledAt ?? null,
      status: isScheduled ? 'SCHEDULED' : 'SENT',
      branchId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, data: null as unknown as Message, message: error.message };
  }

  return {
    success: true,
    data: rowToMessage(inserted as Record<string, unknown>),
    message: isScheduled ? '메시지가 예약되었습니다.' : '메시지가 발송되었습니다.',
  };
};

/** 메시지 발송 이력 조회 */
export const getMessageHistory = async (
  params?: PaginationParams & { type?: string; startDate?: string; endDate?: string },
  branchId: number = DEFAULT_BRANCH_ID
): Promise<ApiResponse<PaginatedResponse<Message>>> => {
  const page = params?.page ?? 1;
  const size = params?.size ?? 10;
  const from = (page - 1) * size;
  const to = from + size - 1;

  let query = supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('branchId', branchId)
    .order('sentAt', { ascending: false })
    .range(from, to);

  if (params?.type) {
    query = query.eq('type', params.type);
  }
  if (params?.startDate) {
    query = query.gte('sentAt', params.startDate);
  }
  if (params?.endDate) {
    query = query.lte('sentAt', params.endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, data: null as unknown as PaginatedResponse<Message>, message: error.message };
  }

  const total = count ?? 0;

  return {
    success: true,
    data: {
      data: (data ?? []).map((row) => rowToMessage(row as Record<string, unknown>)),
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size),
      },
    },
  };
};
