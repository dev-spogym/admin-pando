/**
 * 회원 관련 React Query 커스텀 훅
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  getMemberStats,
} from '../endpoints/members';
import type { MemberRequest, MemberListParams } from '../endpoints/members';

/** 쿼리 키 상수 */
export const MEMBER_KEYS = {
  all: ['members'] as const,
  lists: () => [...MEMBER_KEYS.all, 'list'] as const,
  list: (params?: MemberListParams) =>
    [...MEMBER_KEYS.lists(), params] as const,
  details: () => [...MEMBER_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...MEMBER_KEYS.details(), id] as const,
  stats: () => [...MEMBER_KEYS.all, 'stats'] as const,
};

/** 회원 목록 조회 훅 */
export const useMembers = (params?: MemberListParams) => {
  return useQuery({
    queryKey: MEMBER_KEYS.list(params),
    queryFn: () => getMembers(params),
  });
};

/** 회원 단건 조회 훅 */
export const useMember = (id: number) => {
  return useQuery({
    queryKey: MEMBER_KEYS.detail(id),
    queryFn: () => getMember(id),
    enabled: !!id,
  });
};

/** 회원 생성 훅 */
export const useCreateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberRequest) => createMember(data),
    onSuccess: () => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.stats() });
    },
  });
};

/** 회원 수정 훅 */
export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MemberRequest> }) =>
      updateMember(id, data),
    onSuccess: (_, variables) => {
      // 해당 회원 캐시 무효화
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.lists() });
    },
  });
};

/** 회원 삭제 훅 */
export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: MEMBER_KEYS.stats() });
    },
  });
};

/** 회원 통계 조회 훅 */
export const useMemberStats = () => {
  return useQuery({
    queryKey: MEMBER_KEYS.stats(),
    queryFn: getMemberStats,
  });
};
