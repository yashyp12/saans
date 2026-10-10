import type { BriefResponse, School, Tier, Verdict, ForecastPoint } from '../types'

export type { BriefResponse, ForecastPoint, School, Tier, Verdict } from '../types'

export const schools: School[] = [
  { id: 'delhi', name: 'Demo School Delhi', city: 'Delhi' },
  { id: 'lucknow', name: 'Demo School Lucknow', city: 'Lucknow' },
  { id: 'bengaluru', name: 'Demo School Bengaluru', city: 'Bengaluru' },
]

const baseBrief: BriefResponse = {
  school: schools[0],
  generatedAt: '2026-10-09T05:30:00+05:30',
  headline: { tier: 'RED', maxAqi: 238, text: 'Cancel outdoor activity today' },
  slots: [
    {
      id: 'assembly',
      label: 'Assembly',
      start: '08:00',
      end: '08:20',
      aqi: 142,
      tier: 'AMBER',
      verdict: 'MODIFY',
      reason: 'AQI 142 during 08:00-08:20',
      alternative: 'Indoor morning briefing',
    },
    {
      id: 'pt',
      label: 'PT',
      start: '11:00',
      end: '11:45',
      aqi: 231,
      tier: 'RED',
      verdict: 'CANCEL',
      reason: 'AQI 231 during 11:00-11:45',
      alternative: 'Indoor yoga in classrooms',
    },
    {
      id: 'lunch',
      label: 'Lunch',
      start: '13:00',
      end: '13:40',
      aqi: 178,
      tier: 'ORANGE',
      verdict: 'MOVE',
      reason: 'AQI 178 during 13:00-13:40',
      alternative: 'Take lunch indoors by the hall',
    },
    {
      id: 'dispersal',
      label: 'Dispersal',
      start: '14:30',
      end: '15:00',
      aqi: 96,
      tier: 'GREEN',
      verdict: 'GO',
      reason: 'AQI 96 during 14:30-15:00',
      alternative: 'Covered gate queue remains open',
    },
  ],
  safeWindows: [{ slotId: 'pt', from: '15:30', to: '16:15' }],
  ledger: { weekMinutesAvoided: 135, weekMinutesExposed: 0 },
  source: 'open-meteo',
  simulated: false,
}

export const briefBySchool: Record<string, BriefResponse> = {
  delhi: baseBrief,
  lucknow: {
    ...baseBrief,
    school: schools[1],
    headline: { tier: 'ORANGE', maxAqi: 182, text: 'Move outdoor activity to the safest window' },
    slots: baseBrief.slots.map((slot) => ({
      ...slot,
      aqi: slot.id === 'pt' ? 182 : slot.id === 'assembly' ? 118 : slot.id === 'lunch' ? 150 : 82,
      tier: slot.id === 'pt' ? 'ORANGE' : slot.id === 'assembly' ? 'AMBER' : slot.id === 'lunch' ? 'ORANGE' : 'GREEN',
      verdict: (slot.id === 'pt' ? 'MOVE' : slot.id === 'assembly' ? 'MODIFY' : slot.id === 'lunch' ? 'MOVE' : 'GO') as Verdict,
      reason: slot.id === 'pt' ? 'AQI 182 during 11:00-11:45' : slot.reason,
      alternative: slot.id === 'pt' ? 'Shift to 15:30-16:15' : slot.alternative,
    })),
    safeWindows: [{ slotId: 'pt', from: '15:30', to: '16:15' }],
    ledger: { weekMinutesAvoided: 90, weekMinutesExposed: 25 },
  } as BriefResponse,
  bengaluru: {
    ...baseBrief,
    school: schools[2],
    headline: { tier: 'GREEN', maxAqi: 76, text: 'Outdoor activities remain safe today' },
    slots: baseBrief.slots.map((slot) => ({
      ...slot,
      aqi: slot.id === 'assembly' ? 82 : slot.id === 'pt' ? 70 : slot.id === 'lunch' ? 60 : 76,
      tier: 'GREEN' as Tier,
      verdict: 'GO' as Verdict,
      reason: 'AQI within a healthy range',
      alternative: 'No special restriction needed',
    })),
    safeWindows: [],
    ledger: { weekMinutesAvoided: 0, weekMinutesExposed: 0 },
  } as BriefResponse,
}

const buildForecastData = (schoolId: string): ForecastPoint[] => {
  const base = schoolId === 'delhi' ? 120 : schoolId === 'lucknow' ? 95 : 58
  const data: ForecastPoint[] = []
  for (let hour = 0; hour < 48; hour += 1) {
    const value = Math.max(45, Math.min(260, base + Math.sin(hour / 3.4) * 48 + (hour % 12) * 2.6 + (schoolId === 'delhi' ? 18 : 0)))
    const rounded = Math.round(value)
    let tier: Tier = 'GREEN'
    if (rounded >= 301) tier = 'MAROON'
    else if (rounded >= 201) tier = 'RED'
    else if (rounded >= 151) tier = 'ORANGE'
    else if (rounded >= 101) tier = 'AMBER'
    data.push({
      time: new Date(Date.UTC(2026, 9, 9 + Math.floor(hour / 24), hour % 24, 0)).toISOString(),
      aqi: rounded,
      tier,
    })
  }
  return data
}

export const forecastBySchool: Record<string, ForecastPoint[]> = {
  delhi: buildForecastData('delhi'),
  lucknow: buildForecastData('lucknow'),
  bengaluru: buildForecastData('bengaluru'),
}

export const circularDraft = {
  en: 'Dear parents and staff, due to elevated AQI levels, outdoor activities have been moved to a safe indoor schedule today. Please keep young students indoors and follow the school guidance for the afternoon window.',
  hi: 'प्रिय अभिभावक और शिक्षकों, वायु गुणवत्ता के कारण आज बाहरी गतिविधियों को सुरक्षित इनडोर समय सारिणी में बदल दिया गया है। कृपया छोटे बच्चों को अंदर रखें और दोपहर के समय के लिए स्कूल के निर्देशों का पालन करें।',
  status: 'AI draft',
}

export const subscribers = [
  { email: 'principal@demo.school', role: 'Principal', confirmed: true },
  { email: 'teachers@demo.school', role: 'Teachers', confirmed: true },
]

export const nextScenarioAdjustments: Record<string, number> = {
  normal: 1,
  stubble: 1.28,
  severe: 1.55,
}
