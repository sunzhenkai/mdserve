import { useQuery } from '@tanstack/react-query'

/**
 * Subset of /api/config relevant to diagram rendering.
 * Kept in sync with server.handleGetConfig.
 */
export interface KrokiConfig {
  krokiEnabled: boolean
  krokiUrl: string
}

/**
 * Query key shared with the main config query so the react-query cache is
 * reused (FileProvider fetches the same key with staleTime: Infinity).
 */
export const KROKI_CONFIG_KEY = ['config'] as const

async function fetchConfig(): Promise<KrokiConfig> {
  const res = await fetch('/api/config')
  if (!res.ok) return { krokiEnabled: false, krokiUrl: '' }
  const data = await res.json()
  return {
    krokiEnabled: data?.krokiEnabled === true,
    krokiUrl: typeof data?.krokiUrl === 'string' ? data.krokiUrl : '',
  }
}

/**
 * Reads Kroki availability from the (cached) /api/config response.
 *
 * Because FileProvider already fetches `/api/config` with the same query key
 * and `staleTime: Infinity`, this hook returns instantly without an extra
 * network round-trip in the common case.
 */
export function useKrokiConfig(): KrokiConfig {
  const query = useQuery({
    queryKey: KROKI_CONFIG_KEY,
    queryFn: fetchConfig,
    staleTime: Infinity,
    // Treat fetch failures as "not configured" rather than erroring the UI.
    select: (data): KrokiConfig => data,
  })
  return query.data ?? { krokiEnabled: false, krokiUrl: '' }
}
