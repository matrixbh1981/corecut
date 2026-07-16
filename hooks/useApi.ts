import { useState, useCallback } from "react";
import type { ApiResponse } from "../lib/api";

export function useApi<TArgs extends unknown[], TResult>(
  apiFn: (...args: TArgs) => Promise<ApiResponse<TResult>>
) {
  const [state, setState] = useState<{ data: TResult | null; error: string | null; loading: boolean; status: number }>({
    data: null, error: null, loading: false, status: 0,
  });
  const call = useCallback(async (...args: TArgs) => {
    setState(s => ({ ...s, loading: true, error: null }));
    const result = await apiFn(...args);
    setState({ data: result.data, error: result.error, loading: false, status: result.status });
    return result;
  }, [apiFn]);
  return { ...state, call };
}
