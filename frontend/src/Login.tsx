import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter, SiteNav } from './Site'

function Login() {
  const [message, setMessage] = useState('')

  const handlePreviewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('Sign-in is not enabled yet. No credentials were sent or stored. This page is a design preview.')
  }

  return (
    <>
      <SiteNav />
      <main className="login-page" id="main-content">
        <section className="login-story" aria-labelledby="login-story-title">
          <Link to="/" className="login-back-link">← Back to Saans</Link>
          <div className="login-story-content">
            <span className="login-leaf" aria-hidden="true">
              <svg viewBox="0 0 44 44"><path d="M35 8C19 8 8 15 8 27c0 6 5 10 11 9C31 34 35 20 35 8Z" /><path d="M11 34c5-8 11-13 19-19" /></svg>
            </span>
            <p className="eyebrow">A calmer school day starts here</p>
            <h1 id="login-story-title">Make room for <em>better decisions.</em></h1>
            <p className="login-story-copy">A focused workspace for school leaders to review air-quality guidance and plan the day with care.</p>
            <div className="login-trust-points">
              <p><span aria-hidden="true">✓</span> Activity-by-activity recommendations</p>
              <p><span aria-hidden="true">✓</span> Forecast context in one clear view</p>
              <p><span aria-hidden="true">✓</span> School policy stays at the centre</p>
            </div>
          </div>
          <p className="login-story-foot">Forecasts are estimates, not on-site measurements or medical advice.</p>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-inner">
            <span className="login-preview-badge"><span aria-hidden="true" /> Preview experience</span>
            <p className="eyebrow">Principal workspace</p>
            <h2 id="login-title">Welcome back</h2>
            <p className="login-intro">The sign-in experience is being designed. Secure account access is not available yet.</p>

            <form className="login-form" onSubmit={handlePreviewSubmit}>
              <label htmlFor="login-email">Work email</label>
              <input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@school.org" required />
              <label htmlFor="login-password">Password</label>
              <input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
              <button className="button button-dark login-submit" type="submit">Preview sign in <span aria-hidden="true">→</span></button>
            </form>

            {message && <p className="login-preview-message" role="status">{message}</p>}

            <p className="login-no-account">Just exploring? <Link to="/app">Open the demo dashboard</Link></p>
            <div className="login-security-note">
              <span aria-hidden="true">⌁</span>
              <p><strong>Security comes first.</strong> Real sign-in will be added after server-side authorization and school-level access controls are defined.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

export default Login
