export function focusAuthTrigger(): void {
  const header = document.getElementById('header-login')
  if (header instanceof HTMLElement && header.getClientRects().length > 0) {
    header.focus()
    return
  }
  const tab = document.getElementById('tab-user')
  if (tab instanceof HTMLElement) {
    tab.focus()
  }
}
