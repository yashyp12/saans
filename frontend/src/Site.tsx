import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { claims } from './content/claims'
import { getScrollBehavior, useReveal } from './hooks'

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
      document.getElementById(id)?.scrollIntoView({ behavior: getScrollBehavior() })
    } else {
      navigate('/')
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: getScrollBehavior() }), 120)
    }
  }
  return <header className="site-nav">
    <div className="nav-inner">
      <Link
        to="/"
        aria-label="Saans home"
        onClick={(event) => {
          setOpen(false)
          if (location.pathname === '/') {
            event.preventDefault()
            window.scrollTo({ top: 0, behavior: getScrollBehavior() })
          } else {
            window.setTimeout(() => window.scrollTo({ top: 0, behavior: getScrollBehavior() }), 120)
          }
        }}
      ><Logo /></Link>
      <button className="menu-button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}><span /> <span /> <span /><b>{open ? "Close" : "Menu"}</b></button>
      <nav id="site-menu" className={`nav-links ${open ? 'nav-open' : ''}`} aria-label="Primary">
        <button type="button" className="nav-section-link" onClick={() => scrollTo('problem')}>Problem</button>
        <button type="button" className="nav-section-link" onClick={() => scrollTo('how')}>How it works</button>
        <button type="button" className="nav-section-link" onClick={() => scrollTo('features')}>Features</button>
        <NavLink to="/docs">Docs</NavLink>
        <a href={repo} {...external}>GitHub</a><Link className="nav-login" to="/login">Principal login</Link><Link className="nav-cta" to="/app">Today's plan</Link>
      </nav>
    </div>
  </header>
}

export function SiteFooter() {
  return (
    <footer className="site-footer-rich">
      <div className="footer-bottom">
        <span>All rights reserved by Team Saans 2026.</span>
      </div>
    </footer>
  )
}

function Reveal({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal<HTMLElement>()
  return <section ref={ref} id={id} className={`${className} reveal ${visible ? 'is-visible' : ''}`}>{children}</section>
}

const verdicts = [
  ['GO', 'Go ahead', 'The air is within the school’s chosen limit.', 'PT can stay outside.'],
  ['MODIFY', 'Make it shorter', 'Keep the activity brief or less intense.', 'Shorter assembly.'],
  ['MOVE', 'Move to a safer time', 'The air may be better later. Check the suggested time.', 'PT at 16:00.'],
  ['CANCEL', 'Keep indoors', 'Use an indoor option when outdoor air is too poor.', 'Indoor yoga.'],
]

function SamplePreview() {
  return <div className="sample-preview"><div className="sample-label">Example plan</div><div className="sample-top"><span>DEMO SCHOOL · DELHI</span><b>FRI · 9 OCT</b></div><div className="sample-aqi"><div><small>FORECAST: VERY POOR AIR</small><strong>238</strong><p>Keep outdoor activities indoors today</p></div><i>×</i></div><div className="sample-timeline">{[['08:00', 'Assembly', 'MOVE', 'Move later'], ['11:00', 'PT', 'CANCEL', 'Keep indoors'], ['13:00', 'Lunch', 'MOVE', 'Move later'], ['14:30', 'Dispersal', 'GO', 'Go ahead']].map(([time, label, action, actionLabel]) => <div key={label}><span>{time}</span><b>{label}</b><em className={`mini-${action.toLowerCase()}`}>{actionLabel}</em></div>)}</div></div>
}

function Architecture() {
  return (
    <div className="architecture">
      <div className="architecture-diagram">
        <svg viewBox="0 0 900 260" role="img" aria-label="Technical diagram showing how the website, data service and forecast source connect">
          <title>Website, data service, database and forecast source</title>
          <path className="arch-line" d="M110 85H250M330 85h140M550 85h140M110 185h140M330 185h140M550 185h140" />
          <g className="arch-node"><rect x="20" y="55" width="90" height="60" /><text x="65" y="90">Website</text></g>
          <g className="arch-node"><rect x="250" y="55" width="80" height="60" /><text x="290" y="90">CloudFront</text></g>
          <g className="arch-node"><rect x="470" y="55" width="80" height="60" /><text x="510" y="90">API</text></g>
          <g className="arch-node"><rect x="690" y="55" width="90" height="60" /><text x="735" y="90">Database</text></g>
          <g className="arch-node"><rect x="250" y="155" width="80" height="60" /><text x="290" y="190">Forecast</text></g>
          <g className="arch-node"><rect x="470" y="155" width="80" height="60" /><text x="510" y="190">Decisions</text></g>
          <g className="arch-node"><rect x="690" y="155" width="90" height="60" /><text x="735" y="190">Open-Meteo</text></g>
        </svg>
      </div>
      <ol className="architecture-mobile" aria-label="How Saans works">
        <li><strong>1. Get the forecast</strong><span>Saans gets an estimate of air quality for the school’s area.</span></li>
        <li><strong>2. Save the readings</strong><span>The cloud stores the forecast and school timetable.</span></li>
        <li><strong>3. Make a daily plan</strong><span>Saans checks each outdoor activity and suggests what to do.</span></li>
        <li><strong>4. Show the result</strong><span>The website displays the plan for the school team to review.</span></li>
      </ol>
    </div>
  )
}

export function Landing() {
  const [faq, setFaq] = useState<number | null>(null)
  return <><SiteNav /><main id="main-content">
    <section className="landing-hero"><div className="hero-copy"><p className="eyebrow">Air-quality decisions for schools</p><h1>Know what to do on bad-air days. <em>Before the bell.</em></h1><p className="hero-sub">Saans checks the air-quality forecast and the school day, then suggests what to do with each outdoor activity: continue, make it shorter, move it to a safer time, or keep it indoors. It can also draft a message for families and staff to review.</p><div className="hero-actions"><Link className="button button-dark" to="/app">See today’s plan →</Link><button type="button" className="button button-ghost" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: getScrollBehavior() })}>See how it works ↓</button></div><p className="trust-line">Free air-quality forecasts · Runs in the cloud · Open source</p></div><div className="hero-visual"><SamplePreview /><span className="hero-orbit orbit-one" /><span className="hero-orbit orbit-two" /></div></section>
    <Reveal id="problem" className="landing-section" ><p className="eyebrow">The problem</p><h2>A score alone doesn’t tell a school what to do.</h2><p className="section-intro">On a day with poor air, school leaders need to decide quickly whether assembly, sports and breaks should happen outside. A weather app gives a score, but not a clear next step.</p><div className="problem-grid">{[['01', 'A score alone does not explain what to do.', 'Should older students go outside when younger children need extra care? Many apps leave that choice to the school.'], ['02', 'Younger children may need extra care.', 'Schools may set stricter outdoor rules for younger grades.'], ['03', 'Air quality can change during the day.', 'Saans checks the forecast against the times activities are planned.'], ['04', 'Families and staff need a clear message.', 'A plan helps most when families and staff can understand it easily.']].map(([number, title, text]) => <article className="problem-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div></Reveal>
    <Reveal className="landing-section solution-section"><p className="eyebrow">The answer</p><h2>A clear next step for every activity.</h2><div className="verdict-grid">{verdicts.map(([name, label, text, example]) => <article className={`verdict-tile tile-${name.toLowerCase()}`} key={name}><span className="tile-icon">{name === 'GO' ? '✓' : name === 'MODIFY' ? '~' : name === 'MOVE' ? '→' : '×'}</span><strong>{label}</strong><p>{text}</p><small>{example}</small></article>)}</div></Reveal>
    <Reveal id="how" className="landing-section how-section"><p className="eyebrow">How it works</p><h2>From air forecast to school plan in four steps.</h2><div className="steps">{[['01', 'Read the forecast', 'We get a two-day air-quality forecast for the school’s area.'], ['02', 'Check the timetable', 'We check the forecast during each planned outdoor activity.'], ['03', 'Decide', 'Each activity gets a clear next step: continue, shorten, move to a safer time, or stay indoors.'], ['04', 'Tell people', 'A reviewable notice template can be prepared from the decision.']].map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className="claim-line">{claims.changeDetection ? 'Alerts fire only when a decision changes, so staff are not flooded with repeats.' : 'Every suggestion shows why it was made, so a school leader can review it.'}</p></Reveal>
    <Reveal className="landing-section preview-section"><div className="section-heading-wide"><div><p className="eyebrow">The product</p><h2>See the whole day at a glance.</h2></div><Link to="/app">Open the briefing →</Link></div><div className="preview-frame"><SamplePreview /></div><p className="sample-caption">Sample data shown. Open the briefing for the live view.</p></Reveal>
    <Reveal id="features" className="landing-section"><p className="eyebrow">What it does</p><h2>Built around a school’s daily choices.</h2><div className="feature-bento">{['Activity-level verdicts', 'Safe-window finder', 'Grade-aware limits', 'Notice template', 'Exposure ledger', 'What-if simulator', 'Transparent by design'].map((title, index) => <article key={title} className={index === 0 || index === 6 ? 'feature-wide' : ''}><span className="feature-number">0{index + 1}</span><h3>{title}</h3><p>{['GO, MODIFY, MOVE or CANCEL for each timetable slot.', 'Names the nearest safer span when one exists.', 'Younger grades can be evaluated one tier stricter.', 'Draft text for parents and staff to review before sharing.', 'Outdoor minutes moved or cancelled during unhealthy air.', 'Preview Normal, Stubble season or Severe without sending anything.', 'Every verdict shows its reason, AQI and policy context.'][index]}</p></article>)}</div></Reveal>
    <Reveal id="architecture" className="landing-section architecture-section"><p className="eyebrow">How the pieces fit together</p><h2>Built to run in the cloud.</h2><Architecture /><div className="infra-list"><span>Cloud setup defined in code</span><span>Each service gets only the access it needs</span><span>Collect forecasts and show the school plan</span></div><Link to="/docs#architecture">Read the architecture docs →</Link></Reveal>
    <Reveal className="limits-section"><div><p className="eyebrow">Honest limits</p><h2>What Saans is, and isn’t.</h2></div><div className="limits-list"><p><b>It uses a modelled forecast</b>, not a sensor at your gate.</p><p><b>Thresholds are an example school policy</b>, not medical or government guidance.</p><p><b>It supports the principal’s judgement</b>; it does not replace it.</p></div><Link to="/disclaimer">Read the safety disclaimer →</Link></Reveal>
    <Reveal className="landing-section faq-section"><p className="eyebrow">Questions</p><h2>Common questions</h2>{[['Where do the air-quality numbers come from?', 'We use Open-Meteo’s air-quality forecast. These are modelled estimates, not readings from a sensor at the school.'], ['What does the air-quality score mean?', 'It is a common score for describing how polluted the air may be. This version uses the US scale; it does not calculate India’s NAQI.'], ['Is this medical advice?', 'No. See the safety disclaimer.'], ['Do I need to sign in?', 'No. You can use the current version without signing in.'], ['Can each school set its own rules?', 'Yes. Each school can set its own rules for outdoor activities.'], ['Is it open source?', 'Yes, MIT licensed.']].map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faq === index} onClick={() => setFaq(faq === index ? null : index)}><span>{question}</span><b>{faq === index ? '−' : '+'}</b></button>{faq === index && <p>{answer} {index === 5 && <a href={repo} {...external}>View the repository.</a>}</p>}</div>)}</Reveal>
    <section className="final-cta"><h2>Make the call with confidence.</h2><div><Link className="button button-light" to="/app">Open today’s briefing</Link><a className="button button-outline-light" href={repo} {...external}>View on GitHub</a></div></section>
  </main><SiteFooter /></>
}

type DocsSection = [string, string, React.ReactNode]

const docsSections: DocsSection[] = [
  ['overview', 'What Saans does', <>Saans helps a school decide what to do with outdoor activities when the air may be poor. It checks the forecast against the school day and gives a clear suggestion for each activity.</>],
  ['rules', 'How the air-quality score guides the plan', <>Saans uses the US Air Quality Index (AQI). In the example school rules, 0–100 is Green, 101–150 Amber, 151–200 Orange, 201–300 Red, and 301 or higher Maroon. Each outdoor activity gets a clear next step: continue, shorten, move to a safer time, or stay indoors.</>],
  ['policy', 'Extra care for younger children and safer times', <>Schools can choose stricter outdoor rules for younger grades. When an activity should not happen now, Saans looks for the nearest school-day time that meets the school’s safer-air rule and lasts long enough for that activity.</>],
  ['data', 'Where the numbers come from', <>Saans uses Open-Meteo’s air-quality forecast. These are model estimates, not measurements from a sensor at the school. The page warns you when its live school plan is more than three hours old.</>],
  ['architecture', 'How the website gets its data', <><Architecture /><p>The website is served from cloud storage and a content delivery network. It asks a data service for the school plan, and that service reads the saved forecast and timetable before making its recommendation. The AWS setup is managed through code so it can be reviewed and repeated.</p></>],
  ['api', 'Developer reference: website data links', <><table className="docs-table"><thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead><tbody>{[['GET', '/schools', 'List seeded schools'], ['GET', '/schools/{id}/brief', 'Today’s decision'], ['GET', '/schools/{id}/forecast', 'Next 48 hours'], ['POST', '/schools/{id}/simulate', 'In-memory what-if result']].map((row) => <tr key={row[1]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table><pre><code>{`POST /schools/delhi/simulate\n{ "scenario": "stubble" }\n\nResponse: brief shape with simulated: true`}</code></pre></>],
  ['setup', 'Run Saans on your computer', <><p>To build the website on your own computer, install Node.js 20 or later and run:</p><pre><code>{`cd frontend\nnpm install\nVITE_API_BASE=https://<api-url> npm run build\n# publish dist/ through the approved hosting workflow`}</code></pre><p>Run the backend tests from <code>backend/</code> with <code>pytest</code>. Do not commit credentials or private school coordinates.</p></>],
  ['security', 'Security and privacy', <>This version does not have user accounts or sign-in. Never put passwords, AWS keys, or private information in website code. Report security concerns through the repository issue tracker.</>],
  ['roadmap', 'What is not included yet', <>Some planned features are not available in this version, including automatic email alerts, AI-written messages, sign-in and India’s air-quality scoring system. Check the project plan for what is working today and what may come later.</>],
]

export function Docs() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''))
      if (el) window.setTimeout(() => el.scrollIntoView({ behavior: getScrollBehavior() }), 80)
    }
  }, [location.hash])
  const scrollDoc = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: getScrollBehavior() })
  return <><SiteNav /><main className="docs-page"><div className="docs-hero"><p className="eyebrow">Saans documentation</p><h1>How Saans makes a school plan.</h1><p>A simple guide to the recommendations, where the air-quality numbers come from, and how the website works.</p></div><div className="docs-layout"><aside className="docs-toc"><span>On this page</span>{docsSections.map(([id, title]) => <button key={id} type="button" className="toc-link" onClick={() => scrollDoc(id)}>{title}</button>)}</aside><article className="docs-content">{docsSections.map(([id, title, content]) => <section id={id} key={id}><h2><button type="button" className="heading-anchor" onClick={() => scrollDoc(id)} aria-label={`Link to ${title}`}>#</button>{title}</h2>{content}</section>)}</article></div></main><SiteFooter /></>
}

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <><SiteNav /><main className="legal-page"><p className="eyebrow">Saans · Open-source hackathon prototype</p><h1>{title}</h1><p className="legal-date">Last updated: 11 October 2026</p>{children}<p className="legal-contact">Questions or corrections? Use the <a href={issueUrl} {...external}>repository Issues page</a>.</p></main><SiteFooter /></>
}

export function Privacy() { return <LegalPage title="Privacy policy"><h2>What this prototype is</h2><p>Saans is an open-source project prototype. This version does not have user accounts, sign-in, tracking analytics or a newsletter.</p><h2>Forecast and school data</h2><p>Air-quality values are estimates from Open-Meteo, not readings from a sensor at the school. Example school records are used for the demo. Do not enter private information into an unapproved version of the site.</p><h2>Questions</h2><p>This is a prototype, so do not assume that it meets your school’s privacy or availability needs. Check those requirements before using it for real decisions.</p></LegalPage> }
export function Terms() { return <LegalPage title="Terms of use"><h2>Prototype provided as-is</h2><p>Saans is an open-source prototype shared under the MIT licence. It is provided as-is; we cannot guarantee that it will always be available, accurate or suitable for your needs.</p><h2>Use at your own risk</h2><p>Air-quality values are estimates, and the limits are examples only. Always check local guidance and use your school’s judgement before making a decision.</p></LegalPage> }
export function Disclaimer() { return <LegalPage title="Safety disclaimer"><h2>Not medical advice</h2><p>Saans is not medical, government or emergency advice. The air-quality limits shown are examples, not official health guidance.</p><h2>Principal judgement remains central</h2><p>Check important decisions with local authorities and suitable health staff. Do not use Saans in an emergency. A forecast is not a live measurement at your school.</p></LegalPage> }

export function NotFound() { return <><SiteNav /><main className="not-found"><Logo /><p className="eyebrow">404 · Page not found</p><h1>This page isn’t here.</h1><p>This link does not lead to a Saans page.</p><div><Link className="button button-dark" to="/">Go to home page</Link><Link className="button button-ghost" to="/app">Today's plan</Link></div></main><SiteFooter /></> }
