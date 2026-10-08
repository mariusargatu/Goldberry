import { test as base, type Page } from '@playwright/test'

export const DEMO = process.env.GOLDBERRY_INSPECTOR === 'on'

const BUGS = process.env.GOLDBERRY_BUGS ?? ''

const STORAGE_KEYS = {
  inspectorMount: 'goldberry.flow-inspector.mount',
  inspectorHeight: 'goldberry.flow-inspector.height',
  bugs: 'goldberry.bugs',
} as const

const openInspectorOnTheModel = (page: Page) =>
  page.addInitScript((key) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, 'model')
  }, STORAGE_KEYS.inspectorHeight)

const leaveInspectorOut = (page: Page) =>
  page.addInitScript(
    (key) => localStorage.setItem(key, 'off'),
    STORAGE_KEYS.inspectorMount,
  )

const switchOnBugs = (page: Page, bugs: string) =>
  page.addInitScript(([key, names]) => sessionStorage.setItem(key, names), [
    STORAGE_KEYS.bugs,
    bugs,
  ] as const)

export interface GoldberrySession {
  open(): Promise<void>
}

export const test = base.extend<{ goldberry: GoldberrySession }>({
  goldberry: async ({ page }, use) => {
    await use({
      async open() {
        await (DEMO ? openInspectorOnTheModel(page) : leaveInspectorOut(page))
        if (BUGS !== '') await switchOnBugs(page, BUGS)
        await page.goto('/')
      },
    })
  },
})

export { expect } from '@playwright/test'
