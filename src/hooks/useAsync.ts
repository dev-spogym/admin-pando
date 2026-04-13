import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (fn: () => Promise<T>) => {
    setState({ data: null, isLoading: true, error: null });
    try {
      const result = await fn();
      setState({ data: result, isLoading: false, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다';
      setState({ data: null, isLoading: false, error: message });
      throw err;
    }
  }, []);

  return { ...state, execute };
}
