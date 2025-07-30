const browser = require('webextension-polyfill')

browser.tabs.onActivated.addListener(updateIcon)

async function updateIcon() {
  try {
    const tab = await getCurrentTab()
    if (!tab.url) {
      return
    }
    const hostname = getHostname(tab.url)
    if (hostname.endsWith('pinpointhq.com')) {
      browser.action.setIcon({ path: '../public/icons/favicon-128.png' })
    }
    else {
      browser.action.setIcon({ path: '../public/icons/favicon-disabled-128.png' })
    }
  }
  catch (error) {
    console.error('Failed to update icon', error)
  }
}

async function getCurrentTab() {
  const queryOptions = { active: true, lastFocusedWindow: true }
  const [tab] = await browser.tabs.query(queryOptions)
  return tab
}

const getHostname = (url: string) => {
  return new URL(url).hostname
}
