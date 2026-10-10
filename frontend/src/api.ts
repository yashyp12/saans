import type { BriefResponse, ForecastPoint, School } from './types'

export type SimulationRequest =
  | { scenario: 'normal' | 'stubble' | 'severe' }
  | { aqiOverride: number }

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
  }
}

const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')

export const hasLiveApi = apiBase.length > 0

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as ApiErrorBody
      message = body.error?.message ?? message
    } catch {
      // Preserve the HTTP error when a server response is not JSON.
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export const api = {
  getSchools: () => request<School[]>('/schools'),
  getBrief: (schoolId: string) => request<BriefResponse>(`/schools/${encodeURIComponent(schoolId)}/brief`),
  getForecast: (schoolId: string) => request<ForecastPoint[]>(`/schools/${encodeURIComponent(schoolId)}/forecast`),
  simulate: (schoolId: string, input: SimulationRequest) =>
    request<BriefResponse>(`/schools/${encodeURIComponent(schoolId)}/simulate`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}
