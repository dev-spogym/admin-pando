// ============================================================
// FitGenie CRM 2.0 - React Hooks for Virtual Server
// ============================================================
// useQuery / useMutation 패턴으로 가상 서버 데이터를 React에서 사용

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VirtualResponse } from './api';

// ============================================================
// useQuery - 데이터 조회 Hook
// ============================================================

interface UseQueryOptions<T> {
  enabled?: boolean;         // false면 자동 실행 안 함
  initialData?: T;           // 초기 데이터
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  refetchInterval?: number;  // 자동 재조회 간격 (ms)
}

interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

export function useQuery<T>(
  queryFn: () => Promise<VirtualResponse<T>>,
  deps: any[] = [],
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const { enabled = true, initialData, onSuccess, onError, refetchInterval } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;

    if (isFirstLoad.current) {
      setIsLoading(true);
      isFirstLoad.current = false;
    } else {
      setIsRefetching(true);
    }

    setIsError(false);
    setError(null);

    try {
      const res = await queryFn();
      if (!mountedRef.current) return;

      if (res.ok) {
        setData(res.data);
        onSuccess?.(res.data);
      } else {
        setIsError(true);
        setError(res.message ?? '데이터를 불러오는데 실패했습니다.');
        onError?.(res.message ?? '');
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setIsError(true);
      setError(err?.message ?? '알 수 없는 오류');
      onError?.(err?.message ?? '');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, enabled]);

  // Auto refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;
    const interval = setInterval(fetchData, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchData,
    isRefetching,
  };
}

// ============================================================
// useMutation - 데이터 변경 Hook
// ============================================================

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: string | null, variables: TVariables) => void;
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<VirtualResponse<TData>>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;

  const [data, setData] = useState<TData | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(undefined);
    setIsLoading(false);
    setIsError(false);
    setIsSuccess(false);
    setError(null);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setIsError(false);
      setIsSuccess(false);
      setError(null);

      try {
        const res = await mutationFn(variables);
        if (res.ok) {
          setData(res.data);
          setIsSuccess(true);
          onSuccess?.(res.data, variables);
          onSettled?.(res.data, null, variables);
          return res.data;
        } else {
          const errMsg = res.message ?? '요청에 실패했습니다.';
          setIsError(true);
          setError(errMsg);
          onError?.(errMsg, variables);
          onSettled?.(undefined, errMsg, variables);
          throw new Error(errMsg);
        }
      } catch (err: any) {
        const errMsg = err?.message ?? '알 수 없는 오류';
        setIsError(true);
        setError(errMsg);
        onError?.(errMsg, variables);
        onSettled?.(undefined, errMsg, variables);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => {
        // Error already handled in mutateAsync
      });
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    data,
    isLoading,
    isError,
    isSuccess,
    error,
    reset,
  };
}

// ============================================================
// useInfiniteQuery - 무한 스크롤용 Hook
// ============================================================

interface UseInfiniteQueryOptions<T> {
  pageSize?: number;
  enabled?: boolean;
  onSuccess?: (data: T[]) => void;
}

interface UseInfiniteQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  isFetchingNextPage: boolean;
  refetch: () => Promise<void>;
}

export function useInfiniteQuery<T>(
  queryFn: (page: number, pageSize: number) => Promise<VirtualResponse<{ data: T[]; totalPages: number }>>,
  deps: any[] = [],
  options: UseInfiniteQueryOptions<T> = {}
): UseInfiniteQueryResult<T> {
  const { pageSize = 20, enabled = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      if (page === 1) setIsLoading(true);
      else setIsFetchingNextPage(true);

      try {
        const res = await queryFn(page, pageSize);
        if (res.ok) {
          const pageData = res.data;
          setData((prev) => (append ? [...prev, ...pageData.data] : pageData.data));
          setTotalPages(pageData.totalPages);
          setCurrentPage(page);
        } else {
          setIsError(true);
          setError(res.message ?? '');
        }
      } catch (err: any) {
        setIsError(true);
        setError(err?.message ?? '');
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    deps // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (enabled) fetchPage(1, false);
  }, [fetchPage, enabled]);

  const fetchNextPage = useCallback(async () => {
    if (currentPage < totalPages) {
      await fetchPage(currentPage + 1, true);
    }
  }, [currentPage, totalPages, fetchPage]);

  const refetch = useCallback(async () => {
    setData([]);
    setCurrentPage(1);
    await fetchPage(1, false);
  }, [fetchPage]);

  return {
    data,
    isLoading,
    isError,
    error,
    hasNextPage: currentPage < totalPages,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  };
}
