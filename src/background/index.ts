chrome.tabs.onActivated.addListener(updateIcon)

async function updateIcon() {
  try {
    const tab = await getCurrentTab()
    if (!tab.url) {
      return
    }
    const hostname = getHostname(tab.url)
    if (hostname.endsWith('pinpointhq.com')) {
      chrome.action.setIcon({ path: '../public/icons/favicon-128.png' })
    }
    else {
      chrome.action.setIcon({ path: '../public/icons/favicon-disabled-128.png' })
    }
  }
  catch (error) {
    console.error('Failed to update icon', error)
  }
}

async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true }
  const [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

const getHostname = (url: string) => {
  return new URL(url).hostname
}
