/**
 * 뉴스피드/알림센터 관련 API 함수 - Supabase 연동
 */
import { supabase } from '@/lib/supabase';
import type { ApiResponse, PaginatedResponse } from '../types';

/** branchId 가져오기 */
const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/** 뉴스피드 항목 */
export interface NewsFeedItem {
  id: number;
  branchId: number;
  userId?: number;
  userName?: string;
  action: string;
  message: string;
  targetType?: string;
  targetId?: number;
  isRead: boolean;
  createdAt: string;
}

/** 뉴스피드 생성 요청 */
export interface NewsFeedRequest {
  branchId?: number;
  userId?: number;
  userName?: string;
  action: string;
  message: string;
  targetType?: string;
  targetId?: number;
}

/** 알림 목록 조회 */
export const getNewsFeed = async (
  branchId?: number,
  page = 1,
  size = 20
): Promise<ApiResponse<PaginatedResponse<NewsFeedItem>>> => {
  const resolvedBranchId = branchId ?? getBranchId();
  const from = (page - 1) * size;
  const to = from + size - 1;

  try {
    const { data, error, count } = await supabase
      .from('news_feed')
      .select('*', { count: 'exact' })
      .eq('branchId', resolvedBranchId)
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const total = count ?? 0;
    return {
      success: true,
      data: {
        data: (data ?? []) as NewsFeedItem[],
        pagination: { page, size, total, totalPages: Math.ceil(total / size) },
      },
    };
  } catch (err) {
    console.error('getNewsFeed 오류:', err);
    throw err;
  }
};

/** 알림 생성 */
export const createNewsFeedItem = async (
  payload: NewsFeedRequest
): Promise<ApiResponse<NewsFeedItem>> => {
  const branchId = payload.branchId ?? getBranchId();

  try {
    const { data, error } = await supabase
      .from('news_feed')
      .insert({ ...payload, branchId, isRead: false })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as NewsFeedItem, message: '알림이 생성되었습니다.' };
  } catch (err) {
    console.error('createNewsFeedItem 오류:', err);
    throw err;
  }
};

/** 읽음 처리 */
export const markAsRead = async (id: number): Promise<ApiResponse<NewsFeedItem>> => {
  try {
    const { data, error } = await supabase
      .from('news_feed')
      .update({ isRead: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, data: data as NewsFeedItem, message: '읽음 처리되었습니다.' };
  } catch (err) {
    console.error('markAsRead 오류:', err);
    throw err;
  }
};

/** 전체 읽음 처리 */
export const markAllAsRead = async (branchId?: number): Promise<ApiResponse<null>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    const { error } = await supabase
      .from('news_feed')
      .update({ isRead: true })
      .eq('branchId', resolvedBranchId)
      .eq('isRead', false);

    if (error) throw new Error(error.message);
    return { success: true, data: null, message: '전체 읽음 처리되었습니다.' };
  } catch (err) {
    console.error('markAllAsRead 오류:', err);
    throw err;
  }
};

/** 미읽 건수 조회 */
export const getUnreadCount = async (branchId?: number): Promise<ApiResponse<number>> => {
  const resolvedBranchId = branchId ?? getBranchId();

  try {
    const { count, error } = await supabase
      .from('news_feed')
      .select('*', { count: 'exact', head: true })
      .eq('branchId', resolvedBranchId)
      .eq('isRead', false);

    if (error) throw new Error(error.message);
    return { success: true, data: count ?? 0 };
  } catch (err) {
    console.error('getUnreadCount 오류:', err);
    throw err;
  }
};
