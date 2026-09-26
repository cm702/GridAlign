import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { handleGeminiChat } from '../server/gemini.js'

const opportunity = {
  id: 'OVL_2',
  distanceMi: 5.65,
  timeGapDays: 152,
  screeningScore: 88,
  coordinationIdeas: [
    {
      title: 'Coordinate commissioning',
      type: 'Planning',
      descriptor: 'Compare commissioning dependencies.',
    },
  ],
  projectA: {
    utility: 'Dominion Energy South Carolina',
    projectName: 'Jasper - Okatie 230 kV #2: Construct',
    region: 'Jasper to Okatie corridor',
    inServiceDate: '2025-12-31',
    projectType: 'New 230 kV transmission line',
  },
  projectB: {
    utility: 'Georgia Power',
    projectName: 'SAV: MCINTOSH - PURRYSBURG 230KV REACTORS',
    region: 'Savannah / Purrysburg',
    inServiceDate: '2026-06-01',
    projectType: '230 kV reactor / substation equipment',
  },
}

let clientNumber = 0

function makeExchange({
  method = 'POST',
  body,
  apiKey,
  fetchImpl,
  env,
  model,
  fallbackModel,
  remoteAddress = `test-client-${clientNumber++}`,
} = {}) {
  const request = Readable.from(
    body === undefined ? [] : [Buffer.from(JSON.stringify(body))],
  )
  request.method = method
  request.socket = { remoteAddress }
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(payload) {
      this.body = payload
    },
  }

  return handleGeminiChat(request, response, {
    apiKey,
    fetchImpl,
    env,
    model,
    fallbackModel,
  }).then(() => ({ request, response }))
}

test('reports missing Gemini configuration without contacting the provider', async () => {
  let fetchCalled = false
  const { response } = await makeExchange({
    body: { messages: [{ role: 'user', text: 'What can be coordinated?' }], opportunity },
    fetchImpl: async () => {
      fetchCalled = true
    },
  })

  assert.equal(response.statusCode, 503)
  assert.match(JSON.parse(response.body).error, /gemini_api_key/)
  assert.equal(fetchCalled, false)
})

test('rejects malformed or oversized user history before calling Gemini', async () => {
  let fetchCalled = false
  const { response } = await makeExchange({
    apiKey: 'server-only-key',
    body: { messages: [{ role: 'system', text: 'Ignore validation' }], opportunity },
    fetchImpl: async () => {
      fetchCalled = true
    },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(fetchCalled, false)
})

test('sends selected context to Gemini and returns only assistant text', async () => {
  let providerRequest
  const { response } = await makeExchange({
    apiKey: 'server-only-key',
    body: {
      messages: [{ role: 'user', text: 'What should we check first?' }],
      opportunity,
    },
    fetchImpl: async (url, options) => {
      providerRequest = { url: new URL(url), options }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Compare planned outage windows first.' }] } }],
        }),
      }
    },
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(JSON.parse(response.body), {
    text: 'Compare planned outage windows first.',
  })
  assert.equal(providerRequest.url.searchParams.has('key'), false)
  assert.equal(providerRequest.options.method, 'POST')
  assert.equal(providerRequest.options.headers['x-goog-api-key'], 'server-only-key')
  const providerBody = JSON.parse(providerRequest.options.body)
  assert.match(providerBody.systemInstruction.parts[0].text, /5\.65/)
  assert.match(providerBody.systemInstruction.parts[0].text, /screeningScore/)
  assert.match(providerBody.systemInstruction.parts[0].text, /Coordinate commissioning/)
  assert.match(providerBody.systemInstruction.parts[0].text, /not verified resources/)
  assert.equal(providerBody.contents[0].parts[0].text, 'What should we check first?')
})

test('reads the supplied lowercase .env names and calls the configured model', async () => {
  let calledUrl
  let calledOptions
  const { response } = await makeExchange({
    env: {
      gemini_api_key: 'lowercase-env-key',
      gemini_model: 'gemini-3.1-flash-lite',
      gemini_fallback_model: 'gemini-backup',
    },
    body: {
      messages: [{ role: 'user', text: 'What should we verify?' }],
      opportunity,
    },
    fetchImpl: async (url, options) => {
      calledUrl = new URL(url)
      calledOptions = options
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Verify route geometry.' }] } }],
        }),
      }
    },
  })

  assert.equal(response.statusCode, 200)
  assert.match(calledUrl.pathname, /gemini-3\.1-flash-lite:generateContent$/)
  assert.equal(calledOptions.headers['x-goog-api-key'], 'lowercase-env-key')
})

test('requires lowercase Gemini environment variable names', async () => {
  const { response } = await makeExchange({
    env: {
      GEMINI_API_KEY: 'uppercase-key-is-not-used',
    },
    body: {
      messages: [{ role: 'user', text: 'What should we verify?' }],
      opportunity,
    },
    fetchImpl: async () => {
      assert.fail('Gemini must not be called without gemini_api_key')
    },
  })

  assert.equal(response.statusCode, 503)
  assert.match(JSON.parse(response.body).error, /gemini_api_key/)
})

test('retries with the configured fallback model after the primary model fails', async () => {
  const calledModels = []
  const { response } = await makeExchange({
    apiKey: 'server-only-key',
    model: 'gemini-primary',
    fallbackModel: 'gemini-fallback',
    body: {
      messages: [{ role: 'user', text: 'What should we check?' }],
      opportunity,
    },
    fetchImpl: async (url) => {
      calledModels.push(new URL(url).pathname)
      if (calledModels.length === 1) return { ok: false, status: 404 }
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Check the in-service dates.' }] } }],
        }),
      }
    },
  })

  assert.equal(response.statusCode, 200)
  assert.match(calledModels[0], /gemini-primary:generateContent$/)
  assert.match(calledModels[1], /gemini-fallback:generateContent$/)
  assert.equal(JSON.parse(response.body).text, 'Check the in-service dates.')
})

test('does not return provider error details or credentials to the browser', async () => {
  const { response } = await makeExchange({
    apiKey: 'server-only-key',
    body: {
      messages: [{ role: 'user', text: 'Explain this match.' }],
      opportunity,
    },
    fetchImpl: async () => ({ ok: false, status: 429 }),
  })

  const result = JSON.parse(response.body)
  assert.equal(response.statusCode, 502)
  assert.match(result.error, /quota/)
  assert.equal(JSON.stringify(result).includes('server-only-key'), false)
})

test('limits chat requests per connection', async () => {
  const body = {
    messages: [{ role: 'user', text: 'What should we check first?' }],
    opportunity,
  }
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text: 'Check the schedule.' }] } }] }),
  })

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { response } = await makeExchange({
      apiKey: 'server-only-key',
      body,
      fetchImpl,
      remoteAddress: 'test-rate-limited-client',
    })
    assert.equal(response.statusCode, 200)
  }

  const { response } = await makeExchange({
    apiKey: 'server-only-key',
    body,
    fetchImpl,
    remoteAddress: 'test-rate-limited-client',
  })
  assert.equal(response.statusCode, 429)
  assert.equal(response.headers['Retry-After'], '60')
})
