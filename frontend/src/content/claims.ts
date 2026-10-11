export const claims = {
  liveBackend: Boolean(import.meta.env.VITE_API_BASE),
  notificationsLive: false,
  aiCircularLive: false,
  changeDetection: false,
  ciCdLive: false,
  observabilityLive: false,
} as const
