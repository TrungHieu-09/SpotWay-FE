import { useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import './LandingPage.css'

export function LandingPage() {
  const pageRef = useScrollReveal()
  const isoRef = useRef<HTMLDivElement>(null)

  const handleIsoMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)   // -1 to 1
    const dy = (e.clientY - cy) / (rect.height / 2)  // -1 to 1
    // Parallax: base rotateX=58 ±6, rotateZ=-38 ±6
    const rotX = 58 - dy * 6
    const rotZ = -38 + dx * 6
    isoRef.current.style.transition = 'transform 0.1s ease-out'
    isoRef.current.style.transform = `rotateX(${rotX}deg) rotateZ(${rotZ}deg) skewX(2deg)`
  }, [])

  const handleIsoMouseLeave = useCallback(() => {
    if (!isoRef.current) return
    isoRef.current.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    isoRef.current.style.transform = 'rotateX(58deg) rotateZ(-38deg) skewX(2deg)'
  }, [])

  return (
    <div className="lp-root" ref={pageRef}>
      {/* ── Ambient aurora background ── */}
      <div className="lp-aurora" aria-hidden>
        <div className="lp-aurora__blob lp-aurora__blob--violet" />
        <div className="lp-aurora__blob lp-aurora__blob--cyan" />
        <div className="lp-aurora__blob lp-aurora__blob--fuchsia" />
        <div className="lp-aurora__grid" />
      </div>

      {/* ── 1. NAVBAR ── */}
      <header className="lp-nav" data-reveal="fade-down" data-reveal-delay="0">
        <div className="lp-nav__inner">
          <a href="#" className="lp-nav__brand">
            <div className="lp-nav__logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
            <span className="lp-nav__name">SpotWay</span>
          </a>

          <nav className="lp-nav__links">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#analytics">Analytics</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="lp-nav__cta">
            <Link to="/owner/buildings" className="lp-btn lp-btn--ghost">Sign In</Link>
            <Link to="/owner/buildings" className="lp-btn lp-btn--primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── 2. HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero__content">
          <div className="lp-hero__badge" data-reveal="fade-down" data-reveal-delay="100">
            <span className="lp-dot lp-dot--cyan" />
            AI-Powered Indoor Navigation Platform
          </div>

          <h1 className="lp-hero__title" data-reveal="fade-up" data-reveal-delay="160">
            Navigate every floor.<br />
            <span className="lp-gradient-text">Manage every space.</span>
          </h1>

          <p className="lp-hero__sub" data-reveal="fade-up" data-reveal-delay="220">
            Next-gen multi-tenant indoor 3D mapping, fine-grained telemetry, and autonomous spatial graph navigation for mega complexes, transit hubs, and campus facilities.
          </p>

          <div className="lp-hero__actions" data-reveal="fade-up" data-reveal-delay="280">
            <Link to="/owner/buildings" className="lp-btn lp-btn--primary lp-btn--lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Start for Free
            </Link>
            <Link to="/manager" className="lp-btn lp-btn--ghost lp-btn--lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              View Live Demo
            </Link>
          </div>

          <div className="lp-hero__stats" data-reveal="fade-up" data-reveal-delay="340">
            <div className="lp-hero__stat">
              <span className="lp-hero__stat-value">60+</span>
              <span className="lp-hero__stat-label">Global Deployments</span>
            </div>
            <div className="lp-hero__stat-divider" />
            <div className="lp-hero__stat">
              <span className="lp-hero__stat-value">1.4M+</span>
              <span className="lp-hero__stat-label">Daily Navigations</span>
            </div>
            <div className="lp-hero__stat-divider" />
            <div className="lp-hero__stat">
              <span className="lp-hero__stat-value">±0.38m</span>
              <span className="lp-hero__stat-label">Positioning Accuracy</span>
            </div>
          </div>
        </div>

        {/* 3D Stacked Floor Map — SpaceLumi ISO style */}
        <div className="lp-hero__visual" data-reveal="fade-left" data-reveal-delay="200">
          <div className="lp-floormap-scene" onMouseMove={handleIsoMouseMove} onMouseLeave={handleIsoMouseLeave}>

            {/* ── Level selector panel ── */}
            <div className="lp-floormap-levels">
              <div className="lp-floormap-levels__label">LEVELS</div>
              <div className="lp-floormap-level lp-floormap-level--active">
                <span className="lp-floormap-level__badge">L3</span>
                <span className="lp-floormap-level__name">Exec Suites</span>
                <span className="lp-dot lp-dot--violet" />
              </div>
              <div className="lp-floormap-level">
                <span className="lp-floormap-level__badge lp-floormap-level__badge--dim">L2</span>
                <span className="lp-floormap-level__name lp-floormap-level__name--dim">Retail Hub</span>
              </div>
              <div className="lp-floormap-level">
                <span className="lp-floormap-level__badge lp-floormap-level__badge--dim">L1</span>
                <span className="lp-floormap-level__name lp-floormap-level__name--dim">Concourse</span>
              </div>
            </div>

            {/* ── Top-right HUD: destination callout ── */}
            <div className="lp-floormap-hud lp-floormap-hud--dest">
              <div className="lp-floormap-hud__icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
              <div className="lp-floormap-hud__text">
                <div className="lp-floormap-hud__title">Room 3.12 · 2 min walk <span className="lp-dot lp-dot--green" /></div>
                <div className="lp-floormap-hud__sub">Optimal elevator route via Core North</div>
              </div>
            </div>

            {/* ── 3D Isometric container — parent transform approach (SpaceLumi) ── */}
            <div className="lp-iso-perspective">
              <div className="lp-iso-container" ref={isoRef}>

                {/* Floor L1 — Concourse (base) */}
                <div className="lp-iso-floor lp-iso-floor--l1">
                  <div className="lp-iso-floor__inner">
                    <div className="lp-iso-grid-h" />
                    <div className="lp-iso-grid-v" />
                    <div className="lp-iso-heat lp-iso-heat--cyan" />
                    <span className="lp-iso-floor__label">L1 Concourse (Arrivals / Metro Link)</span>
                  </div>
                </div>

                {/* Elevator core pillar */}
                <div className="lp-iso-elevator" />

                {/* Floor L2 — Retail Hub */}
                <div className="lp-iso-floor lp-iso-floor--l2">
                  <div className="lp-iso-floor__inner lp-iso-floor__inner--l2">
                    <div className="lp-iso-grid-h" style={{ top: '33%' }} />
                    <div className="lp-iso-grid-v" style={{ left: '65%' }} />
                    <div className="lp-iso-heat lp-iso-heat--fuchsia" />
                    <span className="lp-iso-floor__label lp-iso-floor__label--cyan">L2 Retail Hub (Duty Free &amp; Lounges)</span>
                  </div>
                </div>

                {/* Floor L3 — Executive Suites (active, highest) */}
                <div className="lp-iso-floor lp-iso-floor--l3">
                  <div className="lp-iso-floor__inner lp-iso-floor__inner--l3">
                    {/* Architectural wall lines */}
                    <div className="lp-iso-wall lp-iso-wall--h" style={{ top: 32 }} />
                    <div className="lp-iso-wall lp-iso-wall--v" style={{ left: 80 }} />

                    {/* Animated neon nav path */}
                    <svg className="lp-iso-navpath" viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="neonPathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                      </defs>
                      {/* Path */}
                      <path
                        className="lp-iso-navpath__line"
                        d="M 60 280 L 140 240 L 140 110 L 280 80"
                        stroke="url(#neonPathGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="8 6"
                        fill="none"
                      />
                      {/* Destination pin with ping */}
                      <circle cx="280" cy="80" r="8" fill="#22D3EE" />
                      <circle cx="280" cy="80" r="8" fill="none" stroke="#22D3EE" strokeWidth="1.5" opacity="0.5">
                        <animate attributeName="r" values="10;22;10" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                      </circle>
                      {/* Origin dot */}
                      <circle cx="60" cy="280" r="6" fill="#8B5CF6" />
                    </svg>

                    {/* Active room badge */}
                    <div className="lp-iso-room-badge">SUITE 3.12 (ACTIVE)</div>

                    {/* Floor label */}
                    <span className="lp-iso-floor__label lp-iso-floor__label--violet">
                      <span className="lp-iso-floor__label-dot" />
                      L3 Executive Suites &amp; Medical Center
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Bottom-right HUD: beacon status ── */}
            <div className="lp-floormap-hud lp-floormap-hud--beacon">
              <div className="lp-floormap-beacon-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5.64 5.64a9 9 0 0 0 0 12.73M18.36 5.64a9 9 0 0 1 0 12.73"/>
                  <path d="M8.46 8.46a5 5 0 0 0 0 7.07M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <circle cx="12" cy="12" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div className="lp-floormap-hud__text">
                <div className="lp-floormap-hud__title lp-floormap-hud__title--beacon">GATE B14 BEACON SYNCED</div>
                <div className="lp-floormap-hud__sub">±0.4m precision · UMB Channel 5</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. LOGOS ── */}
      <section className="lp-logos">
        <p className="lp-logos__label" data-reveal="fade-up" data-reveal-delay="0">Trusted by world-class facilities</p>
        <div className="lp-logos__grid">
          {['HEATHROW T5', 'WESTFIELD', 'CHANGI SIN', 'MAYO CLINIC', 'BROOKFIELD', 'HUDSON YARDS'].map((name, i) => (
            <div key={name} className="lp-logos__item" data-reveal="scale-up" data-reveal-delay={String(i * 60)}>{name}</div>
          ))}
        </div>
      </section>

      {/* ── 4. FEATURES BENTO ── */}
      <section className="lp-section" id="features">
        <div className="lp-section__label" data-reveal="fade-down" data-reveal-delay="0">Spatial Engine Capabilities</div>
        <h2 className="lp-section__title" data-reveal="fade-up" data-reveal-delay="80">
          Precision telemetry engineering for<br />high-density physical assets
        </h2>
        <p className="lp-section__sub" data-reveal="fade-up" data-reveal-delay="140">
          Engineered specifically for mega-facilities where GPS fails. Sub-meter multi-floor localization and live routing.
        </p>

        <div className="lp-bento">
          <div className="lp-bento__card lp-bento__card--wide lp-bento__card--violet" data-reveal="fade-up" data-reveal-delay="0">
            <div className="lp-bento__card-glow" />
            <div className="lp-feature-icon lp-feature-icon--violet">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <span className="lp-feature-eyebrow lp-feature-eyebrow--cyan">Volumetric Modeling</span>
            <h3 className="lp-feature-title">3D Multi-Floor Digital Twin</h3>
            <p className="lp-feature-body">Interactive structural layer toggling with real-time CAD sync, volumetric mesh slicing, and sub-meter indoor elevation mapping across high-rise campuses.</p>
            <div className="lp-feature-metrics">
              <div className="lp-metric"><span className="lp-metric__label">ELEVATION</span><span className="lp-metric__value lp-metric__value--cyan">±0.25m</span><span className="lp-metric__sub">Barometric altitude lock</span></div>
              <div className="lp-metric"><span className="lp-metric__label">RENDER</span><span className="lp-metric__value lp-metric__value--violet">WebGL 2.0</span><span className="lp-metric__sub">60 FPS on low-power</span></div>
              <div className="lp-metric"><span className="lp-metric__label">COVERAGE</span><span className="lp-metric__value lp-metric__value--fuchsia">Unlimited</span><span className="lp-metric__sub">Multi-building sync</span></div>
            </div>
          </div>

          <div className="lp-bento__card lp-bento__card--cyan" data-reveal="fade-left" data-reveal-delay="80">
            <div className="lp-feature-icon lp-feature-icon--cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 16h7M14 19h7"/></svg>
            </div>
            <span className="lp-feature-eyebrow lp-feature-eyebrow--cyan">Zero Friction</span>
            <h3 className="lp-feature-title">Instant QR & Beacon Positioning</h3>
            <p className="lp-feature-body">Zero app download required. Visitors scan physical QR codes or walk within BLE / UWB zones for instant browser orientation.</p>
            <div className="lp-code-badge"><span className="lp-code-badge__label">App install required:</span><span className="lp-code-badge__value">0 MB (Web-First)</span></div>
          </div>

          <div className="lp-bento__card lp-bento__card--fuchsia" data-reveal="fade-right" data-reveal-delay="80">
            <div className="lp-feature-icon lp-feature-icon--fuchsia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span className="lp-feature-eyebrow lp-feature-eyebrow--fuchsia">Inclusive Spatial</span>
            <h3 className="lp-feature-title">Turn-by-Turn Wayfinding</h3>
            <p className="lp-feature-body">ADA-compliant route calculation. Automatically prioritizes elevators and ramps over escalators and stairs when requested.</p>
            <div className="lp-check-list">
              <div className="lp-check-item"><span className="lp-check-item__dot" />Audio guidance & high-contrast</div>
              <div className="lp-check-item"><span className="lp-check-item__dot" />Multi-language voice nav</div>
            </div>
          </div>

          <div className="lp-bento__card lp-bento__card--wide lp-bento__card--cyan" data-reveal="fade-up" data-reveal-delay="120">
            <div className="lp-bento__card-glow lp-bento__card-glow--cyan" />
            <div className="lp-feature-icon lp-feature-icon--cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2v10l6.5 6.5"/></svg>
            </div>
            <span className="lp-feature-eyebrow lp-feature-eyebrow--cyan">Generative AI</span>
            <h3 className="lp-feature-title">AI Floor-Plan Vectorization</h3>
            <p className="lp-feature-body">Transform raster drawings and 3D environments into fully navigable 2D omni-directional graph maps. Automated POI extraction and routing edge classification.</p>
            <div className="lp-tag-row">
              {['AutoCAD Import', 'PDF Parsing', 'BIM Compatible', 'Point Cloud Sync'].map((t) => (<span key={t} className="lp-tag">{t}</span>))}
            </div>
          </div>

          <div className="lp-bento__card" data-reveal="fade-up" data-reveal-delay="60">
            <div className="lp-feature-icon lp-feature-icon--violet">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <span className="lp-feature-eyebrow lp-feature-eyebrow--violet">Real-Time Intelligence</span>
            <h3 className="lp-feature-title">Heatmap & Density Analytics</h3>
            <p className="lp-feature-body">Live occupancy thermal imaging, dwell-time analysis, and predictive crowd flow modelling across any floor.</p>
          </div>

          <div className="lp-bento__card lp-bento__card--fuchsia-soft" data-reveal="fade-up" data-reveal-delay="120">
            <div className="lp-feature-icon lp-feature-icon--fuchsia">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <span className="lp-feature-eyebrow lp-feature-eyebrow--fuchsia">Multi-Tenant SaaS</span>
            <h3 className="lp-feature-title">Dynamic POI & Zone Management</h3>
            <p className="lp-feature-body">Atomic namespace isolation. Configure tenant-specific devices, zones, and complex container modules from a unified control plane.</p>
            <div className="lp-code-badge"><span className="lp-code-badge__label">Tenant Agents available:</span><span className="lp-code-badge__value">SaaS Enabled</span></div>
          </div>
        </div>
      </section>

      {/* ── 5. ROLES ── */}
      <section className="lp-section" id="solutions">
        <div className="lp-section__label" data-reveal="fade-down" data-reveal-delay="0">Building Ecosystem</div>
        <h2 className="lp-section__title" data-reveal="fade-up" data-reveal-delay="80">
          Engineered for every lens of<br />the building ecosystem
        </h2>
        <p className="lp-section__sub" data-reveal="fade-up" data-reveal-delay="140">
          Fine-tuned permission planes and purpose-built dashboards for passengers, tenants, and executives.
        </p>

        <div className="lp-roles">
          {[
            { role: 'Guest', icon: '👤', color: 'cyan',    desc: 'Instant wayfinding without apps. QR-scan to navigate, discover stores, and find facilities across every floor in real-time.' },
            { role: 'Store Owner', icon: '🏪', color: 'violet',  desc: 'Manage your storefront presence, promotions, and real-time foot traffic data from a tenant dashboard.' },
            { role: 'Building Manager', icon: '🏢', color: 'fuchsia', desc: 'Configure floor maps, POI nodes, routing graphs, and publish spatial updates with zero downtime.' },
            { role: 'Asset Owner', icon: '💼', color: 'green',   desc: 'Portfolio-level analytics, SaaS tenant management, and revenue intelligence across all your properties.' },
            { role: 'System Admin', icon: '⚙️', color: 'cyan',    desc: 'Full infrastructure control, tenant isolation, resource quotas, and system-wide monitoring at scale.' },
          ].map((item, i) => (
            <div key={item.role} className={`lp-role-card lp-role-card--${item.color}`} data-reveal="scale-up" data-reveal-delay={String(i * 80)}>
              <div className="lp-role-card__icon">{item.icon}</div>
              <h3 className="lp-role-card__title">{item.role}</h3>
              <p className="lp-role-card__desc">{item.desc}</p>
              <div className="lp-role-card__cta">Learn more →</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. HOW IT WORKS ── */}
      <section className="lp-section lp-section--dark" id="analytics">
        <div className="lp-section__label" data-reveal="fade-down" data-reveal-delay="0">Implementation</div>
        <h2 className="lp-section__title" data-reveal="fade-up" data-reveal-delay="80">
          From blueprint CAD to live 3D<br />wayfinding in hours
        </h2>
        <p className="lp-section__sub" data-reveal="fade-up" data-reveal-delay="140">
          No manually complex graph models or prolonged LIDAR scanning needed.
        </p>

        <div className="lp-steps">
          {[
            { num: '01', icon: '📄', title: 'Upload 2D CAD or PDF', sub: 'Drag blueprints. Our pipeline parses walls, doors, rooms, and circulation axes automatically. AutoCAD / Revit / PDF — all accepted.', tags: ['DWG / DXF', 'Revit BIM', 'PDF', 'Image OCR'] },
            { num: '02', icon: '🤖', title: 'AI Generates 3D Navmesh', sub: 'Our continuous spatial-graph model builds a fully navigable 3D waypoint network in under 30 seconds. Automatic POI placement from labels.', tags: ['GPT-4 Vision', 'Point Cloud', 'Auto POI'] },
            { num: '03', icon: '🚀', title: 'Publish & Navigate', sub: 'Deploy to 3D displays, interactive kiosks, or your app in one click. Analytics dashboard reflects live foot traffic immediately.', tags: ['5 min deploy', 'Real Status: Live'] },
          ].map((step, i) => (
            <div key={step.num} className="lp-step" data-reveal="flip-up" data-reveal-delay={String(i * 120)}>
              <div className="lp-step__num">{step.num}</div>
              <div className="lp-step__icon">{step.icon}</div>
              <h3 className="lp-step__title">{step.title}</h3>
              <p className="lp-step__sub">{step.sub}</p>
              <div className="lp-tag-row">{step.tags.map((t) => <span key={t} className="lp-tag">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. METRICS ── */}
      <section className="lp-section">
        <div className="lp-section__label" data-reveal="fade-down" data-reveal-delay="0">Command-Level Situational Awareness</div>
        <div className="lp-metrics-header">
          <h2 className="lp-section__title lp-section__title--left" data-reveal="fade-right" data-reveal-delay="80">
            Real-time intelligence<br />at every scale
          </h2>
          <div className="lp-live-badge" data-reveal="fade-left" data-reveal-delay="80">
            <span className="lp-dot lp-dot--cyan" />
            <span>LIVE DATA — Updated every 1.2s</span>
          </div>
        </div>

        <div className="lp-metric-cards">
          {[
            { label: 'Global Deployments', value: '60+',    accent: 'violet' },
            { label: 'Daily Navigations',  value: '1.4M+',  accent: 'cyan' },
            { label: 'Accuracy',           value: '±0.38m', accent: 'fuchsia' },
            { label: 'Uptime SLA',         value: '99.9%',  accent: 'green' },
          ].map((m, i) => (
            <div key={m.label} className={`lp-metric-card lp-metric-card--${m.accent}`} data-reveal="zoom" data-reveal-delay={String(i * 70)}>
              <span className="lp-metric-card__value">{m.value}</span>
              <span className="lp-metric-card__label">{m.label}</span>
            </div>
          ))}
        </div>

        <div className="lp-dashboard-preview" data-reveal="fade-up" data-reveal-delay="200">
          <div className="lp-dashboard-preview__header">
            <span className="lp-dot lp-dot--violet" />
            <span>SpotWay Analytics Console — Saigon Central Mall</span>
            <span className="lp-live-pill">LIVE</span>
          </div>
          <div className="lp-dashboard-preview__body">
            <div className="lp-chart-block">
              <div className="lp-chart-block__label">VISITORS / HOUR</div>
              <div className="lp-chart-block__value lp-gradient-text">1,080 per/hr</div>
              <div className="lp-sparkline">
                {[40,60,45,80,55,90,70,95,65,85,75,100].map((h, i) => (
                  <div key={i} className="lp-sparkline__bar" style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <div className="lp-chart-block">
              <div className="lp-chart-block__label">AVG DWELL TIME</div>
              <div className="lp-chart-block__value" style={{ color: 'var(--sw-cyan)' }}>12 mins</div>
            </div>
            <div className="lp-chart-block">
              <div className="lp-chart-block__label">ACTIVE FLOORS</div>
              <div className="lp-chart-block__value" style={{ color: 'var(--sw-fuchsia)' }}>3.4 min</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. PRICING ── */}
      <section className="lp-section" id="pricing">
        <div className="lp-section__label" data-reveal="fade-down" data-reveal-delay="0">Scale Indoor Spatial Intelligence Effortlessly</div>
        <h2 className="lp-section__title" data-reveal="fade-up" data-reveal-delay="80">
          Transparent tiers based on building size,<br />usage per visitor charges.
        </h2>

        <div className="lp-pricing">
          {[
            { name: 'Regional Facility',    price: '$249', period: '/month', featured: false, features: ['Up to 5 buildings','20 floors/building','QR + BLE Beacons','Basic Analytics','Email Support'] },
            { name: 'Multi-Floor Campus',   price: '$799', period: '/month', featured: true,  features: ['Unlimited buildings','Unlimited floors','AI Floor-Plan AI','Advanced Analytics','Priority 24/7 Support','White-label branding','Multi-tenant SaaS'] },
            { name: 'Global Infrastructure',price: 'Custom', period: '',    featured: false, features: ['Dedicated cloud','Custom SLA 99.99%','On-premise option','Custom integrations','Dedicated TAM','Compliance tools'] },
          ].map((plan, i) => (
            <div key={plan.name} className={`lp-plan ${plan.featured ? 'lp-plan--featured' : ''}`} data-reveal="scale-up" data-reveal-delay={String(i * 100)}>
              {plan.featured && <div className="lp-plan__badge">Most Popular</div>}
              <h3 className="lp-plan__name">{plan.name}</h3>
              <div className="lp-plan__price">
                <span className="lp-plan__amount">{plan.price}</span>
                {plan.period && <span className="lp-plan__period">{plan.period}</span>}
              </div>
              <ul className="lp-plan__features">
                {plan.features.map((f) => (
                  <li key={f} className="lp-plan__feature">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/owner/buildings" className={`lp-btn lp-btn--block ${plan.featured ? 'lp-btn--primary' : 'lp-btn--ghost'}`}>
                {plan.price === 'Custom' ? 'Contact Sales' : 'Start Free Trial'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. CTA BANNER ── */}
      <section className="lp-cta">
        <div className="lp-cta__glow-violet" />
        <div className="lp-cta__glow-cyan" />
        <div className="lp-section__label" data-reveal="fade-down" data-reveal-delay="0">Ready to transform?</div>
        <h2 className="lp-cta__title" data-reveal="fade-up" data-reveal-delay="80">
          Ready to transform your physical space<br />into an intelligent digital twin?
        </h2>
        <p className="lp-cta__sub" data-reveal="fade-up" data-reveal-delay="140">
          Join 60+ global deployments. Select your building, upload your blueprint, and be live in hours — no proof of concept needed.
        </p>
        <div className="lp-cta__actions" data-reveal="scale-up" data-reveal-delay="200">
          <Link to="/owner/buildings" className="lp-btn lp-btn--primary lp-btn--lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Start For Free
          </Link>
          <Link to="/manager" className="lp-btn lp-btn--ghost lp-btn--lg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            Schedule 3D Walkthrough
          </Link>
        </div>
      </section>

      {/* ── 10. FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <div className="lp-footer__brand" data-reveal="fade-up" data-reveal-delay="0">
            <div className="lp-footer__logo">
              <div className="lp-nav__logo" style={{ width: 28, height: 28, borderRadius: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <span>SpotWay</span>
            </div>
            <p className="lp-footer__tagline">Next-Gen Indoor Spatial Intelligence for complex multi-tenant environments.</p>
          </div>

          {[
            { heading: 'Platform', links: ['3D Digital Twin','Wayfinding Engine','AI Vectorization','Analytics Suite','Beacon SDK'] },
            { heading: 'Solutions', links: ['Retail Malls','Airports','Hospitals','Campuses','Transit Hubs'] },
            { heading: 'Company',  links: ['About Us','Blog','Careers','Press Kit','Partners'] },
            { heading: 'Legal',    links: ['Privacy Policy','Terms of Service','SLA','Security'] },
          ].map((col, i) => (
            <div key={col.heading} className="lp-footer__col" data-reveal="fade-up" data-reveal-delay={String((i + 1) * 70)}>
              <h4 className="lp-footer__col-heading">{col.heading}</h4>
              <ul className="lp-footer__col-links">
                {col.links.map((l) => <li key={l}><a href="#">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="lp-footer__bottom">
          <span>© 2026 SpotWay Technologies. All rights reserved.</span>
          <span>Built with ❤️ in Hồ Chí Minh City</span>
        </div>
      </footer>
    </div>
  )
}
