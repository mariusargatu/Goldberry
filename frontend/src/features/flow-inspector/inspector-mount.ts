export const INSPECTOR_MOUNT_KEY = 'goldberry.flow-inspector.mount'

function readMounted(): boolean {
  try {
    return localStorage.getItem(INSPECTOR_MOUNT_KEY) !== 'off'
  } catch {
    return true
  }
}

export const inspectorMounted = readMounted()
