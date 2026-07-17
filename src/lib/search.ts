export const OPEN_SEARCH_EVENT = 'open-search'

export function requestSearchOpen() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))
}
