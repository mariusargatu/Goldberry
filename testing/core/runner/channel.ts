import type { Page } from '@playwright/test'
import { CHANNEL_KEY, type ModelChannel } from '../protocol.ts'

const WRITE_ATTEMPTS = 3
const RETRY_WAIT_MS = 1_000

/**
 * Writes the channel into the page's sessionStorage, retrying while the page
 * is between documents; false when every attempt failed.
 */
export async function writeChannel(
  page: Pick<Page, 'evaluate' | 'waitForLoadState'>,
  channel: ModelChannel,
): Promise<boolean> {
  const json = JSON.stringify(channel)
  for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
    try {
      await page.evaluate(
        ([key, value]: [string, string]) => sessionStorage.setItem(key, value),
        [CHANNEL_KEY, json] as [string, string],
      )
      return true
    } catch {
      if (attempt < WRITE_ATTEMPTS)
        await page
          .waitForLoadState('domcontentloaded', { timeout: RETRY_WAIT_MS })
          .catch(() => undefined)
    }
  }
  return false
}
