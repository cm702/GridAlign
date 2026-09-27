const MAX_REQUEST_BYTES = 24_000
const MAX_HISTORY_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 1_500
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 30
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite'
const requestBuckets = new Map()
let requestCount = 0

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload))
}

function isRateLimited(request) {
  const now = Date.now()
  const client = request.socket?.remoteAddress ?? 'unknown'
  let bucket = requestBuckets.get(client)

  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 }
    requestBuckets.set(client, bucket)
  }

  bucket.count += 1
  requestCount += 1

  if (requestCount % 256 === 0) {
    for (const [address, entry] of requestBuckets) {
      if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) {
        requestBuckets.delete(address)
      }
    }
  }

  return bucket.count > MAX_REQUESTS_PER_WINDOW
}

async function readJsonBody(request) {
  const chunks = []
  let bytes = 0

  for await (const chunk of request) {
    bytes += chunk.length

    if (bytes > MAX_REQUEST_BYTES) {
      const error = new Error('The chat request is too large.')
      error.statusCode = 413
      throw error
    }

    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('The chat request must contain valid JSON.')
    error.statusCode = 400
    throw error
  }
}

function validateMessages(messages) {
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_HISTORY_MESSAGES
  ) {
    return null
  }

  const sanitized = []

  for (const message of messages) {
    if (
      !message ||
      !['user', 'model'].includes(message.role) ||
      typeof message.text !== 'string' ||
      message.text.trim().length === 0 ||
      message.text.length > MAX_MESSAGE_LENGTH
    ) {
      return null
    }

    if (sanitized.length && sanitized.at(-1).role === message.role) {
      return null
    }

    sanitized.push({
      role: message.role,
      parts: [{ text: message.text.trim() }],
    })
  }

  if (
    sanitized[0].role !== 'user' ||
    sanitized[sanitized.length - 1].role !== 'user'
  ) {
    return null
  }

  return sanitized
}

function cleanProject(project) {
  if (!project || typeof project !== 'object') {
    return null
  }

  const fields = ['utility', 'projectName', 'region', 'projectType']
  const cleaned = {}

  for (const field of fields) {
    const value = project[field]

    if (
      typeof value !== 'string' ||
      value.trim().length === 0 ||
      value.length > 220
    ) {
      return null
    }

    cleaned[field] = value
  }

  const inServiceDate = project.inServiceDate

  if (
    inServiceDate !== null &&
    inServiceDate !== undefined &&
    typeof inServiceDate !== 'string'
  ) {
    return null
  }

  if (
    typeof inServiceDate === 'string' &&
    inServiceDate.length > 120
  ) {
    return null
  }

  const estimatedCostUsd = project.estimatedCostUsd

  if (
    estimatedCostUsd !== null &&
    estimatedCostUsd !== undefined &&
    (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0)
  ) {
    return null
  }

  return {
    ...cleaned,
    inServiceDate: inServiceDate || 'Not supplied',
    estimatedCostUsd: estimatedCostUsd ?? null,
    costSource:
      typeof project.costSource === 'string' &&
      project.costSource.length <= 220
        ? project.costSource
        : 'Not supplied',
  }
}

function cleanOpportunity(opportunity) {
  if (!opportunity || typeof opportunity !== 'object') {
    return null
  }

  const projectA = cleanProject(opportunity.projectA)
  const projectB = cleanProject(opportunity.projectB)
  const screeningScore = opportunity.screeningScore
  const scoreExplanation = opportunity.scoreExplanation
  const coordinationIdeas = opportunity.coordinationIdeas
  const timeGapDays = opportunity.timeGapDays

  if (
    screeningScore !== undefined &&
    (!Number.isInteger(screeningScore) ||
      screeningScore < 0 ||
      screeningScore > 100)
  ) {
    return null
  }

  if (
    scoreExplanation !== undefined &&
    (typeof scoreExplanation !== 'string' ||
      scoreExplanation.length > 600)
  ) {
    return null
  }

  if (
    coordinationIdeas !== undefined &&
    (!Array.isArray(coordinationIdeas) ||
      coordinationIdeas.length > 6 ||
      coordinationIdeas.some(
        (idea) =>
          !idea ||
          typeof idea.title !== 'string' ||
          idea.title.length > 220 ||
          typeof idea.type !== 'string' ||
          idea.type.length > 120 ||
          typeof idea.descriptor !== 'string' ||
          idea.descriptor.length > 800
      ))
  ) {
    return null
  }

  if (
    !projectA ||
    !projectB ||
    typeof opportunity.id !== 'string' ||
    !/^OVL_\d+$/.test(opportunity.id) ||
    typeof opportunity.distanceKm !== 'number' ||
    !Number.isFinite(opportunity.distanceKm) ||
    opportunity.distanceKm < 0 ||
    (timeGapDays !== null &&
      timeGapDays !== undefined &&
      (typeof timeGapDays !== 'number' ||
        !Number.isFinite(timeGapDays) ||
        timeGapDays < 0))
  ) {
    return null
  }

  return {
    id: opportunity.id,
    distanceKm: opportunity.distanceKm,
    timeGapDays: timeGapDays ?? null,
    ...(screeningScore === undefined ? {} : { screeningScore }),
    ...(scoreExplanation === undefined ? {} : { scoreExplanation }),
    ...(coordinationIdeas === undefined ? {} : { coordinationIdeas }),
    projectA,
    projectB,
  }
}

function makeSystemInstruction(opportunity) {
  return [
    'You are GridAlign’s utility transmission coordination assistant.',
    'Help users interpret the selected public-planning screening result and suggest practical next steps.',
    'Treat all shared crews, outage windows, procurement, staging, access, and right-of-way ideas as hypotheses to validate—not verified resources or promised savings.',
    'Do not invent project details, route geometry, costs, savings, approvals, or utility commitments.',
    'The supplied distance is in kilometers and is a screening estimate; proximity does not prove projects share a corridor.',
    'Answer questions about what the user sees in the map and dashboard using only the selected match context below. Explain that the screening score ranks proximity and date alignment; it is not a probability, savings estimate, or engineering assessment.',
    'Clearly distinguish source facts from recommendations, be concise, and recommend confirmation with both utilities and public filings.',
    `Selected opportunity context: ${JSON.stringify(opportunity)}`,
  ].join(' ')
}

export async function handleGeminiChat(
  request,
  response,
  dependencies = {}
) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')

    sendJson(response, 405, {
      error: 'Use POST to send a chat message.',
    })

    return
  }

  const env = dependencies.env ?? process.env
  const apiKey =
    dependencies.apiKey ??
    env.GEMINI_API_KEY ??
    env.gemini_api_key

  if (!apiKey) {
    sendJson(response, 503, {
      error:
        'Gemini is not configured. Set gemini_api_key in the server .env file.',
    })

    return
  }

  const primaryModel =
    dependencies.model ??
    env.gemini_model ??
    DEFAULT_GEMINI_MODEL

  const fallbackModel =
    dependencies.fallbackModel ??
    env.gemini_fallback_model ??
    primaryModel

  const models = [...new Set([primaryModel, fallbackModel])]

  if (
    models.some(
      (model) =>
        typeof model !== 'string' ||
        !/^[A-Za-z0-9._-]+$/.test(model)
    )
  ) {
    sendJson(response, 503, {
      error:
        'Gemini model configuration is invalid. Check gemini_model and gemini_fallback_model.',
    })

    return
  }

  if (isRateLimited(request)) {
    response.setHeader(
      'Retry-After',
      String(RATE_LIMIT_WINDOW_MS / 1_000)
    )

    sendJson(response, 429, {
      error:
        'Too many assistant requests from this connection. Wait a minute, then try again.',
    })

    return
  }

  let body

  try {
    body = await readJsonBody(request)
  } catch (error) {
    sendJson(response, error.statusCode ?? 400, {
      error: error.message,
    })

    return
  }

  const contents = validateMessages(body.messages)
  const opportunity = cleanOpportunity(body.opportunity)

  if (!contents || !opportunity) {
    sendJson(response, 400, {
      error:
        'Provide a valid conversation and a selected opportunity with both project details.',
    })

    return
  }

  const fetchImpl = dependencies.fetchImpl ?? fetch
  let lastError = ''

  for (const model of models) {
    const endpoint = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`
    )

    let providerResponse

    try {
      providerResponse = await fetchImpl(endpoint, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: makeSystemInstruction(opportunity),
              },
            ],
          },

          contents,

          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 700,
          },
        }),

        signal: AbortSignal.timeout(30_000),
      })
    } catch (error) {
      lastError =
        error.name === 'TimeoutError'
          ? 'Gemini took too long to respond.'
          : `Could not reach Gemini: ${error.message}`

      continue
    }

    if (!providerResponse.ok) {
      let errorMessage

      try {
        const errorData = await providerResponse.json()

        errorMessage =
          errorData?.error?.message ||
          JSON.stringify(errorData)
      } catch {
        try {
          errorMessage = await providerResponse.text()
        } catch {
          errorMessage = 'Unable to read Gemini error response.'
        }
      }

      lastError =
        `Gemini returned HTTP ${providerResponse.status}: ${errorMessage}`

      if (providerResponse.status === 401 || providerResponse.status === 403) {
        break
      }

      continue
    }

    let result

    try {
      result = await providerResponse.json()
    } catch {
      lastError =
        'Gemini returned a response that could not be read.'

      continue
    }

    const text = result.candidates?.[0]?.content?.parts
      ?.map((part) =>
        typeof part.text === 'string' ? part.text : ''
      )
      .join('')
      .trim()

    if (text) {
      sendJson(response, 200, {
        text,
      })

      return
    }

    lastError =
      'Gemini returned no text.'

    // Include the actual response if Gemini returned
    // something unexpected without usable text.
    if (result) {
      lastError += ` Response: ${JSON.stringify(result)}`
    }
  }

  // Return the ACTUAL error instead of hiding it behind
  // "Check the configured model names, API key, and quota."
  sendJson(response, 502, {
    error:
      lastError ||
      'Gemini could not complete the request.',
  })
}