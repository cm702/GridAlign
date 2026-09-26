import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { createOpportunityCsv, locationProvenance } from './mapExport.js'
import {
  createScreeningData,
  formatDistanceKm,
  formatDescriptionKm,
  formatScheduleDate,
  formatScheduleGap,
  getDistanceTier,
  getCoordinationOptions,
  getScreeningScore,
  getScreeningScoreExplanation,
  SCREENING_DISTANCE_KM,
} from './projectData.js'
import {
  calculateProjectCostBreakdown,
  formatCompactUsd,
  formatUsd,
} from './costImpact.js'

const { projectData, overlapData } = createScreeningData()

const projectMap = Object.fromEntries(projectData.map((project) => [project.id, project]))
const utilityStyles = {
  'Dominion Energy South Carolina': { color: '#087ea4', label: 'Dominion Energy SC' },
  'Georgia Power': { color: '#c65314', label: 'Georgia Power' },
}

const starterQuestions = [
  'What could these projects coordinate?',
  'What should the utilities verify first?',
]

const welcomeMessage = {
  role: 'model',
  text: 'Ask about coordination ideas, schedule gaps, or what evidence to verify next.',
  intro: true,
}

function describeScheduleGap(days) {
  if (days === null) return 'Schedule data not available for both projects'
  if (days <= 180) return 'Close planned-date window'
  if (days <= 548) return 'Dates about 6–18 months apart'
  if (days <= 1_096) return 'Dates about 1.5–3 years apart'
  return 'Dates more than 3 years apart'
}

function getProjectMapPoints(project) {
  const locations = [[project.lat, project.lon], ...project.sites.map((site) => [site.lat, site.lon])]
  return [...new Map(locations.map((point) => [point.join(','), point])).values()]
}

function MapViewport({ mode, projects, opportunity, focusedProject, expanded }) {
  const map = useMap()

  useEffect(() => {
    let focusProjects = projects
    if (mode === 'match' && opportunity) {
      focusProjects = [opportunity.projectA, opportunity.projectB]
    } else if (mode === 'project' && focusedProject) {
      focusProjects = [focusedProject]
    }

    const points = focusProjects.flatMap(getProjectMapPoints)
    if (!points.length) return

    if (points.length === 1) {
      map.setView(points[0], mode === 'overview' ? 7 : 11, { animate: true })
    } else {
      map.fitBounds(points, {
        padding: [48, 48],
        maxZoom: mode === 'overview' ? 8 : 11,
        animate: true,
      })
    }
  }, [map, mode, projects, opportunity, focusedProject])

  useEffect(() => {
    const frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }))
    return () => cancelAnimationFrame(frame)
  }, [map, expanded])

  return null
}

function App() {
  const [distanceBand, setDistanceBand] = useState('all')
  const [selectedUtility, setSelectedUtility] = useState('all')
  const [selectedOverlapId, setSelectedOverlapId] = useState('OVL_1')
  const [searchTerm, setSearchTerm] = useState('')
  const [scheduleWindow, setScheduleWindow] = useState('any')
  const [sortBy, setSortBy] = useState('score')
  const [showProjectPaths, setShowProjectPaths] = useState(true)
  const [showPairLinks, setShowPairLinks] = useState(true)
  const [showNamedEndpoints, setShowNamedEndpoints] = useState(true)
  const [mapViewMode, setMapViewMode] = useState('overview')
  const [focusedProjectId, setFocusedProjectId] = useState(null)
  const [selectedMapProjectId, setSelectedMapProjectId] = useState(null)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [chatState, setChatState] = useState({
    opportunityId: 'OVL_1',
    messages: [welcomeMessage],
    error: '',
  })
  const [chatInput, setChatInput] = useState('')
  const [chatLoadingFor, setChatLoadingFor] = useState(null)
  const chatTranscriptRef = useRef(null)
  const expandMapButtonRef = useRef(null)
  const closeMapButtonRef = useRef(null)
  const mapWasExpandedRef = useRef(false)

  const visibleOverlaps = useMemo(
    () => overlapData.filter((overlap) => {
      if (distanceBand === 'all') return true
      if (distanceBand === 'under-0.1') return overlap.distanceKm < 0.1
      if (distanceBand === 'under-1.6') return overlap.distanceKm < 1.6
      if (distanceBand === 'under-8') return overlap.distanceKm < 8
      if (distanceBand === 'under-40') return overlap.distanceKm < SCREENING_DISTANCE_KM
      return overlap.distanceKm >= SCREENING_DISTANCE_KM
    }),
    [distanceBand],
  )

  const opportunityRows = useMemo(
    () =>
      visibleOverlaps
        .map((opportunity) => ({
          ...opportunity,
          projectA: projectMap[opportunity.projectIdA],
          projectB: projectMap[opportunity.projectIdB],
          score: getScreeningScore(opportunity),
        }))
        .sort((a, b) => b.score - a.score),
    [visibleOverlaps],
  )

  const filteredOpportunities = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const matches = opportunityRows.filter((opportunity) => {
      const searchableText = [
        opportunity.id,
        opportunity.projectA.utility,
        opportunity.projectA.projectName,
        opportunity.projectA.projectType,
        opportunity.projectA.region,
        opportunity.projectB.utility,
        opportunity.projectB.projectName,
        opportunity.projectB.projectType,
        opportunity.projectB.region,
      ].join(' ').toLowerCase()
      const matchesQuery = !query || searchableText.includes(query)
      const matchesSchedule =
        scheduleWindow === 'any' ||
        (scheduleWindow === 'unknown' && opportunity.timeGapDays === null) ||
        (opportunity.timeGapDays !== null &&
          ((scheduleWindow === 'within-year' && opportunity.timeGapDays <= 365) ||
            (scheduleWindow === 'within-three-years' && opportunity.timeGapDays <= 1_096) ||
            (scheduleWindow === 'long-range' && opportunity.timeGapDays > 1_096)))
      return matchesQuery && matchesSchedule
    })

    return matches.sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm
      if (sortBy === 'schedule') {
        if (a.timeGapDays === null) return 1
        if (b.timeGapDays === null) return -1
        return a.timeGapDays - b.timeGapDays
      }
      return b.score - a.score
    })
  }, [opportunityRows, scheduleWindow, searchTerm, sortBy])

  const selectedOverlap =
    filteredOpportunities.find((opportunity) => opportunity.id === selectedOverlapId) ??
    filteredOpportunities[0]
  const selectedCostBreakdown = selectedOverlap
    ? calculateProjectCostBreakdown(selectedOverlap)
    : null
  const selectedCoordinationOptions = selectedOverlap
    ? getCoordinationOptions(selectedOverlap)
    : []
  const selectedDistanceTier = selectedOverlap
    ? getDistanceTier(selectedOverlap.distanceKm)
    : null
  const focusedProject = projectData.find((project) => project.id === focusedProjectId)

  const displayProjects = useMemo(() => {
    const highlightedMatchIds = selectedOverlap
      ? [selectedOverlap.projectIdA, selectedOverlap.projectIdB]
      : []
    const hasOpportunityFilters = searchTerm.trim().length > 0 || scheduleWindow !== 'any'
    const visibleMatchIds = hasOpportunityFilters
      ? filteredOpportunities.flatMap((opportunity) => [
          opportunity.projectIdA,
          opportunity.projectIdB,
        ])
      : projectData.map((project) => project.id)
    const visibleProjectIds = new Set([...visibleMatchIds, ...highlightedMatchIds])

    return projectData.filter(
      (project) =>
        visibleProjectIds.has(project.id) &&
        (selectedUtility === 'all' ||
          project.utility === selectedUtility ||
          highlightedMatchIds.includes(project.id)),
    )
  }, [filteredOpportunities, scheduleWindow, searchTerm, selectedOverlap, selectedUtility])
  const selectedMapProject =
    displayProjects.find((project) => project.id === selectedMapProjectId) ?? null
  const selectedProjectMatches = selectedMapProject
    ? filteredOpportunities.filter(
        (opportunity) =>
          opportunity.projectIdA === selectedMapProject.id ||
          opportunity.projectIdB === selectedMapProject.id,
      )
    : []
  const mapOpportunities =
    mapViewMode === 'match' && selectedOverlap
      ? [selectedOverlap]
      : filteredOpportunities.filter(
          (opportunity) => opportunity.distanceKm < SCREENING_DISTANCE_KM,
        )
  const activeChat =
    chatState.opportunityId === selectedOverlap?.id
      ? chatState
      : { opportunityId: selectedOverlap?.id, messages: [welcomeMessage], error: '' }
  const chatMessages = activeChat.messages
  const chatError = activeChat.error
  const chatLoading = chatLoadingFor === selectedOverlap?.id
  const activeMapViewMode =
    mapViewMode === 'project' && displayProjects.some((project) => project.id === focusedProjectId)
      ? 'project'
      : mapViewMode === 'project'
        ? 'overview'
        : mapViewMode
  const closestDistance = filteredOpportunities.length
    ? formatDistanceKm(Math.min(...filteredOpportunities.map((pair) => pair.distanceKm)))
    : '—'

  function resetScreening() {
    setDistanceBand('all')
    setSelectedUtility('all')
    setSearchTerm('')
    setScheduleWindow('any')
    setSortBy('score')
    setMapViewMode('overview')
    setFocusedProjectId(null)
  }

  function focusMatch(opportunity) {
    setSelectedOverlapId(opportunity.id)
    setFocusedProjectId(null)
    setSelectedMapProjectId(null)
    setMapViewMode('match')
  }

  function focusProject(project) {
    setSelectedMapProjectId(project.id)
    const match = filteredOpportunities.find(
      (opportunity) =>
        opportunity.projectIdA === project.id || opportunity.projectIdB === project.id,
    )
    setFocusedProjectId(match ? null : project.id)
    setMapViewMode(match ? 'match' : 'project')
    if (match) setSelectedOverlapId(match.id)
  }

  function openMatchDetails() {
    document.getElementById('detail-title')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function downloadSelectedMatchCsv() {
    if (!selectedOverlap) return
    const csv = createOpportunityCsv(selectedOverlap)
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `gridalign-${selectedOverlap.id.toLowerCase()}-screening.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }

  function printSelectedMatch() {
    if (!selectedOverlap) return
    window.print()
  }

  function clearConversation() {
    if (!selectedOverlap) return
    setChatState({ opportunityId: selectedOverlap.id, messages: [welcomeMessage], error: '' })
  }

  useEffect(() => {
    if (!mapExpanded) {
      if (mapWasExpandedRef.current) {
        mapWasExpandedRef.current = false
        expandMapButtonRef.current?.focus()
      }
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    mapWasExpandedRef.current = true
    document.body.style.overflow = 'hidden'
    closeMapButtonRef.current?.focus()
    function closeOnEscape(event) {
      if (event.key === 'Escape') setMapExpanded(false)
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [mapExpanded])

  function handleExpandedMapKeyDown(event) {
    if (!mapExpanded) return
    if (event.key === 'Escape') {
      setMapExpanded(false)
      return
    }
    if (event.key !== 'Tab') return

    const focusable = [
      ...event.currentTarget.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
      ),
    ].filter((element) => element.getClientRects().length > 0)
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  useEffect(() => {
    const transcript = chatTranscriptRef.current
    transcript?.scrollTo({ top: transcript.scrollHeight, behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  async function submitChat(event) {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text || !selectedOverlap || chatLoading) return

    const opportunityId = selectedOverlap.id
    const userMessage = { role: 'user', text }
    const conversation = chatMessages.filter((message) => !message.intro)
    const previousMessages =
      conversation.at(-1)?.role === 'user' ? conversation.slice(0, -1) : conversation
    const boundedHistory = previousMessages.slice(-11)
    if (boundedHistory[0]?.role === 'model') boundedHistory.shift()
    const requestMessages = [...boundedHistory, userMessage]

    setChatState((current) => ({
      opportunityId,
      messages: [
        ...(current.opportunityId === opportunityId ? current.messages : [welcomeMessage]),
        userMessage,
      ],
      error: '',
    }))
    setChatInput('')
    setChatLoadingFor(opportunityId)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
          opportunity: {
            id: selectedOverlap.id,
            distanceKm: selectedOverlap.distanceKm,
            timeGapDays: selectedOverlap.timeGapDays,
            screeningScore: selectedOverlap.score,
            scoreExplanation: getScreeningScoreExplanation(selectedOverlap),
            coordinationIdeas: selectedCoordinationOptions.map((option) => ({
              title: option.title,
              type: option.type,
              descriptor: option.descriptor,
              share: option.share,
              confidence: option.confidence,
              applicable: option.applicable,
            })),
            projectA: selectedOverlap.projectA,
            projectB: selectedOverlap.projectB,
          },
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'The assistant request failed.')
      }
      if (typeof result.text !== 'string' || !result.text.trim()) {
        throw new Error('The assistant returned an empty response. Try again.')
      }
      setChatState((current) =>
        current.opportunityId === opportunityId
          ? { ...current, messages: [...current.messages, { role: 'model', text: result.text }] }
          : current,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat failed. Please try again.'
      setChatState((current) =>
        current.opportunityId === opportunityId ? { ...current, error: message } : current,
      )
    } finally {
      setChatLoadingFor((current) => (current === opportunityId ? null : current))
    }
  }
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">G</span>
          <div>
          <p className="eyebrow">GridAlign</p>
          <h1>Project coordination explorer</h1>
          </div>
        </div>
        <div className="header-meta">
          <span className="live-indicator"><i /> Screening workspace</span>
          <span>South Carolina · Georgia</span>
        </div>
      </header>

      <section className="hero-row">
        <div>
          <p className="eyebrow">Transmission planning · cross-utility view</p>
          <h2>Spot nearby work. Find what’s worth a closer look.</h2>
          <p>Browse the latest supplied project lists, inspect source citations, and screen nearby work for coordination leads.</p>
        </div>
        <div className="hero-aside">
          <span className="source-badge"><i /> Public-source project lists</span>
          <span>SCRTP 2026–2030 · Georgia Power transmission project pages</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Screening summary">
        <div className="stat-card highlight">
          <span>Project pairs in view</span>
          <strong>{filteredOpportunities.length}<small> / {visibleOverlaps.length}</small></strong>
          <small>After your filters</small>
        </div>
        <div className="stat-card">
          <span>Mapped projects</span>
          <strong>{displayProjects.length}<small> / {projectData.length}</small></strong>
          <small>With supplied coordinate points</small>
        </div>
        <div className="stat-card">
          <span>Closest pair</span>
          <strong>{closestDistance}</strong>
          <small>Nearest listed coordinate points</small>
        </div>
        <div className="stat-card">
          <span>Challenge geographic screen</span>
          <strong>&lt; {SCREENING_DISTANCE_KM} km</strong>
          <small>{overlapData.filter((pair) => pair.distanceKm < SCREENING_DISTANCE_KM).length} pairs flagged · closer tiers are cumulative</small>
        </div>
      </section>
      <p className="data-freshness-note">
        Project catalogs are from the supplied 2026–2030 SCRTP filing and Georgia Power transmission pages.
        This is a saved public-data snapshot, not a live feed; source dates and project status can change.
      </p>

      <section className="filter-bar" aria-label="Screening filters">
        <label className="search-field">
          <span className="visually-hidden">Search projects, regions, or utilities</span>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search project, region, utility…"
          />
        </label>
        <label className="select-field">
          <span>Schedule gap</span>
          <select value={scheduleWindow} onChange={(event) => setScheduleWindow(event.target.value)}>
            <option value="any">Any / unknown schedule</option>
            <option value="within-year">Within 1 year</option>
            <option value="within-three-years">Within 3 years</option>
            <option value="long-range">Over 3 years</option>
            <option value="unknown">Schedule unavailable</option>
          </select>
        </label>
        <label className="select-field">
          <span>Rank by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="score">Screening score</option>
            <option value="distance">Closest first</option>
            <option value="schedule">Closest dates</option>
          </select>
        </label>
        <button type="button" className="reset-button" onClick={resetScreening}>Reset filters</button>
      </section>

      <section className="content-grid">
        <div
          className={mapExpanded ? 'panel map-panel map-expanded' : 'panel map-panel'}
          role={mapExpanded ? 'dialog' : undefined}
          aria-modal={mapExpanded ? 'true' : undefined}
          aria-label={mapExpanded ? 'Expanded project map' : undefined}
          onKeyDown={handleExpandedMapKeyDown}
        >
          <div className="panel-header">
            <div>
              <p className="label">01 · Explore geography</p>
              <h2>Project map</h2>
              <p className="panel-subtitle">
                {activeMapViewMode === 'match' && selectedOverlap
                  ? `Focused on ${selectedOverlap.id} · ${formatDistanceKm(selectedOverlap.distanceKm)} between listed coordinate points`
                  : activeMapViewMode === 'project' && focusedProject
                    ? `Focused on ${focusedProject.projectName}`
                    : 'Showing all project locations that match the current filters.'}
              </p>
            </div>
            <div className="map-header-actions">
              {mapExpanded ? (
                <button
                  type="button"
                  className="map-action-button"
                  ref={closeMapButtonRef}
                  onClick={() => setMapExpanded(false)}
                >
                  Close expanded map <span aria-hidden="true">×</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="map-action-button"
                  ref={expandMapButtonRef}
                  onClick={() => setMapExpanded(true)}
                >
                  Expand map <span aria-hidden="true">⤢</span>
                </button>
              )}
            </div>
          </div>

          <div className="map-controls">
            <div className="map-view-controls" role="group" aria-label="Map view">
              <button
                type="button"
                className={activeMapViewMode === 'overview' ? 'map-view-button active' : 'map-view-button'}
                onClick={() => {
                  setMapViewMode('overview')
                  setFocusedProjectId(null)
                }}
                aria-pressed={activeMapViewMode === 'overview'}
              >
                All visible
              </button>
              <button
                type="button"
                className={activeMapViewMode === 'match' ? 'map-view-button active' : 'map-view-button'}
                onClick={() => {
                  if (!selectedOverlap) return
                  setFocusedProjectId(null)
                  setMapViewMode('match')
                }}
                disabled={!selectedOverlap}
                aria-pressed={activeMapViewMode === 'match'}
              >
                Focus selected match
              </button>
            </div>
            <div className="utility-pills" role="group" aria-label="Map project filter">
              {['all', 'Dominion Energy South Carolina', 'Georgia Power'].map((utility) => (
                <button
                  key={utility}
                  type="button"
                  className={selectedUtility === utility ? 'pill active' : 'pill'}
                  onClick={() => setSelectedUtility(utility)}
                  aria-pressed={selectedUtility === utility}
                >
                  {utility === 'all'
                    ? 'All projects'
                    : utility === 'Dominion Energy South Carolina'
                      ? 'Dominion SC'
                      : utility}
                </button>
              ))}
            </div>
            <label className="select-field distance-band-filter">
              <span>Distance tier</span>
              <select value={distanceBand} onChange={(event) => setDistanceBand(event.target.value)}>
                <option value="all">All distances · {overlapData.length} pairs</option>
                <option value="under-0.1">Under 0.1 km · verify crossings</option>
                <option value="under-1.6">Under 1.6 km · land / access</option>
                <option value="under-8">Under 8 km · site logistics</option>
                <option value="under-40">Under 40 km · challenge screen</option>
                <option value="40-plus">40 km or farther · outside screen</option>
              </select>
            </label>
          </div>

          {selectedOverlap && (
            <section className="map-match-summary" aria-labelledby="map-match-title" aria-live="polite">
              <div className="map-match-heading">
                <span className="map-match-id">{selectedOverlap.id}</span>
                <div>
                  <p className="label">Selected project pair</p>
                  <h3 id="map-match-title">Two projects to compare</h3>
                </div>
              </div>
              <div className="map-match-projects">
                {[selectedOverlap.projectA, selectedOverlap.projectB].map((project) => (
                  <div className="map-match-project" key={project.id}>
                    <span className={`utility-dot ${project.utility === 'Georgia Power' ? 'gpc' : 'desc'}`} />
                    <div>
                      <strong>{utilityStyles[project.utility].label}</strong>
                      <span>{project.projectName}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="map-match-facts">
                <div>
                  <span>Point distance</span>
                  <strong>{formatDistanceKm(selectedOverlap.distanceKm)}</strong>
                  <small>{selectedDistanceTier?.title}</small>
                </div>
                <div>
                  <span>Schedule window gap</span>
                  <strong>{formatScheduleGap(selectedOverlap.timeGapDays)}</strong>
                  <small>{describeScheduleGap(selectedOverlap.timeGapDays)}</small>
                </div>
                <div>
                  <span>Screening score</span>
                  <strong>{selectedOverlap.score} / 100</strong>
                  <small>{selectedOverlap.distanceKm < SCREENING_DISTANCE_KM ? 'Ranking aid, not probability' : 'Outside the 40 km challenge limit'}</small>
                </div>
              </div>
              <p className="map-note">
                {filteredOpportunities.length} pairs in this distance view;{' '}
                {overlapData.filter((pair) => pair.distanceKm < SCREENING_DISTANCE_KM).length}{' '}
                are under the 40 km challenge threshold.
              </p>
              <button type="button" className="map-match-details-button" onClick={openMatchDetails}>
                View project details &amp; next steps <span aria-hidden="true">↓</span>
              </button>
            </section>
          )}

          <div className="map-layer-controls" aria-label="Map layers">
            <span>Map layers</span>
            <label><input type="checkbox" checked={showProjectPaths} onChange={(event) => setShowProjectPaths(event.target.checked)} /> Approximate endpoint joins</label>
            <label><input type="checkbox" checked={showPairLinks} onChange={(event) => setShowPairLinks(event.target.checked)} /> 40 km challenge-screen links</label>
            <label><input type="checkbox" checked={showNamedEndpoints} onChange={(event) => setShowNamedEndpoints(event.target.checked)} /> Listed project coordinates</label>
          </div>

          <MapContainer
            className="map"
            center={[32.8, -81.5]}
            zoom={7}
            scrollWheelZoom
            keyboard
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {selectedOverlap && selectedCostBreakdown && (
              <div className="leaflet-top leaflet-right map-cost-overlay">
                <details className="leaflet-control map-cost-card">
                  <summary className="map-cost-summary">
                    <span className="map-cost-icon" aria-hidden="true">$</span>
                    <span className="map-cost-summary-copy">
                      <span className="map-cost-eyebrow">{selectedOverlap.id} · SOURCE COSTS</span>
                      <strong>
                        {selectedCostBreakdown.disclosedCosts.length
                          ? `${formatCompactUsd(selectedCostBreakdown.disclosedTotalUsd)} disclosed`
                          : 'No disclosed costs'}
                      </strong>
                      <small>Project estimates only · savings not quantified</small>
                    </span>
                    <span className="map-cost-chevron" aria-hidden="true">⌄</span>
                  </summary>
                  <div className="map-cost-content">
                    <div className="map-cost-projects">
                      {[selectedOverlap.projectA, selectedOverlap.projectB].map((project) => (
                        <div className="map-cost-project" key={project.id}>
                          <span className={`utility-dot ${project.utility === 'Georgia Power' ? 'gpc' : 'desc'}`} />
                          <span>{utilityStyles[project.utility].label}</span>
                          <strong>
                            {Number.isFinite(project.estimatedCostUsd)
                              ? formatUsd(project.estimatedCostUsd)
                              : 'No project cost reported'}
                          </strong>
                          <small>
                            {project.costSource ? (
                              <a href={project.sourceUrl} target="_blank" rel="noreferrer">
                                {project.costSource}
                              </a>
                            ) : project.costDisclosure}
                          </small>
                        </div>
                      ))}
                    </div>
                    <div className="map-cost-total">
                      <span>Sum of disclosed project estimates</span>
                      <strong>{formatUsd(selectedCostBreakdown.disclosedTotalUsd)}</strong>
                      <small>
                        {selectedCostBreakdown.disclosedCosts.length} of {selectedCostBreakdown.totalProjectCount} projects have a reported estimate.
                        {' '}{selectedCostBreakdown.missingCostCount} missing estimate(s) excluded.
                      </small>
                    </div>
                    <p className="map-cost-caveat">
                      {selectedCostBreakdown.savingsUnavailableReason}
                    </p>
                  </div>
                </details>
              </div>
            )}

            {showProjectPaths && displayProjects.map((project) =>
              project.sites.length > 1 ? (
                <Polyline
                  key={`${project.id}-endpoints`}
                  positions={project.sites.map((site) => [site.lat, site.lon])}
                  pathOptions={{
                    color: utilityStyles[project.utility].color,
                    weight: 3,
                    opacity: 0.68,
                    dashArray: '4 7',
                  }}
                >
                  <Tooltip sticky>
                    {project.id} · approximate straight join between named locations, not route geometry
                  </Tooltip>
                </Polyline>
              ) : null,
            )}

            {showPairLinks && mapOpportunities.map((opportunity) => (
              <Polyline
                key={opportunity.id}
                positions={[
                  [opportunity.nearestPointA.lat, opportunity.nearestPointA.lon],
                  [opportunity.nearestPointB.lat, opportunity.nearestPointB.lon],
                ]}
                pathOptions={{
                  color: opportunity.id === selectedOverlap?.id ? '#b42318' : '#6d28d9',
                  weight: opportunity.id === selectedOverlap?.id ? 5 : 3,
                  opacity: opportunity.id === selectedOverlap?.id ? 1 : 0.72,
                  dashArray: '7 8',
                }}
              >
                <Tooltip sticky>
                  {opportunity.id} · {formatDistanceKm(opportunity.distanceKm)} between nearest listed coordinate points, not a route
                </Tooltip>
              </Polyline>
            ))}

            {displayProjects.map((project) => (
              <CircleMarker
                key={project.id}
                center={[project.lat, project.lon]}
                radius={
                  project.id === selectedOverlap?.projectIdA ||
                  project.id === selectedOverlap?.projectIdB
                    ? 11
                    : 8
                }
                pathOptions={{
                  color:
                    project.id === selectedMapProjectId
                      ? '#08737b'
                      : project.id === selectedOverlap?.projectIdA ||
                    project.id === selectedOverlap?.projectIdB
                      ? '#b42318'
                      : '#ffffff',
                  weight: project.id === selectedMapProjectId ? 4 : 3,
                  fillColor: utilityStyles[project.utility].color,
                  fillOpacity: 1,
                }}
                eventHandlers={{ click: () => focusProject(project) }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  permanent={project.id === selectedOverlap?.projectIdA || project.id === selectedOverlap?.projectIdB}
                  className={project.id === selectedOverlap?.projectIdA || project.id === selectedOverlap?.projectIdB ? 'map-cost-label' : undefined}
                >
                  {project.id === selectedOverlap?.projectIdA || project.id === selectedOverlap?.projectIdB
                    ? `${project.id} · ${Number.isFinite(project.estimatedCostUsd) ? formatCompactUsd(project.estimatedCostUsd) : 'cost not reported'}`
                    : `${project.id} · ${project.region}`}
                </Tooltip>
                <Popup>
                  <div className="popup-card">
                    <small className="popup-id">{project.id} · {utilityStyles[project.utility].label}</small>
                    <strong>{project.projectName}</strong>
                    <small>{project.region}</small>
                    <small>{formatScheduleDate(project)} · {project.status}</small>
                    <small>{formatDescriptionKm(project.description)}</small>
                    <small>
                      Estimated project cost:{' '}
                      {Number.isFinite(project.estimatedCostUsd)
                        ? `${formatUsd(project.estimatedCostUsd)} · ${project.costSource}`
                        : project.costDisclosure}
                    </small>
                    <small>
                      <a href={project.sourceUrl} target="_blank" rel="noreferrer">
                        Source: {project.sourceReference}
                      </a>
                    </small>
                    <small>Mapped points and straight-line joins are for screening; route geometry and coordinate-level citations are not verified.</small>
                    <button type="button" className="popup-focus-button" onClick={() => focusProject(project)}>
                      {filteredOpportunities.some((opportunity) => opportunity.projectIdA === project.id || opportunity.projectIdB === project.id)
                        ? 'Focus a matching pair'
                        : 'Focus this project'}
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {showNamedEndpoints && displayProjects.flatMap((project) =>
              project.sites.map((site) => (
                    <CircleMarker
                      key={`${project.id}-${site.name}`}
                      center={[site.lat, site.lon]}
                      radius={project.sites.length === 1 ? 4 : 5}
                      pathOptions={{
                        color: utilityStyles[project.utility].color,
                        weight: 2,
                        fillColor: '#ffffff',
                        fillOpacity: 0.95,
                      }}
                      eventHandlers={{ click: () => focusProject(project) }}
                    >
                      <Tooltip>{project.id} · {site.name}</Tooltip>
                      <Popup>
                        <div className="popup-card">
                          <small className="popup-id">Named location · {utilityStyles[project.utility].label}</small>
                          <strong>{site.name}</strong>
                          <small>{project.projectName}</small>
                          <small>Point location only; verified route geometry is not included.</small>
                          <small>Coordinate source citation is not attached to this dataset.</small>
                          <button type="button" className="popup-focus-button" onClick={() => focusProject(project)}>
                            Focus this project
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )),
            )}

            <MapViewport
              mode={activeMapViewMode}
              projects={displayProjects}
              opportunity={selectedOverlap}
              focusedProject={focusedProject}
              expanded={mapExpanded}
            />
          </MapContainer>
          {selectedMapProject && (
            <section className="map-project-inspector" aria-live="polite" aria-labelledby="map-project-title">
              <div className="map-project-inspector-main">
                <p className="label">Selected map project</p>
                <h3 id="map-project-title">{selectedMapProject.projectName}</h3>
                <p>
                  {utilityStyles[selectedMapProject.utility].label} · {selectedMapProject.projectType} · {selectedMapProject.region}
                </p>
                <p>{formatDescriptionKm(selectedMapProject.description)}</p>
                <p>
                  {formatScheduleDate(selectedMapProject)} · {selectedMapProject.status} ·{' '}
                  {Number.isFinite(selectedMapProject.estimatedCostUsd)
                    ? formatUsd(selectedMapProject.estimatedCostUsd)
                    : selectedMapProject.costDisclosure}
                </p>
                <p>
                  <a href={selectedMapProject.sourceUrl} target="_blank" rel="noreferrer">
                    Public project source: {selectedMapProject.sourceReference}
                  </a>
                </p>
                <div className="location-provenance">
                  <strong>{locationProvenance.verificationStatus}</strong>
                  <span>Source: {locationProvenance.sourceName} · coordinate basis: {locationProvenance.coordinateBasis}.</span>
                  <span>No verified route geometry is included.</span>
                </div>
              </div>
              <div className="map-related-matches">
                <span>Related matches</span>
                {selectedProjectMatches.length ? (
                  selectedProjectMatches.map((opportunity) => (
                    <button
                      type="button"
                      key={opportunity.id}
                      onClick={() => focusMatch(opportunity)}
                      className={selectedOverlap?.id === opportunity.id ? 'related-match active' : 'related-match'}
                    >
                      <strong>{opportunity.id}</strong>
                      <span>{formatDistanceKm(opportunity.distanceKm)} · {formatScheduleGap(opportunity.timeGapDays)}</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))
                ) : (
                  <p>No candidate matches are in the current filters.</p>
                )}
              </div>
            </section>
          )}
          <div className="map-legend" aria-label="Map legend">
            <span className="legend-group-label">POINTS</span>
            <span><i className="legend-dot desc" /> Dominion project point</span>
            <span><i className="legend-dot gpc" /> Georgia Power project point</span>
            <span><i className="legend-dot endpoint" /> Listed project coordinate</span>
            <span><i className="legend-cost-tag">$</i> Selected project public estimate</span>
            <span className="legend-group-label">LINES</span>
            <span><i className="legend-line endpoint-join" /> Approximate within-project join</span>
            <span><i className="legend-line overlap" /> Cross-utility screening distance</span>
          </div>
          <p className="map-note">
            Matches are the minimum distance between listed coordinate points, not measured route
            distance. Lines are straight-line screening aids; coordinate-level citations and route
            geometry are not supplied.
          </p>
          <p className="map-note">
            The 2026–2030 SCRTP file contains 54 mapped Dominion projects. Georgia Power’s supplied
            set contains 11 mapped transmission/substation projects; generation-only and non-geographic
            records are excluded from map screening.
          </p>
        </div>

        <aside className="panel results-panel">
          <div className="panel-header results-heading">
            <div>
              <p className="label">02 · Review candidates</p>
              <h2>Cross-utility project pairs</h2>
              <p className="panel-subtitle">Browse the list independently; only pairs under 40 km are geographic overlaps under the challenge rule.</p>
            </div>
            <span className="result-count">{filteredOpportunities.length} pairs</span>
          </div>
          <div className="opportunity-list" aria-label="Candidate pairs; scroll this list to browse">
            {filteredOpportunities.map((opportunity, index) => (
              <button
                key={opportunity.id}
                type="button"
                className={selectedOverlap?.id === opportunity.id ? 'opportunity-card selected' : 'opportunity-card'}
                onClick={() => focusMatch(opportunity)}
                aria-pressed={selectedOverlap?.id === opportunity.id}
              >
                <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="card-copy">
                  <span className="card-header">
                    <strong>{opportunity.projectA.projectName}</strong>
                    <span className="versus">×</span>
                    <strong>{opportunity.projectB.projectName}</strong>
                  </span>
                  <span className="meta-row">
                    <span>{formatDistanceKm(opportunity.distanceKm)} between listed points</span>
                    <span>{formatScheduleGap(opportunity.timeGapDays)}</span>
                  </span>
                  <span className={opportunity.distanceKm < SCREENING_DISTANCE_KM ? 'pair-screen-status qualifies' : 'pair-screen-status'}>
                    {getDistanceTier(opportunity.distanceKm).title}
                  </span>
                </span>
                <span className="score-pill">
                  <strong>{opportunity.score}</strong>
                  <small>{opportunity.distanceKm < SCREENING_DISTANCE_KM ? 'score' : 'outside'}</small>
                </span>
              </button>
            ))}
            {filteredOpportunities.length === 0 && (
              <div className="empty-state">
                <strong>No matches for these filters</strong>
                <span>Try a wider distance, a different schedule gap, or a broader search.</span>
                <button type="button" onClick={resetScreening}>Clear filters</button>
              </div>
            )}
          </div>
        </aside>
      </section>

      {selectedOverlap && (
        <section className="assistant-panel quick-assistant-panel" aria-labelledby="assistant-title">
          <div className="section-heading assistant-heading">
            <div>
              <p className="label">03 · Ask about this data</p>
              <h3 id="assistant-title">Gemini project guide</h3>
            </div>
            <button type="button" className="clear-chat-button" onClick={clearConversation} disabled={chatLoading}>New chat</button>
          </div>
          <p className="assistant-intro">
            Ask about the selected projects, map, distance tiers, schedule signal, screening score, or possible next checks. Pair context is attached automatically.
          </p>
          <div className="context-chip"><i /> Context: {selectedOverlap.id} · {formatDistanceKm(selectedOverlap.distanceKm)} listed points · score {selectedOverlap.score}</div>
          <div className="starter-questions" aria-label="Suggested questions">
            {starterQuestions.map((question) => (
              <button key={question} type="button" onClick={() => setChatInput(question)} disabled={chatLoading}>
                {question}<span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <div className="chat-transcript" aria-live="polite" aria-label="Assistant conversation" ref={chatTranscriptRef}>
            {chatMessages.map((message, index) => (
              <div className={`chat-message ${message.role === 'user' ? 'from-user' : 'from-assistant'}`} key={`${message.role}-${index}`}>
                <span>{message.role === 'user' ? 'You' : 'Gemini · GridAlign'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {chatLoading && <div className="chat-message from-assistant" role="status"><span>Gemini · GridAlign</span><p>Checking the selected data…</p></div>}
          </div>
          {chatError && <p className="chat-error" role="alert">{chatError}</p>}
          <form className="chat-form" onSubmit={submitChat}>
            <label className="visually-hidden" htmlFor="assistant-question">Ask Gemini about the selected project pair</label>
            <textarea
              id="assistant-question"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Ask about the map, dates, score, or next steps…"
              maxLength={1_500}
              rows={3}
              disabled={chatLoading}
            />
            <div className="chat-submit-row">
              <span>{chatInput.length} / 1,500</span>
              <button type="submit" className="send-button" disabled={chatLoading || !chatInput.trim()}>
                {chatLoading ? 'Thinking…' : 'Ask Gemini <'}
              </button>
            </div>
          </form>
          <p className="privacy-note">Your question and selected public project details go to Google Gemini. Do not enter confidential, personal, or CEII information.</p>
        </section>
      )}

      {selectedOverlap ? (
        <section className="detail-section" aria-labelledby="detail-title">
          <div className="detail-section-heading">
            <div>
              <p className="label">03 · Understand the selected pair</p>
              <h2 id="detail-title">Match details &amp; next steps</h2>
            </div>
            <div className="detail-actions">
              <span className="selected-id">{selectedOverlap.id} · selected</span>
              <button type="button" className="export-button" onClick={downloadSelectedMatchCsv}>
                Download match CSV
              </button>
              <button type="button" className="export-button primary" onClick={printSelectedMatch}>
                Print / Save PDF
              </button>
            </div>
          </div>
          <div className="detail-layout">
            <div className="detail-main">
              <div className="detail-summary">
                <div className="score-display">
                  <span>Screening score</span>
                  <strong>{selectedOverlap.score}<small> / 100</small></strong>
                  <small>{selectedOverlap.distanceKm < SCREENING_DISTANCE_KM ? 'Ranking aid, not a probability' : 'Outside the geographic overlap limit'}</small>
                </div>
                <div className="detail-grid">
                  <div><label>Nearest listed coordinate points</label><strong>{formatDistanceKm(selectedOverlap.distanceKm)}</strong><small>Not a measured route distance</small></div>
                  <div><label>Schedule window gap</label><strong>{formatScheduleGap(selectedOverlap.timeGapDays)}</strong><small>{describeScheduleGap(selectedOverlap.timeGapDays)}</small></div>
                </div>
              </div>
              <section className="why-result" aria-labelledby="why-result-title">
                <div>
                  <p className="label">Why this result?</p>
                  <h3 id="why-result-title">{selectedDistanceTier?.title}</h3>
                </div>
                <p>
                  The minimum Haversine distance between the supplied project coordinate points is{' '}
                  <strong>{formatDistanceKm(selectedOverlap.distanceKm)}</strong>.{' '}
                  {selectedDistanceTier?.descriptor}
                </p>
                <p><strong>Schedule signal:</strong> {selectedOverlap.timeGapDays === 0
                  ? 'The supplied schedule windows overlap or touch.'
                  : selectedOverlap.timeGapDays === null
                    ? 'At least one usable schedule window is unavailable, so timeline alignment cannot be assessed.'
                    : `The supplied schedule windows have a ${selectedOverlap.timeGapDays.toLocaleString()} day gap.`}</p>
                <p><strong>How the score works:</strong> {getScreeningScoreExplanation(selectedOverlap)}</p>
                <small>Coordinates are screening points without point-level citations. This distance is not a route length and does not prove a shared corridor.</small>
              </section>
              {selectedCostBreakdown && (
                <section className="detail-cost-breakdown" aria-label="Documented project cost breakdown">
                  <div>
                    <p className="label">Documented project cost breakdown</p>
                    <strong>{formatUsd(selectedCostBreakdown.disclosedTotalUsd)} disclosed estimates</strong>
                    <span>
                      Sum of reported project estimates only; {selectedCostBreakdown.missingCostCount} of{' '}
                      {selectedCostBreakdown.totalProjectCount} project costs are not disclosed.
                    </span>
                  </div>
                  <p>{selectedCostBreakdown.savingsUnavailableReason} These are project-level capital estimates, not the costs of potentially shareable work.</p>
                </section>
              )}
              <div className="project-comparison">
                {[selectedOverlap.projectA, selectedOverlap.projectB].map((project) => (
                  <article className={`project-box ${project.utility === 'Georgia Power' ? 'georgia' : 'dominion'}`} key={project.id}>
                    <span className="project-utility"><i />{utilityStyles[project.utility].label}</span>
                    <span className="project-type">{project.projectType}</span>
                    <h3>{project.projectName}</h3>
                    <div className="project-facts">
                      <span>{project.region}</span>
                      <span>{formatScheduleDate(project)} <strong>{project.status}</strong></span>
                      <span className="project-cost-fact">
                        Public estimated project cost
                        <strong>{Number.isFinite(project.estimatedCostUsd) ? formatUsd(project.estimatedCostUsd) : 'Not reported in supplied source'}</strong>
                        <small>{project.costSource ?? project.costDisclosure}</small>
                      </span>
                      <span>
                        <a href={project.sourceUrl} target="_blank" rel="noreferrer">
                          Source: {project.sourceReference}
                        </a>
                      </span>
                      <span>{formatDescriptionKm(project.description)}</span>
                    </div>
                    <div className="location-provenance compact">
                      <strong>{locationProvenance.verificationStatus}</strong>
                      <span>Source: {locationProvenance.sourceName} · basis: not documented.</span>
                    </div>
                  </article>
                ))}
              </div>
              <section className="coordination-playbook" aria-labelledby="coordination-title">
                <div className="section-heading">
                  <div>
                    <p className="label">Potential areas to explore</p>
                    <h3 id="coordination-title">What could be coordinated?</h3>
                    <p className="panel-subtitle">Closer-distance opportunities are cumulative. Highlighted tier applies to the selected pair.</p>
                  </div>
                  <span className="hypothesis-tag">Ideas to verify</span>
                </div>
                <div className="coordination-grid">
                  {selectedCoordinationOptions.map((option, index) => (
                    <article
                      className={`coordination-option${option.applicable === true ? ' applicable' : option.applicable === false ? ' not-applicable' : ''}`}
                      key={option.key ?? option.title}
                    >
                      <span className="idea-number">0{index + 1}</span>
                      <div className="option-heading"><h4>{option.title}</h4><span>{option.confidence}</span></div>
                      <p>{option.descriptor}</p>
                      {option.share && <strong className="coordination-share">{option.share}</strong>}
                      <small>{option.type}</small>
                    </article>
                  ))}
                </div>
                <p className="data-note">Shared crews, materials, access, outage windows, and savings are not confirmed. Validate with both utilities before acting.</p>
              </section>
            </div>
          </div>
        </section>
      ) : (
        <section className="no-selection">
          <h2>Select a match to compare project details</h2>
          <p>Clear or widen your filters to find a candidate pair.</p>
        </section>
      )}
      <footer className="page-footer">
        <span>GridAlign · Utility project screening</span>
        <span>Distances and route depictions are approximate. Confirm source schedules and geometry independently.</span>
      </footer>
      {selectedOverlap && (
        <article className="print-report" aria-hidden="true">
          <header>
            <p>GridAlign · Utility project screening</p>
            <h1>Cross-utility screening brief</h1>
            <p>{selectedOverlap.id} · Generated {new Date().toLocaleDateString()}</p>
          </header>
          <section>
            <h2>Screening signals</h2>
            <p><strong>Nearest listed coordinate points:</strong> {formatDistanceKm(selectedOverlap.distanceKm)} (not route distance)</p>
            <p><strong>Schedule window gap:</strong> {formatScheduleGap(selectedOverlap.timeGapDays)}</p>
            <p><strong>Screening score:</strong> {selectedOverlap.score} / 100. {getScreeningScoreExplanation(selectedOverlap)}</p>
            <p><strong>Why / what may be shared:</strong> {selectedDistanceTier?.title} — {selectedDistanceTier?.share}</p>
            <ul>
              {selectedCoordinationOptions
                .filter((option) => option.key)
                .map((option) => (
                  <li key={option.key}>
                    <strong>{option.type}:</strong> {option.applicable
                      ? option.share
                      : 'Not indicated at this distance.'}
                  </li>
                ))}
            </ul>
            {selectedCostBreakdown && (
              <p><strong>Disclosed project estimates:</strong> {formatUsd(selectedCostBreakdown.disclosedTotalUsd)} combined known amount across {selectedCostBreakdown.disclosedCosts.length} project(s); {selectedCostBreakdown.missingCostCount} project cost(s) unavailable. This is not a coordination-savings estimate. {selectedCostBreakdown.savingsUnavailableReason}</p>
            )}
          </section>
          <section>
            <h2>Projects</h2>
            {[selectedOverlap.projectA, selectedOverlap.projectB].map((project) => (
              <article key={project.id}>
                <h3>{utilityStyles[project.utility].label} · {project.id}</h3>
                <p><strong>{project.projectName}</strong></p>
                <p>{project.projectType} · {project.region}</p>
                <p>{formatScheduleDate(project)} · {project.status}</p>
                <p>{formatDescriptionKm(project.description)}</p>
                <p>
                  <strong>Estimated project cost:</strong>{' '}
                  {Number.isFinite(project.estimatedCostUsd)
                    ? `${formatUsd(project.estimatedCostUsd)} · ${project.costSource}`
                    : project.costDisclosure}
                </p>
                <p><a href={project.sourceUrl}>{project.sourceReference}</a></p>
                <p>Project screening point: {project.lat}, {project.lon}</p>
                <p>Named locations: {project.sites.map((site) => `${site.name} (${site.lat}, ${site.lon})`).join('; ')}</p>
                <p>Location source: {locationProvenance.sourceName}; {locationProvenance.verificationStatus}.</p>
              </article>
            ))}
          </section>
          <section>
            <h2>Potential coordination questions</h2>
            <ul>
              {selectedCoordinationOptions.map((option) => (
                <li key={option.title}><strong>{option.title}:</strong> {option.descriptor}</li>
              ))}
            </ul>
          </section>
          <footer>
            <p><strong>Important limitations:</strong> The reported distance is a screening distance between project points. Coordinates have no project-specific citations attached. No verified transmission route geometry is supplied; straight lines are not surveyed routes or proof of a shared corridor.</p>
            <p>Planning references supplied with this dataset: Dominion Energy 2024–2028 project descriptions and Georgia Power 2025 IRP Volume 3 Public Disclosure. Verify project details, location, schedules, and all coordination assumptions with current public filings and both utilities.</p>
          </footer>
        </article>
      )}
    </div>
  )
}

export default App
