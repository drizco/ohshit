import { test, expect, type BrowserContext, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to home and create a new game with the given player name.
 *  Returns the gameId visible on screen after creation. */
async function createGame(page: Page, playerName: string, numCards = 1): Promise<string> {
  await page.goto('/')

  // Reduce number of cards from default (5) to the desired count
  const decBtn = page.getByRole('button', { name: '-' })
  for (let i = 0; i < 5 - numCards; i++) {
    await decBtn.click()
  }

  await page.locator('#name').fill(playerName)
  await page.getByRole('button', { name: 'NEW GAME' }).click()

  await expect(page.getByText('Game Code')).toBeVisible()
  const gameId = (await page.locator('h2.red-text').textContent())?.trim()
  if (!gameId) throw new Error('Game ID not found after creating game')
  return gameId
}

/** Navigate to home, switch to join tab, enter the game code, then navigate
 *  to the game page. The player still needs to fill in JoinGameForm on the
 *  game page itself. */
async function goToJoinPage(page: Page, gameId: string): Promise<void> {
  await page.goto('/')
  await page.getByText('join an existing game').click()
  await page.locator('#game-code').fill(gameId)
  await page.getByRole('button', { name: 'JOIN GAME' }).click()
  await expect(page).toHaveURL(new RegExp(`/game/${gameId}`))
}

/** Fill in the JoinGameForm that appears on the game page for players who
 *  don't yet have a playerId in localStorage. */
async function joinGameOnPage(page: Page, playerName: string): Promise<void> {
  await expect(page.locator('#name')).toBeVisible({ timeout: 10_000 })
  await page.locator('#name').fill(playerName)
  await page.getByRole('button', { name: 'JOIN' }).click()
  // JoinGameForm unmounts once addPlayer succeeds
  await expect(page.locator('#name')).toBeHidden({ timeout: 10_000 })
}

/**
 * Play through one complete round for all players.
 * numTricks = number of cards each player holds at the start of the round,
 * which equals the number of tricks that will be played.
 */
async function playRound(pages: Page[], numTricks: number): Promise<void> {
  // Bidding: modals appear one at a time; wait concurrently across all pages
  await Promise.all(
    pages.map((p) =>
      p
        .getByRole('button', { name: 'BID' })
        .waitFor({ timeout: 20000 })
        .then(async () => {
          const bidNum = Math.floor(Math.random() * (numTricks + 1))
          for (let i = 0; i < bidNum; i++) {
            await p.getByRole('button', { name: '+' }).click()
          }
          await p.getByRole('button', { name: 'BID' }).click()
        })
    )
  )

  // Wait until every bid modal is dismissed before touching cards
  await Promise.all(
    pages.map((p) =>
      p.getByRole('button', { name: 'BID' }).waitFor({ state: 'hidden', timeout: 10000 })
    )
  )
  // Pause so the video shows the hand before play begins

  // Play each trick
  for (let trick = 0; trick < numTricks; trick++) {
    // Each player waits for the "your-turn" marker then tries cards one by one
    // until the server accepts one.  Acceptance is detected by the indicator
    // disappearing — it detaches whenever currentPlayerIndex advances OR the
    // round ends (status → 'bid'), so it's reliable even when new-round cards
    // arrive immediately after the last card of the round is played.
    await Promise.all(
      pages.map(async (p) => {
        const indicator = p.locator('[data-testid="your-turn"]')
        await indicator.waitFor({ state: 'attached', timeout: 30_000 })

        await expect(async () => {
          const cards = p.locator('.playing-card')
          const count = await cards.count()
          for (let i = 0; i < count; i++) {
            const card = cards.nth(i)
            const cardId = await card.getAttribute('data-card-id')
            await card.click()
            // A card is accepted when it disappears from the hand
            const accepted = await p
              .locator(`[data-card-id="${cardId}"]`)
              .waitFor({ state: 'detached', timeout: 1_500 })
              .then(() => true)
              .catch(() => false)
            if (accepted) return
          }
          throw new Error('no card accepted')
        }).toPass({ timeout: 30_000 })
      })
    )
  }
}

// ---------------------------------------------------------------------------
// Tests: Home Page
// ---------------------------------------------------------------------------

test.describe('Home Page', () => {
  test('shows create-game form by default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('create a new game')).toBeVisible()
    await expect(page.getByText('join an existing game')).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.getByRole('button', { name: 'NEW GAME' })).toBeVisible()
    // NEW GAME button is disabled until a player name is entered
    await expect(page.getByRole('button', { name: 'NEW GAME' })).toBeDisabled()
  })

  test('enables NEW GAME button once a player name is typed', async ({ page }) => {
    await page.goto('/')
    await page.locator('#name').fill('Alice')
    await expect(page.getByRole('button', { name: 'NEW GAME' })).toBeEnabled()
  })

  test('can switch to the join-game form', async ({ page }) => {
    await page.goto('/')
    await page.getByText('join an existing game').click()
    await expect(page.locator('#game-code')).toBeVisible()
    await expect(page.getByRole('button', { name: 'JOIN GAME' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tests: Game Creation
// ---------------------------------------------------------------------------

test.describe('Game Creation', () => {
  test('creates a game and shows the game code', async ({ page }) => {
    await page.goto('/')
    await page.locator('#name').fill('TestPlayer')
    await page.getByRole('button', { name: 'NEW GAME' }).click()

    await expect(page.getByText('Game Code')).toBeVisible()
    await expect(page.getByRole('link', { name: 'ENTER GAME' })).toBeVisible()

    // Game ID should be a non-empty string
    const gameId = (await page.locator('h2.red-text').textContent())?.trim()
    expect(gameId).toBeTruthy()
    expect(gameId!.length).toBeGreaterThan(0)
  })

  test('navigates to the game page after entering the game', async ({ page }) => {
    const gameId = await createGame(page, 'TestPlayer')
    await page.getByRole('link', { name: 'ENTER GAME' }).click()

    await expect(page).toHaveURL(new RegExp(`/game/${gameId}`))
    // Host sees the START GAME button in pending state
    await expect(page.getByRole('button', { name: 'START GAME' })).toBeVisible({
      timeout: 10_000,
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: Multiplayer Game
// ---------------------------------------------------------------------------

test.describe('Multiplayer Game', () => {
  let ctx1: BrowserContext
  let ctx2: BrowserContext
  let ctx3: BrowserContext
  let page1: Page
  let page2: Page
  let page3: Page

  test.beforeEach(async ({ browser }) => {
    // eslint-disable-next-line no-extra-semi
    ;[ctx1, ctx2, ctx3] = await Promise.all([
      browser.newContext({ recordVideo: { dir: 'test-results/' } }),
      browser.newContext({ recordVideo: { dir: 'test-results/' } }),
      browser.newContext({ recordVideo: { dir: 'test-results/' } }),
    ])
    ;[page1, page2, page3] = await Promise.all([
      ctx1.newPage(),
      ctx2.newPage(),
      ctx3.newPage(),
    ])
  })

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    await Promise.all([ctx1.close(), ctx2.close(), ctx3.close()])

    const pages = [page1, page2, page3]
    for (const [i, page] of pages.entries()) {
      const video = page.video()
      if (!video) continue
      const path = await video.path()
      await testInfo.attach(`video-player-${i + 1}`, {
        path,
        contentType: 'video/webm',
      })
    }
  })

  test('three players can complete a 3-round game', async () => {
    const numCards = 3
    const numRounds = numCards * 2 - 1
    test.setTimeout(180_000)

    const pages = [page1, page2, page3]

    // ── Setup ──────────────────────────────────────────────────────────────
    const gameId = await createGame(page1, 'Alice', numCards)
    await page1.getByRole('link', { name: 'ENTER GAME' }).click()
    await expect(page1).toHaveURL(new RegExp(`/game/${gameId}`))
    await expect(page1.getByRole('button', { name: 'START GAME' })).toBeVisible({
      timeout: 10_000,
    })

    await goToJoinPage(page2, gameId)
    await joinGameOnPage(page2, 'Bob')

    await goToJoinPage(page3, gameId)
    await joinGameOnPage(page3, 'Charlie')

    // ── Start ──────────────────────────────────────────────────────────────
    await page1.getByRole('button', { name: 'START GAME' }).click()

    let roundCards = numCards
    let decrement = true
    for (let round = 0; round < numRounds; round++) {
      await playRound(pages, roundCards)
      if (roundCards === 1) {
        decrement = false
      }
      if (decrement) {
        roundCards--
      } else {
        roundCards++
      }
    }

    // ── Game over ──────────────────────────────────────────────────────────
    await Promise.all(
      pages.map((p) => expect(p.getByText('game over')).toBeVisible({ timeout: 30_000 }))
    )
    await Promise.all(
      pages.map((p) => expect(p.getByRole('button', { name: 'HOME' })).toBeVisible())
    )
  })
})
