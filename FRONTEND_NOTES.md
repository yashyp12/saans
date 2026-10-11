# Frontend delivery notes

## Implemented

- Added a HashRouter website with landing, briefing, documentation, privacy, terms, disclaimer and designed not-found routes.
- Added shared responsive navigation, skip link, branded footer, custom SVG mark and forest/cream design tokens.
- Added claims flags in `frontend/src/content/claims.ts`; unverified integrations remain disabled.
- Preserved the existing typed briefing API client and dashboard behavior under `/#/app`.
- Added truthful product, API, architecture and safety content. Forecast data remains labelled as modelled data or sample data where appropriate.

## Owner verification before shipping

- Confirm the deployed API origin, CORS policy and seeded school data.
- Confirm the legal last-updated date and review the prototype privacy/terms language.
- Confirm architecture claims against the final CloudFormation/SAM deployment.
- Confirm any optional demo-video or blog URLs through `VITE_DEMO_VIDEO_URL` and `VITE_BLOG_URL`.

## Known limitations

- Browser screenshot, Lighthouse, keyboard traversal and exact responsive-width checks were not available in this environment.
- Live notification delivery, Bedrock drafting, subscriber management and change-detection alerts are not claimed as operational.
- The dashboard uses its existing chart implementation; an accessible data table and richer threshold overlays remain follow-up work.

## Required configuration

Set `VITE_API_BASE` for a live API build. Without it, non-production development may use explicitly labelled local sample fixtures; production shows a configuration error instead.
