import { useMemo, useState, type CSSProperties } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, apiConfigurationError, hasLiveApi, isDemoMode, type SimulationRequest } from './api'
import { briefBySchool, forecastBySchool, schools } from './data/mockData'
import type { BriefResponse, Tier } from './types'

type Scenario = 'normal' | 'stubble' | 'severe'

const tierStyles: Record<Tier, { label: string; color: string; soft: string; icon: string }> = {
  GREEN: { label: 'Healthy air', color: '#287c58', soft: '#e4f3eb', icon: '✓' },
  AMBER: { label: 'Caution', color: '#9b7000', soft: '#fff3cf', icon: '!' },
  ORANGE: { label: 'Unhealthy', color: '#bb570d', soft: '#ffeadb', icon: '!' },
  RED: { label: 'Very unhealthy', color: '#b52e32', soft: '#fde5e5', icon: '×' },
  MAROON: { label: 'Hazardous', color: '#70233e', soft: '#f5e4eb', icon: '×' },
}

const verdictMeta = {
  GO: { label: 'Go ahead', text: 'Outdoor activity can continue', className: 'verdict-go' },
  MODIFY: { label: 'Make it shorter', text: 'Shorten the activity or lower its intensity', className: 'verdict-modify' },
  MOVE: { label: 'Move to a safer time', text: 'Try the suggested safer time', className: 'verdict-move' },
  CANCEL: { label: 'Keep indoors', text: 'Keep the activity indoors or cancel it', className: 'verdict-cancel' },
} as const

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatHour = (value: string) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

const composeCircular = (brief: BriefResponse) => {
  const affected = brief.slots.filter((slot) => slot.verdict !== 'GO')
  const lead =
    brief.headline.tier === 'GREEN'
      ? 'Outdoor activities can proceed as planned today.'
      : `Today’s outdoor plan has changed because the air-quality score is ${brief.headline.maxAqi} (${brief.headline.tier}).`
  const actions =
    affected.length === 0
      ? 'Please continue following normal school safety routines.'
      : affected.map((slot) => {
          const action = slot.verdict === 'MODIFY'
            ? 'should be shorter or less intense'
            : slot.verdict === 'MOVE'
              ? 'should move to a safer time'
              : 'should stay indoors'
          return `${slot.label} ${action}. ${slot.alternative}. ${slot.aqi == null ? 'No air-quality score is available.' : `Air-quality score ${Math.round(slot.aqi)}.`}`
        }).join(' ')
  const safeWindow = brief.safeWindows[0]
    ? ` A better time for this activity is ${brief.safeWindows[0].from}–${brief.safeWindows[0].to}.`
    : ''
  const simulated = brief.simulated ? 'SIMULATION ONLY — ' : ''
  return `${simulated}Dear parents and staff, ${lead} ${actions}${safeWindow} Please follow the school’s activity guidance today. This is a draft you can edit. It was not written by AI.`
}

const simulateDemoBrief = (brief: BriefResponse, input: SimulationRequest): BriefResponse => {
  const factor = 'aqiOverride' in input ? input.aqiOverride / 180 : input.scenario === 'stubble' ? 1.28 : input.scenario === 'severe' ? 1.55 : 1
  const slots = brief.slots.map((slot) => {
    const aqi = Math.min(340, Math.max(40, Math.round(slot.aqi * factor)))
    const tier: Tier = aqi >= 301 ? 'MAROON' : aqi >= 201 ? 'RED' : aqi >= 151 ? 'ORANGE' : aqi >= 101 ? 'AMBER' : 'GREEN'
    const verdict: BriefResponse['slots'][number]['verdict'] = aqi < 101 ? 'GO' : aqi < 151 ? 'MODIFY' : aqi < 201 ? 'MOVE' : 'CANCEL'
    return { ...slot, aqi, tier, verdict, reason: `AQI ${aqi} during ${slot.start}-${slot.end}` }
  })
  const maxAqi = Math.max(...slots.map((slot) => slot.aqi))
  const tier: Tier = maxAqi >= 301 ? 'MAROON' : maxAqi >= 201 ? 'RED' : maxAqi >= 151 ? 'ORANGE' : maxAqi >= 101 ? 'AMBER' : 'GREEN'
  return {
    ...brief,
    generatedAt: new Date().toISOString(),
    simulated: true,
    headline: { tier, maxAqi, text: tier === 'GREEN' ? 'Outdoor activity remains safe' : tier === 'AMBER' ? 'Keep some activities modified' : tier === 'ORANGE' ? 'Move the riskiest activities' : 'Cancel outdoor activity today' },
    slots,
    ledger: { weekMinutesAvoided: Math.round((brief.ledger.weekMinutesAvoided * factor) / 1.4), weekMinutesExposed: Math.round(brief.ledger.weekMinutesExposed * factor) },
  }
}

function Logo() {
  return (
    <div className="brand-mark" aria-label="Saans logo">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <path d="M22 4C12 9 8 16 8 24c0 8 6 15 14 16 8-1 14-8 14-16 0-8-4-15-14-20Z" />
        <path d="M22 12c-4 5-5 10-4 16 1 4 2 7 4 10M22 23c3-3 6-5 10-6M21 28c-3-2-6-3-9-3" />
      </svg>
      <span>saans</span>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="page-shell">
      <div className="skeleton-header" />
      <div className="loading-grid">
        <div className="skeleton-panel skeleton-tall" />
        <div className="skeleton-panel" />
        <div className="skeleton-panel" />
      </div>
    </div>
  )
}

function App() {
  const [selectedSchoolId, setSelectedSchoolId] = useState('delhi')
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [aqiOverride, setAqiOverride] = useState<number | null>(null)
  const [simulationInput, setSimulationInput] = useState<SimulationRequest>({ scenario: 'normal' })
  const [notice, setNotice] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'updated' | 'failed'>('idle')
  const queryClient = useQueryClient()

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: () => hasLiveApi ? api.getSchools() : isDemoMode ? Promise.resolve(schools) : Promise.reject(new Error(apiConfigurationError ?? 'Live API configuration is unavailable.')),
  })
  const briefQuery = useQuery({
    queryKey: ['brief', selectedSchoolId],
    queryFn: () => hasLiveApi ? api.getBrief(selectedSchoolId) : isDemoMode ? Promise.resolve(briefBySchool[selectedSchoolId] ?? briefBySchool.delhi) : Promise.reject(new Error(apiConfigurationError ?? 'Live API configuration is unavailable.')),
  })
  const forecastQuery = useQuery({
    queryKey: ['forecast', selectedSchoolId],
    queryFn: () => hasLiveApi ? api.getForecast(selectedSchoolId) : isDemoMode ? Promise.resolve(forecastBySchool[selectedSchoolId] ?? forecastBySchool.delhi) : Promise.reject(new Error(apiConfigurationError ?? 'Live API configuration is unavailable.')),
  })
  const simulationQuery = useQuery({
    queryKey: ['simulate', selectedSchoolId, simulationInput],
    queryFn: () =>
      hasLiveApi
        ? api.simulate(selectedSchoolId, simulationInput)
        : isDemoMode
          ? Promise.resolve(simulateDemoBrief(briefQuery.data ?? briefBySchool.delhi, simulationInput))
          : Promise.reject(new Error(apiConfigurationError ?? 'Live API configuration is unavailable.')),
    enabled: false,
  })

  const brief = simulationQuery.data ?? briefQuery.data
  const availableSchools = schoolsQuery.data ?? []
  const currentSchool = availableSchools.find((school) => school.id === selectedSchoolId) ?? availableSchools[0] ?? schools[0]
  const stale = hasLiveApi && briefQuery.data ? Date.now() - new Date(briefQuery.data.generatedAt).getTime() > 3 * 60 * 60 * 1000 : false
  const chartData = (forecastQuery.data ?? []).map((entry) => ({ ...entry, label: formatHour(entry.time) }))
  const defaultNotice = useMemo(() => (brief ? composeCircular(brief) : ''), [brief])
  const activeNotice = notice ?? defaultNotice
  const tier = brief ? tierStyles[brief.headline.tier] : tierStyles.GREEN

  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: ['schools'] })
    void queryClient.invalidateQueries({ queryKey: ['brief'] })
    void queryClient.invalidateQueries({ queryKey: ['forecast'] })
  }
  const refreshLiveData = async () => {
    setRefreshStatus('idle')
    const results = await Promise.all([briefQuery.refetch(), forecastQuery.refetch()])
    setRefreshStatus(results.some((result) => result.isError) ? 'failed' : 'updated')
  }
  const isRefreshing = briefQuery.isFetching || forecastQuery.isFetching
  const runSimulation = () => void simulationQuery.refetch()
  const copyNotice = async () => {
    try {
      await navigator.clipboard.writeText(activeNotice)
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 2200)
    } catch {
      setCopyStatus('failed')
    }
  }

  if (schoolsQuery.isLoading || briefQuery.isLoading || forecastQuery.isLoading) return <LoadingState />

  if (schoolsQuery.isError || briefQuery.isError || forecastQuery.isError) {
    const error = schoolsQuery.error?.message ?? briefQuery.error?.message ?? forecastQuery.error?.message ?? 'The live data service did not respond. Please try again.'
    return (
      <div className="page-shell centered-state">
        <Logo />
        <div className="state-card error-state">
          <span className="eyebrow">{apiConfigurationError ? 'Website setup problem' : hasLiveApi ? 'Live data connection problem' : 'Connection problem'}</span>
          <h1>We couldn’t load today’s school plan.</h1>
          <p>{apiConfigurationError ? 'The website is missing its live data address. The deployment settings need to be checked.' : error}</p>
          <button className="button button-dark" type="button" onClick={retry}>Try again</button>
        </div>
      </div>
    )
  }

  if (!availableSchools.length) {
    return (
      <div className="page-shell centered-state">
        <Logo />
        <div className="state-card">
          <span className="eyebrow">Waiting for setup</span>
          <h1>No school data is ready yet.</h1>
          <p>Add a school and load its air-quality forecast before using this page.</p>
          <button className="button button-dark" type="button" onClick={retry}>Refresh data</button>
        </div>
      </div>
    )
  }

  if (!brief) return null

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <div className="header-context">
            <span className="header-label">Today’s school plan</span>
            <span className="header-date">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <label className="school-picker">
            <span>Choose school</span>
            <select value={selectedSchoolId} onChange={(event) => { setSelectedSchoolId(event.target.value); setNotice(null); setRefreshStatus('idle'); void queryClient.removeQueries({ queryKey: ['simulate'] }) }}>
              {availableSchools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main className="page-shell">
        {isDemoMode && <div className="mode-banner"><span className="mode-dot" /> Sample view <span>This is sample data, not live air-quality information.</span></div>}
        {stale && <div className="freshness-banner"><span>!</span> This plan is more than three hours old. Refresh it before making a final decision.</div>}

        <section className="intro-row">
          <div>
            <p className="eyebrow">Today’s plan · {currentSchool.city}</p>
            <h1 className="page-title">What should happen today?</h1>
          </div>
          <div className="source-controls">
            <div className="source-note">
              <span className="source-pulse" />
              {brief.simulated ? 'Scenario result' : isDemoMode ? `Sample data · ${formatDate(brief.generatedAt)}` : `Live data · Updated ${formatDate(brief.generatedAt)}`}
            </div>
            {hasLiveApi && !brief.simulated && (
              <div className="refresh-controls">
                <button
                  type="button"
                  className="button button-outline refresh-button"
                  onClick={() => void refreshLiveData()}
                  disabled={isRefreshing}
                  aria-live="polite"
                >
                  {isRefreshing ? 'Checking air quality…' : refreshStatus === 'updated' ? 'Forecast updated' : 'Refresh forecast'}
                </button>
                {refreshStatus === 'failed' && <span className="refresh-feedback" role="status">Couldn’t refresh. Please try again.</span>}
              </div>
            )}
          </div>
        </section>

        <section className="hero-grid">
          <article className="decision-panel" style={{ '--tier': tier.color, '--tier-soft': tier.soft } as CSSProperties}>
            <div className="decision-topline">
              <span className="tier-symbol">{tier.icon}</span>
              <span className="decision-tier">{tier.label}</span>
              {brief.simulated && <span className="simulated-tag">SIMULATED</span>}
            </div>
            <div className="decision-number" aria-label={`Air-quality score ${brief.headline.maxAqi}`}><span>Air quality</span>{brief.headline.maxAqi}</div>
            <h2>{brief.headline.text}</h2>
            <p className="decision-explanation">The air-quality score could reach <strong>{brief.headline.maxAqi}</strong> during outdoor activities. Saans checks the school’s rules and suggests what to do for each activity.</p>
            <div className="decision-footer">
              <span className="policy-note">A guide for school decisions · not medical advice</span>
              <button type="button" className="link-button" onClick={() => document.getElementById('activity-timeline')?.scrollIntoView({ behavior: 'smooth' })}>See why <span>↓</span></button>
            </div>
          </article>

          <aside className="safe-panel">
            <div className="section-kicker"><span className="line" /> A better time</div>
            {brief.safeWindows[0] ? (
              <>
                <p className="safe-time">{brief.safeWindows[0].from}<span>–</span>{brief.safeWindows[0].to}</p>
                <p className="safe-copy">Saans found a later time when the air may be better for <strong>{brief.safeWindows[0].slotId}</strong>.</p>
                <div className="window-bar"><span /><span /><span className="active" /><span className="active" /><span /><span /></div>
                <div className="window-labels"><span>07:00</span><span>17:00</span></div>
              </>
            ) : (
              <div className="empty-inset">No better outdoor time was found before 5 pm. Keep this activity indoors.</div>
            )}
            <div className="safe-rule"><span>↳</span> Saans checks the school day for a better time to do the activity.</div>
          </aside>
        </section>

        <section id="activity-timeline" className="content-section timeline-section">
          <div className="section-heading">
            <div><p className="eyebrow">Activity plan</p><h2>Today’s activity plan</h2></div>
            <span className="section-caption">{brief.slots.length} activities planned</span>
          </div>
          <div className="timeline-list">
            {brief.slots.map((slot, index) => {
              const action = verdictMeta[slot.verdict]
              const slotTier = tierStyles[slot.tier]
              return (
                <article className="timeline-item" key={slot.id}>
                  <div className="timeline-time"><strong>{slot.start}</strong><span>{slot.end}</span></div>
                  <div className="timeline-rail"><span className="rail-dot" style={{ background: slotTier.color }} />{index < brief.slots.length - 1 && <span className="rail-line" />}</div>
                  <div className="timeline-main">
                    <div className="timeline-title"><h3>{slot.label}</h3><span className={`verdict ${action.className}`}>{action.label}</span></div>
                    <p>{action.text}. Air-quality score: {slot.aqi == null ? 'not available' : Math.round(slot.aqi)}. Time: {slot.start}–{slot.end}.</p>
                    <span className="timeline-alternative">{slot.alternative}</span>
                  </div>
                  <span className="tier-text" style={{ color: slotTier.color }}><span>{slotTier.icon}</span> {slot.tier}</span>
                </article>
              )
            })}
          </div>
        </section>

        <section className="analysis-grid">
          <article className="content-section forecast-section">
            <div className="section-heading"><div><p className="eyebrow">Air outlook</p><h2>Next 48 hours</h2></div><span className="section-caption">Air-quality score · hourly</span></div>
            {chartData.length === 0 ? <div className="empty-inset">No forecast readings are available for this school.</div> : (
              <figure className="chart-figure">
                <figcaption>A lower score usually means cleaner air. The school uses this score to help decide on outdoor activities.</figcaption>
                <div className="chart-wrap" role="img" aria-label="Two-day hourly air-quality forecast chart">
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 16, right: 12, left: -24, bottom: 4 }}>
                      <defs><linearGradient id="aqiFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={tier.color} stopOpacity={0.28} /><stop offset="100%" stopColor={tier.color} stopOpacity={0.01} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="2 5" stroke="#dfe5df" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} interval={5} className="chart-axis" />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 260]} className="chart-axis" />
                      <Tooltip formatter={(value: number) => [`Score ${value}`, 'Air quality']} labelFormatter={(label) => `At ${label}`} contentStyle={{ borderRadius: 12, border: '1px solid #d9e2d9', boxShadow: '0 8px 24px rgba(28, 54, 38, .12)' }} />
                      <Area type="monotone" dataKey="aqi" stroke={tier.color} fill="url(#aqiFill)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend" aria-label="AQI tier legend">{(['GREEN', 'AMBER', 'ORANGE', 'RED', 'MAROON'] as Tier[]).map((item) => <span className="legend-item" key={item}><i aria-hidden="true" style={{ background: tierStyles[item].color }} /><span>{tierStyles[item].label}</span></span>)}</div>
              </figure>
            )}
          </article>

          <article className="metric-panel">
            <div className="section-kicker"><span className="line" /> Outdoor time protected</div>
            <h2>Outdoor time kept safer</h2>
            <p>Minutes children were kept away from outdoor activities while the air was poor this week.</p>
            <div className="ledger-number">{brief.ledger.weekMinutesAvoided}<small>min</small></div>
            <div className="ledger-rule" />
            <div className="ledger-row"><span>Minutes outdoors in poor air</span><strong>{brief.ledger.weekMinutesExposed}</strong></div>
            <div className="ledger-row"><span>Forecast from</span><strong>Open-Meteo</strong></div>
          </article>
        </section>

        <section className="lower-grid">
          <article className="workspace-card simulator-card">
            <div className="workspace-heading"><div><p className="eyebrow">What if?</p><h2>Try a bad-air day</h2></div><span className="workspace-icon">↗</span></div>
            <p className="workspace-copy">Try different air-quality conditions. This changes only the preview; it does not change school data or send messages.</p>
            <fieldset className="scenario-fieldset">
              <legend>Choose a type of day</legend>
              <div className="scenario-list">
                {(['normal', 'stubble', 'severe'] as Scenario[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={scenario === item && !aqiOverride}
                    className={scenario === item && !aqiOverride ? 'scenario active' : 'scenario'}
                    onClick={() => { setScenario(item); setAqiOverride(null); setSimulationInput({ scenario: item }) }}
                  >
                    <span className="scenario-mark" aria-hidden="true">{item === 'normal' ? '○' : item === 'stubble' ? '◒' : '●'}</span>
                    <span>{item === 'normal' ? 'Usual day' : item === 'stubble' ? 'Crop-burning smoke' : 'Very poor air'}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="range-control">
              <label className="range-label" htmlFor="aqi-override">
                <span>Set air-quality score</span>
                <strong>{aqiOverride === null ? 'Off' : aqiOverride}</strong>
              </label>
              <input id="aqi-override" type="range" min="60" max="340" value={aqiOverride ?? 180} aria-valuetext={aqiOverride === null ? 'Using forecast; slider starts at 180' : `${aqiOverride} AQI`} onChange={(event) => { const value = Number(event.target.value); setAqiOverride(value); setSimulationInput({ aqiOverride: value }) }} />
              <div className="range-scale"><span>60 · Better</span><span>340 · Very poor</span></div>
            </div>
            <div className="simulator-actions"><button type="button" className="button button-dark" onClick={runSimulation} disabled={simulationQuery.isFetching}>{simulationQuery.isFetching ? 'Calculating…' : 'Show result'}</button>{simulationQuery.isError && <span className="inline-error">{simulationQuery.error.message}</span>}</div>
            <p className="micro-note">{hasLiveApi ? 'Saans checks this test day without changing school data.' : 'This test uses sample data on this computer.'} Results are always labelled simulated.</p>
          </article>

          <article className="workspace-card circular-card">
            <div className="workspace-heading"><div><p className="eyebrow">Share the call</p><h2>Message for families and staff</h2></div><span className="status-pill">{brief.simulated ? 'Simulation draft' : isDemoMode ? 'Preview template' : 'Editable template'}</span></div>
            <p className="workspace-copy">This message is made from the plan above. You can edit and copy it, but Saans does not write it with AI or send it.</p>
            {brief.simulated && <div className="simulation-notice" role="note">Test preview only — do not send this as a real school message.</div>}
            <label className="sr-only" htmlFor="notice">Editable message for families and staff</label>
            <textarea id="notice" value={activeNotice} onChange={(event) => setNotice(event.target.value)} className="notice-editor" />
            <div className="composer-footer"><span>Draft only · review before sharing</span><button type="button" className="button button-outline" onClick={copyNotice} aria-live="polite">{copyStatus === 'copied' ? 'Copied ✓' : copyStatus === 'failed' ? 'Copy failed' : 'Copy notice'}</button></div>
          </article>
        </section>
      </main>

    </div>
  )
}

export default App
