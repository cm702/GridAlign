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

const projectData = [
  {
    id: 'DESC_1',
    utility: 'Dominion Energy South Carolina',
    state: 'SC',
    projectName: 'Stevens Creek - Hooks 115 kV / LR Plumb Branch 46 kV Rebuilds',
    projectType: 'Transmission line rebuild',
    lat: 33.562599,
    lon: -82.051362,
    sites: [{ name: 'Stevens Creek Substation', lat: 33.562599, lon: -82.051362 }],
    inServiceDate: '2024-12-31',
    region: 'Stevens Creek / Augusta area',
  },
  {
    id: 'DESC_2',
    utility: 'Dominion Energy South Carolina',
    state: 'SC',
    projectName: 'Hooks - Thurmond 115 kV Tie: Rebuild',
    projectType: 'Transmission line tie rebuild',
    lat: 33.660127,
    lon: -82.195931,
    sites: [{ name: 'Thurmond Substation', lat: 33.660127, lon: -82.195931 }],
    inServiceDate: '2024-12-31',
    region: 'Thurmond / Augusta area',
  },
  {
    id: 'DESC_3',
    utility: 'Dominion Energy South Carolina',
    state: 'SC',
    projectName: 'Jasper - Okatie 230 kV #2: Construct',
    projectType: 'New 230 kV transmission line',
    lat: 32.346439,
    lon: -81.0785475,
    sites: [
      { name: 'Jasper Substation', lat: 32.35912, lon: -81.1246 },
      { name: 'Okatie Substation', lat: 32.333758, lon: -81.032495 },
    ],
    inServiceDate: '2025-12-31',
    region: 'Jasper to Okatie corridor',
  },
  {
    id: 'DESC_4',
    utility: 'Dominion Energy South Carolina',
    state: 'SC',
    projectName: 'Queensboro - Ft Johnson 115 kV & Queensboro-Bayfront 115 kV',
    projectType: 'Multiple 115 kV transmission line projects',
    lat: 32.722793,
    lon: -79.967332,
    sites: [{ name: 'Queensboro Substation', lat: 32.722793, lon: -79.967332 }],
    inServiceDate: '2023-12-31',
    region: 'Charleston / James Island',
  },
  {
    id: 'DESC_5',
    utility: 'Dominion Energy South Carolina',
    state: 'SC',
    projectName: 'Okatie-Bluffton 115 kV: Rebuild',
    projectType: '115 kV transmission line rebuild',
    lat: 32.2843925,
    lon: -80.9429395,
    sites: [
      { name: 'Okatie Substation', lat: 32.333758, lon: -81.032495 },
      { name: 'Bluffton Substation', lat: 32.235027, lon: -80.853384 },
    ],
    inServiceDate: '2025-06-01',
    region: 'Okatie / Bluffton',
  },
  {
    id: 'GPC_1',
    utility: 'Georgia Power',
    state: 'GA',
    projectName: 'EVANS PRIMARY - THURMOND DAM (USA) #5 115KV REBUILD',
    projectType: '115 kV transmission line rebuild',
    lat: 33.6020605,
    lon: -82.1822895,
    sites: [
      { name: 'Evans Primary', lat: 33.543994, lon: -82.168648 },
      { name: 'Thurmond Dam #5', lat: 33.660127, lon: -82.195931 },
    ],
    inServiceDate: '2033-06-01',
    region: 'Evans / Thurmond Dam corridor',
  },
  {
    id: 'GPC_2',
    utility: 'Georgia Power',
    state: 'GA',
    projectName: 'SAV: MCINTOSH - PURRYSBURG 230KV REACTORS',
    projectType: '230 kV reactor / substation equipment',
    lat: 32.352116,
    lon: -81.175112,
    sites: [{ name: 'McIntosh', lat: 32.352116, lon: -81.175112 }],
    inServiceDate: '2026-06-01',
    region: 'Savannah / Purrysburg',
  },
  {
    id: 'GPC_3',
    utility: 'Georgia Power',
    state: 'GA',
    projectName: 'SAV: GOSHEN (SAV) - MCINTOSH 115KV LINE REBUILD',
    projectType: '115 kV transmission line rebuild',
    lat: 32.3004085,
    lon: -81.1957885,
    sites: [
      { name: 'Goshen', lat: 32.248701, lon: -81.209472 },
      { name: 'McIntosh', lat: 32.352116, lon: -81.182105 },
    ],
    inServiceDate: '2027-06-01',
    region: 'Savannah / McIntosh',
  },
  {
    id: 'GPC_4',
    utility: 'Georgia Power',
    state: 'GA',
    projectName: 'MITCHELL - NORTH TIFTON 230KV RECONDUCTOR',
    projectType: '230 kV line reconductor',
    lat: 31.462605,
    lon: -83.8414865,
    sites: [
      { name: 'Mitchell Substation', lat: 31.447121, lon: -84.133843 },
      { name: 'North Tifton Substation', lat: 31.478089, lon: -83.54913 },
    ],
    inServiceDate: '2025-05-01',
    region: 'Mitchell / Tifton',
  },
  {
    id: 'GPC_5',
    utility: 'Georgia Power',
    state: 'GA',
    projectName: 'JESUP - LUDOWICI PRIMARY 115KV REBUILD',
    projectType: '115 kV transmission line rebuild',
    lat: 31.6623515,
    lon: -81.834325,
    sites: [
      { name: 'Jesup', lat: 31.603106, lon: -81.924947 },
      { name: 'Ludowici Primary', lat: 31.721597, lon: -81.743703 },
    ],
    inServiceDate: '2025-06-01',
    region: 'Jesup / Ludowici',
  },
]

const overlapData = [
  {
    id: 'OVL_1',
    distanceMi: 4.09,
    timeGapDays: 3074,
    utilityA: 'Dominion Energy South Carolina',
    projectIdA: 'DESC_2',
    projectNameA: 'Hooks - Thurmond 115 kV Tie: Rebuild',
    utilityB: 'Georgia Power',
    projectIdB: 'GPC_1',
    projectNameB: 'EVANS PRIMARY - THURMOND DAM (USA) #5 115KV REBUILD',
  },
  {
    id: 'OVL_2',
    distanceMi: 5.65,
    timeGapDays: 152,
    utilityA: 'Dominion Energy South Carolina',
    projectIdA: 'DESC_3',
    projectNameA: 'Jasper - Okatie 230 kV #2: Construct',
    utilityB: 'Georgia Power',
    projectIdB: 'GPC_2',
    projectNameB: 'SAV: MCINTOSH - PURRYSBURG 230KV REACTORS',
  },
  {
    id: 'OVL_3',
    distanceMi: 7.55,
    timeGapDays: 517,
    utilityA: 'Dominion Energy South Carolina',
    projectIdA: 'DESC_3',
    projectNameA: 'Jasper - Okatie 230 kV #2: Construct',
    utilityB: 'Georgia Power',
    projectIdB: 'GPC_3',
    projectNameB: 'SAV: GOSHEN (SAV) - MCINTOSH 115KV LINE REBUILD',
  },
  {
    id: 'OVL_4',
    distanceMi: 8.01,
    timeGapDays: 3074,
    utilityA: 'Dominion Energy South Carolina',
    projectIdA: 'DESC_1',
    projectNameA: 'Stevens Creek - Hooks 115 kV / LR Plumb Branch 46 kV Rebuilds',
    utilityB: 'Georgia Power',
    projectIdB: 'GPC_1',
    projectNameB: 'EVANS PRIMARY - THURMOND DAM (USA) #5 115KV REBUILD',
  },
  {
    id: 'OVL_5',
    distanceMi: 14.34,
    timeGapDays: 365,
    utilityA: 'Dominion Energy South Carolina',
    projectIdA: 'DESC_5',
    projectNameA: 'Okatie-Bluffton 115 kV: Rebuild',
    utilityB: 'Georgia Power',
    projectIdB: 'GPC_2',
    projectNameB: 'SAV: MCINTOSH - PURRYSBURG 230KV REACTORS',
  },
  {
    id: 'OVL_6',
    distanceMi: 14.81,
    timeGapDays: 730,
    utilityA: 'Dominion Energy South Carolina',
    projectIdA: 'DESC_5',
    projectNameA: 'Okatie-Bluffton 115 kV: Rebuild',
    utilityB: 'Georgia Power',
    projectIdB: 'GPC_3',
    projectNameB: 'SAV: GOSHEN (SAV) - MCINTOSH 115KV LINE REBUILD',
  },
]

const projectMap = Object.fromEntries(projectData.map((project) => [project.id, project]))
const utilityStyles = {
  'Dominion Energy South Carolina': { color: '#087ea4', label: 'Dominion Energy SC' },
  'Georgia Power': { color: '#c65314', label: 'Georgia Power' },
}

const coordinationOptions = {
  OVL_1: [
    {
      title: 'Compare outage and switching windows',
      descriptor: 'Both plans describe 115 kV line rebuild work near Thurmond. Compare planned outages, switching constraints, and restoration sequencing before schedules are locked.',
      type: 'Operations coordination',
      confidence: 'Worth checking',
    },
    {
      title: 'Check compatible rebuild materials',
      descriptor: 'Compare conductor, insulator, and hardware specifications to see whether procurement timing or spare-parts standards can be aligned. Compatibility is not established by the project list.',
      type: 'Procurement review',
      confidence: 'Needs engineering review',
    },
  ],
  OVL_2: [
    {
      title: 'Coordinate transmission planning assumptions',
      descriptor: 'A new 230 kV line and a 230 kV reactor project are listed about 5.65 miles apart. Compare load-flow assumptions, commissioning dependencies, and planned outage windows.',
      type: 'Planning & commissioning',
      confidence: 'Strong review candidate',
    },
    {
      title: 'Review contractor access and mobilization',
      descriptor: 'Ask whether civil or electrical contractors could coordinate mobilization or staging. The projects are nearby, but shared sites, access, and contractors are not confirmed.',
      type: 'Construction logistics',
      confidence: 'Possible — verify locally',
    },
  ],
  OVL_3: [
    {
      title: 'Align line-work outage windows',
      descriptor: 'Both projects include transmission line work in the wider Savannah/Jasper–Okatie area. Compare outage requests, switching plans, and commissioning sequences.',
      type: 'Operations coordination',
      confidence: 'Strong review candidate',
    },
    {
      title: 'Compare construction mobilization plans',
      descriptor: 'Review whether crew scheduling, contractor mobilization, or material deliveries can be sequenced together. The 7.55-mile screening distance does not establish a shared route.',
      type: 'Construction logistics',
      confidence: 'Possible — verify locally',
    },
  ],
  OVL_4: [
    {
      title: 'Review long-range outage and asset plans',
      descriptor: 'The listed projects are both line rebuilds in the Augusta/Thurmond area, but their planned in-service dates are about 8.4 years apart. Check for updated schedules before assuming coordination is practical.',
      type: 'Long-range planning',
      confidence: 'Low until schedules are refreshed',
    },
    {
      title: 'Compare standards and spare parts',
      descriptor: 'A standards review may identify compatible components or maintenance practices. Any shared inventory or specifications require engineering confirmation.',
      type: 'Engineering & procurement',
      confidence: 'Needs engineering review',
    },
  ],
  OVL_5: [
    {
      title: 'Compare construction and outage calendars',
      descriptor: 'A 115 kV line rebuild and 230 kV reactor work are scheduled about a year apart in the broader Okatie/Savannah area. Check whether outage planning or commissioning dependencies can be coordinated.',
      type: 'Operations coordination',
      confidence: 'Worth checking',
    },
    {
      title: 'Check regional contractor sequencing',
      descriptor: 'Compare procurement lead times and contractor mobilization plans. Shared crews, access, and staging are only possibilities until each utility confirms them.',
      type: 'Construction logistics',
      confidence: 'Possible — verify locally',
    },
  ],
  OVL_6: [
    {
      title: 'Coordinate line outage and commissioning plans',
      descriptor: 'Both projects describe 115 kV line rebuild work in the wider coastal Georgia/Lowcountry region. Compare outage windows and commissioning constraints.',
      type: 'Operations coordination',
      confidence: 'Worth checking',
    },
    {
      title: 'Compare conductor and hardware standards',
      descriptor: 'Check whether line materials or specifications are compatible before considering joint procurement or spare-parts planning. The project descriptions alone do not confirm compatibility.',
      type: 'Engineering & procurement',
      confidence: 'Needs engineering review',
    },
  ],
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

function getOpportunityScore(opportunity) {
  const distanceScore = Math.max(0, 100 - opportunity.distanceMi * 3.5)
  const timeScore = Math.max(0, 100 - Math.min(opportunity.timeGapDays / 50, 100))
  return Math.round(distanceScore * 0.7 + timeScore * 0.3)
}

function describeScheduleGap(days) {
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
  const [maxDistance, setMaxDistance] = useState(25)
  const [selectedUtility, setSelectedUtility] = useState('all')
  const [selectedOverlapId, setSelectedOverlapId] = useState('OVL_2')
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
    opportunityId: 'OVL_2',
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
    () => overlapData.filter((overlap) => overlap.distanceMi <= maxDistance),
    [maxDistance],
  )

  const opportunityRows = useMemo(
    () =>
      visibleOverlaps
        .map((opportunity) => ({
          ...opportunity,
          projectA: projectMap[opportunity.projectIdA],
          projectB: projectMap[opportunity.projectIdB],
          score: getOpportunityScore(opportunity),
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
        (scheduleWindow === 'within-year' && opportunity.timeGapDays <= 365) ||
        (scheduleWindow === 'within-three-years' && opportunity.timeGapDays <= 1_096) ||
        (scheduleWindow === 'long-range' && opportunity.timeGapDays > 1_096)
      return matchesQuery && matchesSchedule
    })

    return matches.sort((a, b) => {
      if (sortBy === 'distance') return a.distanceMi - b.distanceMi
      if (sortBy === 'schedule') return a.timeGapDays - b.timeGapDays
      return b.score - a.score
    })
  }, [opportunityRows, scheduleWindow, searchTerm, sortBy])

  const selectedOverlap =
    filteredOpportunities.find((opportunity) => opportunity.id === selectedOverlapId) ??
    filteredOpportunities[0]
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
    selectedUtility === 'all' ? filteredOpportunities : selectedOverlap ? [selectedOverlap] : []
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
    ? Math.min(...filteredOpportunities.map((pair) => pair.distanceMi)).toFixed(1)
    : '—'

  function resetScreening() {
    setMaxDistance(25)
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
            distanceMi: selectedOverlap.distanceMi,
            timeGapDays: selectedOverlap.timeGapDays,
            screeningScore: selectedOverlap.score,
            coordinationIdeas: coordinationOptions[selectedOverlap.id].map((option) => ({
              title: option.title,
              type: option.type,
              descriptor: option.descriptor,
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
          <p>Explore project locations and schedule signals, then ask Gemini about the match in front of you.</p>
        </div>
        <div className="hero-aside">
          <span className="source-badge"><i /> Public planning data</span>
          <span>Screening leads, not confirmed coordination</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Screening summary">
        <div className="stat-card highlight">
          <span>Matches in view</span>
          <strong>{filteredOpportunities.length}<small> / {visibleOverlaps.length}</small></strong>
          <small>After your filters</small>
        </div>
        <div className="stat-card">
          <span>Projects on map</span>
          <strong>{displayProjects.length}</strong>
          <small>Locations and named endpoints</small>
        </div>
        <div className="stat-card">
          <span>Closest match</span>
          <strong>{closestDistance}<small>{closestDistance === '—' ? '' : ' mi'}</small></strong>
          <small>Reported point-to-point distance</small>
        </div>
        <div className="stat-card">
          <span>Distance screen</span>
          <strong>{maxDistance}<small> mi</small></strong>
          <small>Maximum for the candidate list</small>
        </div>
      </section>

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
            <option value="any">Any date gap</option>
            <option value="within-year">Within 1 year</option>
            <option value="within-three-years">Within 3 years</option>
            <option value="long-range">Over 3 years</option>
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
                  ? `Focused on ${selectedOverlap.id} · ${selectedOverlap.distanceMi.toFixed(2)} mi screening distance`
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
            <label className="slider-wrap" htmlFor="distance-slider">
              <span>Within</span>
              <input
                id="distance-slider"
                type="range"
                min="5"
                max="25"
                step="1"
                value={maxDistance}
                onChange={(event) => setMaxDistance(Number(event.target.value))}
              />
              <strong>{maxDistance} mi</strong>
            </label>
          </div>

          {selectedOverlap && (
            <section className="map-match-summary" aria-labelledby="map-match-title" aria-live="polite">
              <div className="map-match-heading">
                <span className="map-match-id">{selectedOverlap.id}</span>
                <div>
                  <p className="label">Selected potential match</p>
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
                  <strong>{selectedOverlap.distanceMi.toFixed(2)} mi</strong>
                </div>
                <div>
                  <span>Planned-date gap</span>
                  <strong>{selectedOverlap.timeGapDays.toLocaleString()} days</strong>
                  <small>{describeScheduleGap(selectedOverlap.timeGapDays)}</small>
                </div>
                <div>
                  <span>Screening rank</span>
                  <strong>{selectedOverlap.score} / 100</strong>
                  <small>Not a probability or savings estimate</small>
                </div>
              </div>
              <button type="button" className="map-match-details-button" onClick={openMatchDetails}>
                View project details &amp; next steps <span aria-hidden="true">↓</span>
              </button>
            </section>
          )}

          <div className="map-layer-controls" aria-label="Map layers">
            <span>Map layers</span>
            <label><input type="checkbox" checked={showProjectPaths} onChange={(event) => setShowProjectPaths(event.target.checked)} /> Approximate endpoint joins</label>
            <label><input type="checkbox" checked={showPairLinks} onChange={(event) => setShowPairLinks(event.target.checked)} /> Screening-distance links</label>
            <label><input type="checkbox" checked={showNamedEndpoints} onChange={(event) => setShowNamedEndpoints(event.target.checked)} /> Named locations</label>
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
                  [opportunity.projectA.lat, opportunity.projectA.lon],
                  [opportunity.projectB.lat, opportunity.projectB.lon],
                ]}
                pathOptions={{
                  color: opportunity.id === selectedOverlap?.id ? '#b42318' : '#6d28d9',
                  weight: opportunity.id === selectedOverlap?.id ? 5 : 3,
                  opacity: opportunity.id === selectedOverlap?.id ? 1 : 0.72,
                  dashArray: '7 8',
                }}
              >
                <Tooltip sticky>
                  {opportunity.id} · {opportunity.distanceMi.toFixed(2)} mi screening distance between project points, not a route
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
                <Tooltip direction="top" offset={[0, -8]}>
                  {project.id} · {project.region}
                </Tooltip>
                <Popup>
                  <div className="popup-card">
                    <small className="popup-id">{project.id} · {utilityStyles[project.utility].label}</small>
                    <strong>{project.projectName}</strong>
                    <small>{project.region}</small>
                    <small>Planned in service: {project.inServiceDate}</small>
                    <small>{project.sites.length} named {project.sites.length === 1 ? 'location' : 'locations'} in working data</small>
                    <small>These coordinates are screening locations; project-specific coordinate citations are not attached.</small>
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
                      <span>{opportunity.distanceMi.toFixed(2)} mi · {opportunity.timeGapDays.toLocaleString()} day gap</span>
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
            <span><i className="legend-dot endpoint" /> Named site</span>
            <span className="legend-group-label">LINES</span>
            <span><i className="legend-line endpoint-join" /> Approximate within-project join</span>
            <span><i className="legend-line overlap" /> Cross-utility screening distance</span>
          </div>
          <p className="map-note">
            No verified transmission-route geometry is included. Lines are straight-line screening
            aids; per-location coordinate source citations are not attached to the working dataset.
          </p>
        </div>

        <aside className="panel results-panel">
          <div className="panel-header results-heading">
            <div>
              <p className="label">02 · Review candidates</p>
              <h2>Potential matches</h2>
              <p className="panel-subtitle">Rank is a screening aid—not predicted savings.</p>
            </div>
            <span className="result-count">{filteredOpportunities.length} found</span>
          </div>
          <div className="opportunity-list">
            {filteredOpportunities.map((opportunity, index) => (
              <button
                key={opportunity.id}
                type="button"
                className={selectedOverlap?.id === opportunity.id ? 'opportunity-card selected' : 'opportunity-card'}
                onClick={() => focusMatch(opportunity)}
                aria-pressed={selectedOverlap?.id === opportunity.id}
              >
                <span className="rank">0{index + 1}</span>
                <span className="card-copy">
                  <span className="card-header">
                    <strong>{opportunity.projectA.projectName}</strong>
                    <span className="versus">×</span>
                    <strong>{opportunity.projectB.projectName}</strong>
                  </span>
                  <span className="meta-row">
                    <span>{opportunity.distanceMi.toFixed(2)} mi apart</span>
                    <span>{opportunity.timeGapDays.toLocaleString()} day date gap</span>
                  </span>
                </span>
                <span className="score-pill"><strong>{opportunity.score}</strong><small>rank</small></span>
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
                  <span>Screening rank</span>
                  <strong>{selectedOverlap.score}<small> / 100</small></strong>
                </div>
                <div className="detail-grid">
                  <div><label>Reported point distance</label><strong>{selectedOverlap.distanceMi.toFixed(2)} mi</strong></div>
                  <div><label>Planned-date gap</label><strong>{selectedOverlap.timeGapDays.toLocaleString()} days</strong><small>{describeScheduleGap(selectedOverlap.timeGapDays)}</small></div>
                </div>
              </div>
              <div className="project-comparison">
                {[selectedOverlap.projectA, selectedOverlap.projectB].map((project) => (
                  <article className={`project-box ${project.utility === 'Georgia Power' ? 'georgia' : 'dominion'}`} key={project.id}>
                    <span className="project-utility"><i />{utilityStyles[project.utility].label}</span>
                    <span className="project-type">{project.projectType}</span>
                    <h3>{project.projectName}</h3>
                    <div className="project-facts">
                      <span>{project.region}</span>
                      <span>Planned in service <strong>{project.inServiceDate}</strong></span>
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
                  </div>
                  <span className="hypothesis-tag">Ideas to verify</span>
                </div>
                <div className="coordination-grid">
                  {coordinationOptions[selectedOverlap.id].map((option, index) => (
                    <article className="coordination-option" key={option.title}>
                      <span className="idea-number">0{index + 1}</span>
                      <div className="option-heading"><h4>{option.title}</h4><span>{option.confidence}</span></div>
                      <p>{option.descriptor}</p>
                      <small>{option.type}</small>
                    </article>
                  ))}
                </div>
                <p className="data-note">Shared crews, materials, access, outage windows, and savings are not confirmed. Validate with both utilities before acting.</p>
              </section>
            </div>
            <section className="assistant-panel" aria-labelledby="assistant-title">
              <div className="section-heading assistant-heading">
                <div>
                  <p className="label">04 · Ask about this data</p>
                  <h3 id="assistant-title">Gemini project guide</h3>
                </div>
                <button type="button" className="clear-chat-button" onClick={clearConversation} disabled={chatLoading}>New chat</button>
              </div>
              <p className="assistant-intro">
                Ask about the selected projects, map, distance, date gap, screening rank, or possible next checks. Match context is attached automatically.
              </p>
              <div className="context-chip"><i /> Context: {selectedOverlap.id} · {selectedOverlap.distanceMi.toFixed(2)} mi · rank {selectedOverlap.score}</div>
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
            <p><strong>Reported point distance:</strong> {selectedOverlap.distanceMi.toFixed(2)} miles</p>
            <p><strong>Planned in-service date gap:</strong> {selectedOverlap.timeGapDays.toLocaleString()} days</p>
            <p><strong>Screening rank:</strong> {selectedOverlap.score} / 100 (a ranking aid, not a probability or savings estimate)</p>
          </section>
          <section>
            <h2>Projects</h2>
            {[selectedOverlap.projectA, selectedOverlap.projectB].map((project) => (
              <article key={project.id}>
                <h3>{utilityStyles[project.utility].label} · {project.id}</h3>
                <p><strong>{project.projectName}</strong></p>
                <p>{project.projectType} · {project.region}</p>
                <p>Planned in service: {project.inServiceDate}</p>
                <p>Project screening point: {project.lat}, {project.lon}</p>
                <p>Named locations: {project.sites.map((site) => `${site.name} (${site.lat}, ${site.lon})`).join('; ')}</p>
                <p>Location source: {locationProvenance.sourceName}; {locationProvenance.verificationStatus}.</p>
              </article>
            ))}
          </section>
          <section>
            <h2>Potential coordination questions</h2>
            <ul>
              {coordinationOptions[selectedOverlap.id].map((option) => (
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
