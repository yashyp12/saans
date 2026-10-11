import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { claims } from './content/claims'
import { useReveal } from './hooks'

const repo = 'https://github.com/yashyp12/saans'
const issueUrl = `${repo}/issues`
const external = { target: '_blank', rel: 'noopener noreferrer' }

function Logo() {
  return <span className="site-logo"><svg viewBox="0 0 44 44" aria-hidden="true"><path d="M22 4C12 9 8 16 8 24c0 8 6 15 14 16 8-1 14-8 14-16 0-8-4-15-14-20Z" /><path d="M22 12c-4 5-5 10-4 16 1 4 2 7 4 10M22 23c3-3 6-5 10-6M21 28c-3-2-6-3-9-3" /></svg><span>saans</span></span>
}

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname, location.hash])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])
  const navigate = useNavigate()
  const scrollTo = (id: string) => {
    setOpen(false)
    if (location.pathname === '/' || location.pathname === '') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/')
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120)
    }
  }
  return <header className="site-nav">
    <div className="nav-inner">
      <Link to="/" aria-label="Saans home"><Logo /></Link>
      <button className="menu-button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}><span /> <span /> <span /><b>Menu</b></button>
      <nav id="site-menu" className={`nav-links ${open ? 'nav-open' : ''}`} aria-label="Primary">
        <button type="button" className="nav-section-link" onClick={() => scrollTo('problem')}>Problem</button>
        <button type="button" className="nav-section-link" onClick={() => scrollTo('how')}>How it works</button>
        <button type="button" className="nav-section-link" onClick={() => scrollTo('features')}>Features</button>
        <NavLink to="/docs">Docs</NavLink>
        <a href={repo} {...external}>GitHub</a><Link className="nav-cta" to="/app">Open briefing</Link>
      </nav>
    </div>
  </header>
}

export function SiteFooter() {
  const demoVideo = import.meta.env.VITE_DEMO_VIDEO_URL
  const blog = import.meta.env.VITE_BLOG_URL
  return <footer className="site-footer-rich">
    <div className="footer-grid">
      <div><Link to="/"><Logo /></Link><p>Saans helps school leaders turn air-quality forecasts into calm, practical activity decisions.</p><span className="footer-chip">Built for Environmental Hacks 2026</span></div>
      <div><h3>Product</h3><Link to="/app">Open briefing</Link><Link to="/">Problem</Link><Link to="/">How it works</Link><Link to="/">Features</Link></div>
      <div><h3>Resources</h3><Link to="/docs">Documentation</Link><Link to="/docs#architecture">Architecture</Link><Link to="/docs#api">API reference</Link><a href={repo} {...external}>GitHub repository</a><a href={issueUrl} {...external}>Report an issue</a>{demoVideo && <a href={demoVideo} {...external}>Demo video</a>}{blog && <a href={blog} {...external}>Blog post</a>}</div>
      <div><h3>Legal</h3><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/disclaimer">Disclaimer</Link><a href={`${repo}/blob/main/LICENSE`} {...external}>MIT licence</a></div>
    </div>
    <div className="footer-bottom"><span>© 2026 Saans. Open-source under the MIT License.</span><span>Forecast data provided by Open-Meteo. Thresholds are example school-policy settings, not medical advice.</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></div>
  </footer>
}

function Reveal({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal<HTMLElement>()
  return <section ref={ref} id={id} className={`${className} reveal ${visible ? 'is-visible' : ''}`}>{children}</section>
}

const verdicts = [
  ['GO', 'Conditions are within the school’s limit. Carry on as planned.', 'PT stays outside.'],
  ['MODIFY', 'Shorten it or lower the intensity, especially for younger grades.', 'Shorter assembly.'],
  ['MOVE', 'Unsafe now, but a safer window exists. Saans names the time.', 'PT at 16:00.'],
  ['CANCEL', 'Keep children indoors and use the suggested indoor alternative.', 'Indoor yoga.'],
]

function SamplePreview() {
  return <div className="sample-preview"><div className="sample-label">Sample briefing</div><div className="sample-top"><span>DEMO SCHOOL DELHI</span><b>FRI · 9 OCT</b></div><div className="sample-aqi"><div><small>RED · VERY UNHEALTHY</small><strong>AQI 238</strong><p>Cancel outdoor activity today</p></div><i>×</i></div><div className="sample-timeline">{[['08:00', 'Assembly', 'MOVE'], ['11:00', 'PT', 'CANCEL'], ['13:00', 'Lunch', 'MOVE'], ['14:30', 'Dispersal', 'GO']].map(([time, label, action]) => <div key={label}><span>{time}</span><b>{label}</b><em className={`mini-${action.toLowerCase()}`}>{action}</em></div>)}</div></div>
}

function Architecture() {
  return <div className="architecture"><svg viewBox="0 0 900 260" role="img" aria-label="Saans architecture flow"><title>Browser to API and forecast decision flow</title><path className="arch-line" d="M110 85H250M330 85h140M550 85h140M110 185h140M330 185h140M550 185h140" /><g className="arch-node"><rect x="20" y="55" width="90" height="60" /><text x="65" y="90">Browser</text></g><g className="arch-node"><rect x="250" y="55" width="80" height="60" /><text x="290" y="90">CloudFront</text></g><g className="arch-node"><rect x="470" y="55" width="80" height="60" /><text x="510" y="90">API</text></g><g className="arch-node"><rect x="690" y="55" width="90" height="60" /><text x="735" y="90">DynamoDB</text></g><g className="arch-node"><rect x="250" y="155" width="80" height="60" /><text x="290" y="190">Ingest</text></g><g className="arch-node"><rect x="470" y="155" width="80" height="60" /><text x="510" y="190">Decide</text></g><g className="arch-node"><rect x="690" y="155" width="90" height="60" /><text x="735" y="190">Open-Meteo</text></g></svg></div>
}

export function Landing() {
  const [faq, setFaq] = useState<number | null>(null)
  return <><SiteNav /><main id="main-content">
    <section className="landing-hero"><div className="hero-copy"><p className="eyebrow">Air-quality decisions for schools</p><h1>Know what to do on bad-air days. <em>Before the bell.</em></h1><p className="hero-sub">Saans turns the air-quality forecast and your school timetable into a clear decision for every outdoor activity (go, modify, move or cancel), with a reviewable notice template.</p><div className="hero-actions"><Link className="button button-dark" to="/app">Open today’s briefing →</Link><button type="button" className="button button-ghost" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>See how it works ↓</button></div><p className="trust-line">Free forecast data · Serverless on AWS · Open source (MIT)</p></div><div className="hero-visual"><SamplePreview /><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /></div></section>
    <Reveal id="problem" className="landing-section" ><p className="eyebrow">The problem</p><h2>A number isn’t a decision.</h2><p className="section-intro">On a high-pollution morning, a principal has to decide, within minutes, whether assembly, PT and outdoor breaks go ahead. A weather app gives a number. It does not give an answer.</p><div className="problem-grid">{[['01', 'AQI says how bad, not what to do.', 'Is 180 fine for Class 11 PT but not for nursery? Most apps leave that to guesswork.'], ['02', 'One limit doesn’t fit every child.', 'Younger children are more sensitive to polluted air, so a single school-wide threshold is a blunt tool.'], ['03', 'The bad hours aren’t every hour.', 'Air quality shifts through the day. Saans lines the forecast up against the timetable.'], ['04', 'Then everyone needs to be told.', 'A decision only protects children once parents and teachers hear it, in a language they read.']].map(([number, title, text]) => <article className="problem-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></Reveal>
    <Reveal className="landing-section solution-section"><p className="eyebrow">The answer</p><h2>Four answers for every activity.</h2><div className="verdict-grid">{verdicts.map(([name, text, example]) => <article className={`verdict-tile tile-${name.toLowerCase()}`} key={name}><span className="tile-icon">{name === 'GO' ? '✓' : name === 'MODIFY' ? '~' : name === 'MOVE' ? '→' : '×'}</span><strong>{name}</strong><p>{text}</p><small>{example}</small></article>)}</div></Reveal>
    <Reveal id="how" className="landing-section how-section"><p className="eyebrow">How it works</p><h2>From forecast to notice in four steps.</h2><div className="steps">{[['01', 'Read the forecast', 'Hourly PM2.5, PM10 and US AQI for the next 48 hours.'], ['02', 'Check the timetable', 'Each outdoor slot is compared with the worst hour inside it.'], ['03', 'Decide', 'Every slot gets GO, MODIFY, MOVE or CANCEL, with the reason.'], ['04', 'Tell people', 'A reviewable notice template can be prepared from the decision.']].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="claim-line">{claims.changeDetection ? 'Alerts fire only when a decision changes, so staff are not flooded with repeats.' : 'Every decision is visible, explainable and ready for a principal to review.'}</p></Reveal>
    <Reveal className="landing-section preview-section"><div className="section-heading-wide"><div><p className="eyebrow">The product</p><h2>See the whole day at a glance.</h2></div><Link to="/app">Open the briefing →</Link></div><div className="preview-frame"><SamplePreview /></div><p className="sample-caption">Sample data shown. Open the briefing for the live view.</p></Reveal>
    <Reveal id="features" className="landing-section"><p className="eyebrow">What it does</p><h2>Built around the principal’s decision.</h2><div className="feature-bento">{['Activity-level verdicts', 'Safe-window finder', 'Grade-aware limits', 'Notice template', 'Exposure ledger', 'What-if simulator', 'Transparent by design'].map((title, index) => <article key={title} className={index === 0 || index === 6 ? 'feature-wide' : ''}><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{['GO, MODIFY, MOVE or CANCEL for each timetable slot.', 'Names the nearest safer span when one exists.', 'Younger grades can be evaluated one tier stricter.', 'Draft text for parents and staff to review before sharing.', 'Outdoor minutes moved or cancelled during unhealthy air.', 'Preview Normal, Stubble season or Severe without sending anything.', 'Every verdict shows its reason, AQI and policy context.'][index]}</p></article>)}</div></Reveal>
    <Reveal id="architecture" className="landing-section architecture-section"><p className="eyebrow">The system</p><h2>Serverless, reproducible.</h2><Architecture /><div className="infra-list"><span>Infrastructure as code · AWS SAM</span><span>Least-privilege function access</span><span>Forecast ingestion and API functions</span></div><Link to="/docs#architecture">Read the architecture docs →</Link></Reveal>
    <Reveal className="limits-section"><div><p className="eyebrow">Honest limits</p><h2>What Saans is, and isn’t.</h2></div><div className="limits-list"><p><b>It uses a modelled forecast</b>, not a sensor at your gate.</p><p><b>Thresholds are an example school policy</b>, not medical or government guidance.</p><p><b>It supports the principal’s judgement</b>; it does not replace it.</p></div><Link to="/disclaimer">Read the safety disclaimer →</Link></Reveal>
    <Reveal className="landing-section faq-section"><p className="eyebrow">Questions</p><h2>Before you open the brief.</h2>{[['Where does the air-quality data come from?', 'Open-Meteo’s Air Quality forecast, a free, keyless service. Values are modelled forecasts.'], ['Why US AQI and not India’s NAQI?', 'The data source provides US and European indices. NAQI support is on the roadmap.'], ['Is this medical advice?', 'No. See the safety disclaimer.'], ['Does it need accounts or logins?', 'No. The current prototype has no authentication.'], ['Can we change the thresholds?', 'Yes. The policy is configurable per school.'], ['Is it open source?', 'Yes, MIT licensed.']].map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faq === index} onClick={() => setFaq(faq === index ? null : index)}><span>{question}</span><b>{faq === index ? '−' : '+'}</b></button>{faq === index && <p>{answer} {index === 5 && <a href={repo} {...external}>View the repository.</a>}</p>}</div>)}</Reveal>
    <section className="final-cta"><h2>Make the call with confidence.</h2><div><Link className="button button-light" to="/app">Open today’s briefing</Link><a className="button button-outline-light" href={repo} {...external}>View on GitHub</a></div></section>
  </main><SiteFooter /></>
}

type DocsSection = [string, string, React.ReactNode]

const docsSections: DocsSection[] = [
  ['overview', 'Overview', <>Saans is a school air-quality decision engine, not a dashboard. It turns an hourly forecast and a school timetable into activity-level actions for principals.</>],
  ['rules', 'AQI tiers and decision rules', <>The default US AQI tiers are GREEN 0–100, AMBER 101–150, ORANGE 151–200, RED 201–300 and MAROON 301+. Outdoor slots receive GO, MODIFY, MOVE or CANCEL according to the configured policy.</>],
  ['policy', 'Grade-aware policy and safe windows', <>Nursery–5 may be evaluated one tier worse than the measured tier. A safe window is the nearest contiguous school-day span at or below AMBER that is at least as long as the activity.</>],
  ['data', 'Data sources and freshness', <>The planned source is Open-Meteo Air Quality. Values are modelled forecasts, not readings from a sensor at the school gate. The interface warns when live brief data is older than three hours.</>],
  ['architecture', 'Verified architecture and data flow', <><Architecture /><p>Infrastructure is defined through AWS SAM. The browser is hosted by S3 and CloudFront, calls API Gateway, and the API reads school data and forecasts before running the pure decision engine. Verify deployment outputs before publishing.</p></>],
  ['api', 'API endpoint reference', <><table className="docs-table"><thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead><tbody>{[['GET', '/schools', 'List seeded schools'], ['GET', '/schools/{id}/brief', 'Today’s decision'], ['GET', '/schools/{id}/forecast', 'Next 48 hours'], ['POST', '/schools/{id}/simulate', 'In-memory what-if result']].map((row) => <tr key={row[1]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table><pre><code>{`POST /schools/delhi/simulate\n{ "scenario": "stubble" }\n\nResponse: brief shape with simulated: true`}</code></pre></>],
  ['setup', 'Local setup and deployment', <><p>Install Node.js 20+, then:</p><pre><code>{`cd frontend\nnpm install\nVITE_API_BASE=https://<api-url> npm run build\n# publish dist/ through the approved hosting workflow`}</code></pre><p>Run the backend tests from <code>backend/</code> with <code>pytest</code>. Do not commit credentials or private school coordinates.</p></>],
  ['security', 'Security and privacy', <>The prototype does not provide authentication or user management. Avoid putting secrets in the frontend bundle. Report issues through the repository issue tracker.</>],
  ['roadmap', 'Roadmap and limitations', <>Email notifications, Bedrock drafting, change detection, CI/CD observability, login and Indian NAQI are not presented as live capabilities here. See the plan and repository for the current implementation boundary.</>],
]

export function Docs() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''))
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [location.hash])
  const scrollDoc = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return <><SiteNav /><main className="docs-page"><div className="docs-hero"><p className="eyebrow">Saans documentation</p><h1>Understand the decision engine.</h1><p>Product context, policy rules, architecture and the API contract in one place.</p></div><div className="docs-layout"><aside className="docs-toc"><span>On this page</span>{docsSections.map(([id, title]) => <button key={id} type="button" className="toc-link" onClick={() => scrollDoc(id)}>{title}</button>)}</aside><article className="docs-content">{docsSections.map(([id, title, content]) => <section id={id} key={id}><h2><button type="button" className="heading-anchor" onClick={() => scrollDoc(id)} aria-label={`Link to ${title}`}>#</button>{title}</h2>{content}</section>)}</article></div></main><SiteFooter /></>
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <><SiteNav /><main className="legal-page"><p className="eyebrow">Saans · Open-source hackathon prototype</p><h1>{title}</h1><p className="legal-date">Last updated: 11 October 2026</p>{children}<p className="legal-contact">Questions or corrections? Use the <a href={issueUrl} {...external}>repository Issues page</a>.</p></main><SiteFooter /></>
}

export function Privacy() { return <LegalPage title="Privacy policy"><h2>What this prototype is</h2><p>Saans is an open-source hackathon prototype. The current frontend does not provide accounts, authentication, analytics or a newsletter.</p><h2>Forecast and school data</h2><p>Air-quality values are modelled forecasts from Open-Meteo. Example school records and policy settings support the demonstration. Do not enter private or sensitive information into an unapproved deployment.</p><h2>Questions</h2><p>This prototype makes no promise of a particular retention, availability or compliance arrangement. Confirm operational privacy requirements before real-world use.</p></LegalPage> }
export function Terms() { return <LegalPage title="Terms of use"><h2>Prototype provided as-is</h2><p>Saans is provided as an open-source hackathon prototype under the MIT licence, without warranty or guarantee of availability, accuracy or suitability.</p><h2>Use at your own risk</h2><p>Forecasts are modelled. Thresholds are an example school policy. You remain responsible for checking inputs, local requirements and decisions made from the interface.</p></LegalPage> }
export function Disclaimer() { return <LegalPage title="Safety disclaimer"><h2>Not medical advice</h2><p>Saans does not provide medical, governmental or emergency advice. Its thresholds are an example school policy, not official health guidance.</p><h2>Principal judgement remains central</h2><p>Verify decisions with local authorities and appropriate health staff. Do not rely on Saans in an emergency, and do not treat a forecast as a sensor reading at your gate.</p></LegalPage> }

export function NotFound() { return <><SiteNav /><main className="not-found"><Logo /><p className="eyebrow">404 · Air not found</p><h1>This page drifted away.</h1><p>That route is not part of the Saans briefing.</p><div><Link className="button button-dark" to="/">Return home</Link><Link className="button button-ghost" to="/app">Open briefing</Link></div></main><SiteFooter /></> }
