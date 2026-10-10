import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, hasLiveApi, type SimulationRequest } from './api'
import {
  briefBySchool,
  circularDraft,
  forecastBySchool,
  schools,
  subscribers,
} from './data/mockData'
import type { BriefResponse, Tier } from './types'

type Scenario = 'normal' | 'stubble' | 'severe'

const tierStyles: Record<Tier, { badge: string; accent: string; glow: string; icon: string }> = {
  GREEN: { badge: 'bg-[#e8f7ef] text-[#1d6b46]', accent: '#2E9E6B', glow: 'rgba(46, 158, 107, 0.18)', icon: '✓' },
  AMBER: { badge: 'bg-[#fef4d7] text-[#8c6a00]', accent: '#E0A100', glow: 'rgba(224, 161, 0, 0.18)', icon: '△' },
  ORANGE: { badge: 'bg-[#fff0e7] text-[#b74d00]', accent: '#E8710A', glow: 'rgba(232, 113, 10, 0.18)', icon: '⚠' },
  RED: { badge: 'bg-[#ffe6e6] text-[#ac2c2c]', accent: '#D93636', glow: 'rgba(217, 54, 54, 0.18)', icon: '⛔' },
  MAROON: { badge: 'bg-[#f9e7ef] text-[#6b1d3d]', accent: '#7A1F3D', glow: 'rgba(122, 31, 61, 0.18)', icon: '⛔' },
}

const formatDisplayDate = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatHour = (value: string) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

const simulateDemoBrief = (brief: BriefResponse, input: SimulationRequest): BriefResponse => {
  const factor = 'aqiOverride' in input ? input.aqiOverride / 180 : input.scenario === 'stubble' ? 1.28 : input.scenario === 'severe' ? 1.55 : 1
  const adjustedSlots = brief.slots.map((slot) => {
    const adjustedAqi = Math.min(340, Math.max(40, Math.round(slot.aqi * factor)))
    const tier: Tier = adjustedAqi >= 301 ? 'MAROON' : adjustedAqi >= 201 ? 'RED' : adjustedAqi >= 151 ? 'ORANGE' : adjustedAqi >= 101 ? 'AMBER' : 'GREEN'
    const verdict =
      adjustedAqi < 101 ? 'GO' : adjustedAqi < 151 ? 'MODIFY' : adjustedAqi < 201 ? 'MOVE' : 'CANCEL'
    return {
      ...slot,
      aqi: adjustedAqi,
      tier,
      verdict: verdict as BriefResponse['slots'][number]['verdict'],
      reason: `AQI ${adjustedAqi} during ${slot.start}-${slot.end}`,
    }
  })

  const maxAqi = Math.max(...adjustedSlots.map((slot) => slot.aqi))
  const headlineTier: Tier = maxAqi >= 301 ? 'MAROON' : maxAqi >= 201 ? 'RED' : maxAqi >= 151 ? 'ORANGE' : maxAqi >= 101 ? 'AMBER' : 'GREEN'
  return {
    ...brief,
    generatedAt: new Date().toISOString(),
    simulated: true,
    headline: {
      tier: headlineTier,
      maxAqi,
      text: headlineTier === 'GREEN' ? 'Outdoor activity remains safe' : headlineTier === 'AMBER' ? 'Keep some activities modified' : headlineTier === 'ORANGE' ? 'Move the riskiest activities' : 'Cancel outdoor activity today',
    },
    slots: adjustedSlots,
    safeWindows: brief.safeWindows.length ? [{ ...brief.safeWindows[0], slotId: 'pt' }] : [],
    ledger: {
      weekMinutesAvoided: Math.round((brief.ledger.weekMinutesAvoided * factor) / 1.4),
      weekMinutesExposed: Math.round(brief.ledger.weekMinutesExposed * factor),
    },
  }
}

function LoadingCard() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3].map((item) => (
        <div key={item} className="card-surface animate-pulse rounded-3xl p-5">
          <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
          <div className="h-10 w-full rounded bg-slate-200" />
          <div className="mt-3 h-4 w-2/3 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  )
}

function App() {
  const [selectedSchoolId, setSelectedSchoolId] = useState('delhi')
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [aqiOverride, setAqiOverride] = useState<number | null>(null)
  const [simulationInput, setSimulationInput] = useState<SimulationRequest>({ scenario: 'normal' })
  const [circularEnglish, setCircularEnglish] = useState(circularDraft.en)
  const [circularHindi, setCircularHindi] = useState(circularDraft.hi)
  const queryClient = useQueryClient()

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => (hasLiveApi ? api.getSchools() : Promise.resolve(schools)),
  })
  const briefQuery = useQuery({
    queryKey: ['brief', selectedSchoolId],
    queryFn: () => (hasLiveApi ? api.getBrief(selectedSchoolId) : Promise.resolve(briefBySchool[selectedSchoolId] ?? briefBySchool.delhi)),
  })
  const forecastQuery = useQuery({
    queryKey: ['forecast', selectedSchoolId],
    queryFn: () => (hasLiveApi ? api.getForecast(selectedSchoolId) : Promise.resolve(forecastBySchool[selectedSchoolId] ?? forecastBySchool.delhi)),
  })
  const simulationQuery = useQuery({
    queryKey: ['simulate', selectedSchoolId, simulationInput],
    queryFn: () =>
      hasLiveApi
        ? api.simulate(selectedSchoolId, simulationInput)
        : Promise.resolve(simulateDemoBrief(briefQuery.data ?? briefBySchool.delhi, simulationInput)),
    enabled: false,
  })

  const simulatedBrief = simulationQuery.data
  const visibleBrief = simulatedBrief ?? briefQuery.data
  const isDemoMode = !hasLiveApi
  const availableSchools = schoolsQuery.data ?? []
  const currentSchool = availableSchools.find((school) => school.id === selectedSchoolId) ?? availableSchools[0] ?? schools[0]

  const staleData = briefQuery.data ? Date.now() - new Date(briefQuery.data.generatedAt).getTime() > 3 * 60 * 60 * 1000 : false

  const chartData = (forecastQuery.data ?? []).map((entry) => ({
    ...entry,
    label: formatHour(entry.time),
  }))

  const handleRetry = () => {
    void queryClient.invalidateQueries({ queryKey: ['schools'] })
    void queryClient.invalidateQueries({ queryKey: ['brief'] })
    void queryClient.invalidateQueries({ queryKey: ['forecast'] })
  }

  const runSimulation = () => {
    void simulationQuery.refetch()
  }

  if (schoolsQuery.isLoading || briefQuery.isLoading || forecastQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingCard />
      </div>
    )
  }

  if (schoolsQuery.isError || briefQuery.isError || forecastQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="card-surface rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">API error</p>
          <h2 className="mt-3 font-display text-3xl">Could not load today’s briefing</h2>
          <p className="mt-2 text-sm text-red-800">The configured API did not respond. Check the API base and try again.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!visibleBrief) {
    return null
  }

  const { headline, slots, safeWindows, ledger } = visibleBrief
  const tierColor = tierStyles[headline.tier]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-[28px] border border-[#e5dfd2] bg-[#fffdf9]/90 p-4 shadow-soft backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Principal Brief</p>
            <h1 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">Saans</h1>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="school" className="text-sm font-medium text-slate-600">
              School
            </label>
            <select
              id="school"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm outline-none ring-0"
            >
              {availableSchools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {isDemoMode && (
        <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Demo mode: this screen is using clearly labelled local fixtures because <code>VITE_API_BASE</code> is not configured. No live air-quality data is being shown.
        </div>
      )}

      {staleData && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Stale data warning: this briefing is older than 3 hours. Refresh the forecast before making a final call.
        </div>
      )}

      <main className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div
            className="verdict-card card-surface rounded-[32px] p-5 sm:p-6"
            style={{ background: `linear-gradient(135deg, ${tierColor.glow} 0%, rgba(255,255,255,0.88) 48%)` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{formatDisplayDate(visibleBrief.generatedAt)}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-xl ${tierStyles[headline.tier].badge}`}>
                    {tierStyles[headline.tier].icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">{headline.tier}</p>
                    <h2 className="font-display text-4xl sm:text-5xl text-slate-900">AQI {headline.maxAqi}</h2>
                  </div>
                </div>
              </div>
              {visibleBrief.simulated && (
                <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">
                  Simulated
                </span>
              )}
            </div>
            <p className="mt-5 max-w-xl text-xl font-medium text-slate-800 sm:text-2xl">{headline.text}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
                title="Circular generation and notification are not integrated in P0"
              >
                Circular unavailable in P0
              </button>
              <button type="button" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                See why
              </button>
            </div>
          </div>

          <div className="card-surface rounded-[28px] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-2xl text-slate-900">Today’s timeline</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{currentSchool.city}</span>
            </div>
            <div className="space-y-3">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium text-slate-500">{slot.start}</div>
                    <div>
                      <div className="font-semibold text-slate-800">{slot.label}</div>
                      <div className="text-xs text-slate-500">{slot.end}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tierStyles[slot.tier].badge}`}>
                      {slot.verdict}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{slot.alternative}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card-surface rounded-[28px] p-5 sm:p-6">
            <h3 className="font-display text-2xl text-slate-900">Safe window</h3>
            {safeWindows.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Recommended</p>
                <p className="mt-2 text-3xl font-semibold">{safeWindows[0].from}–{safeWindows[0].to}</p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
                No safe window is available before 17:00. Consider an indoor arrangement.
              </div>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">This week</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{ledger.weekMinutesAvoided} min</p>
                <p className="text-sm text-slate-500">avoided</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Exposure</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{ledger.weekMinutesExposed} min</p>
                <p className="text-sm text-slate-500">indoor / modifed</p>
              </div>
            </div>
          </div>

          <div className="card-surface rounded-[28px] p-5 sm:p-6">
            <h3 className="font-display text-2xl text-slate-900">48-Hour Forecast</h3>
            <div className="mt-4 h-48 w-full">
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -28, bottom: 18 }}>
                  <defs>
                    <linearGradient id="aqiFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#D93636" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#D93636" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dfe5ea" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={5} className="axis-label" />
                  <YAxis tickLine={false} axisLine={false} domain={[0, 260]} className="axis-label" />
                  <Tooltip formatter={(value: number) => [`AQI ${value}`, '']} labelFormatter={(label) => `Hour: ${label}`} />
                  <Area type="monotone" dataKey="aqi" stroke="#D93636" fill="url(#aqiFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>
      </main>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card-surface rounded-[28px] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl text-slate-900">Simulator</h3>
            {visibleBrief.simulated && <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">SIMULATED</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['normal', 'stubble', 'severe'] as Scenario[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setScenario(option)
                  setAqiOverride(null)
                  setSimulationInput({ scenario: option })
                }}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  scenario === option ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {option === 'normal' ? 'Normal' : option === 'stubble' ? 'Stubble season' : 'Severe'}
              </button>
            ))}
          </div>
          <label className="mt-5 block text-sm font-medium text-slate-700">
            AQI override: <span className="font-bold text-slate-900">{aqiOverride ?? 'off'}</span>
          </label>
          <input
            type="range"
            min="60"
            max="340"
            value={aqiOverride ?? 180}
            onChange={(event) => {
              const value = Number(event.target.value)
              setAqiOverride(value)
              setSimulationInput({ aqiOverride: value })
            }}
            className="mt-3 w-full accent-red-600"
          />
          <button
            type="button"
            onClick={runSimulation}
            disabled={simulationQuery.isFetching}
            className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {simulationQuery.isFetching ? 'Running…' : 'Run simulation'}
          </button>
          {simulationQuery.isError && (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Simulation failed: {simulationQuery.error.message}
            </p>
          )}
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            {isDemoMode
              ? 'Demo mode computes this preview locally from isolated fixtures. Configure VITE_API_BASE to call the backend simulator.'
              : 'This calls the backend simulator in memory. It never writes production data or sends notifications.'}
          </div>
        </div>

        <div className="card-surface rounded-[28px] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl text-slate-900">Circular Composer</h3>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
              {isDemoMode ? 'Demo preview' : 'Unavailable'}
            </span>
          </div>
          {!isDemoMode ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Circular generation is not connected to the configured backend yet. No fixture text or subscriber data is shown as live.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">English</label>
                  <textarea value={circularEnglish} onChange={(event) => setCircularEnglish(event.target.value)} className="min-h-[130px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hindi</label>
                  <textarea value={circularHindi} onChange={(event) => setCircularHindi(event.target.value)} className="min-h-[130px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700" />
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Demo subscribers</p>
                  <button type="button" disabled className="cursor-not-allowed rounded-full bg-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Sending unavailable in P0
                  </button>
                </div>
                {subscribers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No subscribers yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subscribers.map((subscriber) => (
                      <div key={subscriber.email} className="flex items-center justify-between rounded-2xl bg-white p-3 text-sm text-slate-700">
                        <div>
                          <div className="font-medium">{subscriber.email}</div>
                          <div className="text-xs text-slate-500">{subscriber.role}</div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                          {subscriber.confirmed ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
