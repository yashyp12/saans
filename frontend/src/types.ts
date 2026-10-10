export type Tier = 'GREEN' | 'AMBER' | 'ORANGE' | 'RED' | 'MAROON'
export type Verdict = 'GO' | 'MODIFY' | 'MOVE' | 'CANCEL'

export type School = {
  id: string
  name: string
  city: string
}

export type Slot = {
  id: string
  label: string
  start: string
  end: string
  aqi: number
  tier: Tier
  verdict: Verdict
  reason: string
  alternative: string
}

export type BriefResponse = {
  school: School
  generatedAt: string
  headline: {
    tier: Tier
    maxAqi: number
    text: string
  }
  slots: Slot[]
  safeWindows: { slotId: string; from: string; to: string }[]
  ledger: {
    weekMinutesAvoided: number
    weekMinutesExposed: number
  }
  source: string
  simulated: boolean
}

export type ForecastPoint = {
  time: string
  aqi: number
  tier: Tier
}
