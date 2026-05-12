import { useCallback, useState } from 'react'

interface UseIpcState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useIpc<T>(fn: (...args: any[]) => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<UseIpcState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: any[]) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const result = await fn(...args)
        setState({ data: result, loading: false, error: null })
        return result
      } catch (e: any) {
        setState({ data: null, loading: false, error: e?.message || 'Erro desconhecido' })
        throw e
      }
    },
    [fn, ...deps],
  )

  return { ...state, execute }
}
