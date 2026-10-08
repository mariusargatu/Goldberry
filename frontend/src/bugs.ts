// Teaching bugs: three planted faults, all off by default, that the testing
// tool in ../testing switches on to show what each of its checks catches.
// The shop behaves exactly as documented unless one is named.
//
// Switch them on per tab, before the app loads:
// - the testing tool sets `sessionStorage['goldberry.bugs']` (GOLDBERRY_BUGS=a,b);
// - by hand, open any page with `?bug=a,b`; the tab keeps them across reloads.
//
// edition-nan         A piece's page says "Edition of NaN".
// reload-forgets-bag  A reload empties the bag.
// bag-count-lines     The header counts bag lines, not the pieces in them.

const BUGS = ['edition-nan', 'reload-forgets-bag', 'bag-count-lines'] as const

export type Bug = (typeof BUGS)[number]

const STORAGE_KEY = 'goldberry.bugs'

function readSwitches(): ReadonlySet<Bug> {
  try {
    const requested = new URLSearchParams(window.location.search).get('bug')
    if (requested !== null) sessionStorage.setItem(STORAGE_KEY, requested)
    const named = (sessionStorage.getItem(STORAGE_KEY) ?? '').split(',')
    return new Set(BUGS.filter((bug) => named.includes(bug)))
  } catch {
    // Storage unavailable: every bug stays off.
    return new Set()
  }
}

const switchedOn = readSwitches()

export const hasBug = (bug: Bug): boolean => switchedOn.has(bug)
