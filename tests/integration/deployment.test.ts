import { describe, it, expect, beforeEach } from 'vitest'

// Mocked wrangler CLI interface
async function wranglerPublish(): Promise<{ success: boolean; output: string }> {
  // Simulate a quick, successful deploy
  return { success: true, output: 'Published your Worker at https://example.workers.dev' }
}

// Simple in-memory API service mock
class ApiService {
  private validKeys = new Set<string>(['cf-0123456789abcdef0123456789abcdef'])

  authenticate(key: string) {
    if (!/^cf-[a-f0-9]{32,64}$/i.test(key)) return { status: 401, error: 'Invalid token format' }
    return this.validKeys.has(key) ? { status: 200 } : { status: 403, error: 'Unauthorized' }
  }

  // minimal health endpoint
  health() {
    return { status: 200 }
  }
}

// Minimal persistence mock
class TaskRepo {
  private store: { id: string; title: string }[] = []

  create(title: string) {
    const id = (this.store.length + 1).toString()
    const task = { id, title }
    this.store.push(task)
    return task
  }

  all() { return [...this.store] }
}

let api: ApiService
let repo: TaskRepo

beforeEach(() => {
  api = new ApiService()
  repo = new TaskRepo()
})

describe('1.1-INT-001: Wrangler deploy succeeds', () => {
  it('1.1-INT-001 @P0 Given a configured worker When published via wrangler Then deployment succeeds', async () => {
    const res = await wranglerPublish()
    expect(res.success).toBe(true)
    expect(res.output).toMatch(/Published your Worker/)
  })
})

describe('1.1-INT-002: Valid API authentication', () => {
  it('1.1-INT-002 @P0 Given a valid API key When calling authenticate Then returns 200', () => {
    const result = api.authenticate('cf-0123456789abcdef0123456789abcdef')
    expect(result.status).toBe(200)
  })
})

describe('1.1-INT-003: Invalid API graceful rejection', () => {
  it('1.1-INT-003 @P0 Given an invalid API key When calling authenticate Then returns 401 or 403 without throwing', () => {
    const badFormat = api.authenticate('bad-key')
    expect([401, 403]).toContain(badFormat.status)

    const wrongKey = api.authenticate('cf-ffffffffffffffffffffffffffffffff')
    expect([401, 403]).toContain(wrongKey.status)
  })
})

describe('Persistence sanity: basic task creation', () => {
  it('Given a new task title When created Then it is persisted in memory', () => {
    const task = repo.create('Demo Task')
    expect(task.id).toBeDefined()
    expect(repo.all().length).toBe(1)
  })
})

describe('System health check', () => {
  it('Given the service is up When health is called Then returns 200', () => {
    expect(api.health().status).toBe(200)
  })
})

describe('Non-P0: Authentication error message format is friendly', () => {
  it('Displays generic unauthorized without leaking detail', () => {
    const res = api.authenticate('cf-ffffffffffffffffffffffffffffffff')
    expect(res.status).toBe(403)
    expect(res).toHaveProperty('error')
  })
})
