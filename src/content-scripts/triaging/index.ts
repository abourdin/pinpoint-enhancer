import '@common/jquery/jquery-3.7.1.min.js'
import '@common/jquery/jquery-ui-1.14.1/jquery-ui.min.js'
import '@common/jquery/jquery-ui-1.14.1/jquery-ui.min.css'
import '@common/jquery/jquery-ui-1.14.1/jquery-ui.structure.min.css'
import '@common/jquery/jquery-ui-1.14.1/jquery-ui.theme.min.css'

import {
  appendShortcuts,
  bindShortcutToDialog,
  renderApplicationDialog,
  renderCommentsDialog,
  renderComments,
  renderNewCommentSection,
} from './components'
import { cacheUsername, cacheUsernamesFromResponse } from './utils'
import { getApplication, getComments, extractApplicationData } from './API'
import './index.css'

const BASE_URL = window.location.origin
const PATH_REGEX = /\/admin\/jobs\/(?<postingId>\d+)\/applications\/(?<applicationId>\d+)/m

let currentUserId: string
let processing = false

const dataCache = {}
const actionsCache = {}

async function checkLoadingState() {
  if (!currentUserId && window?.intercomSettings) {
    currentUserId = window.intercomSettings.user_id
    cacheUsername(currentUserId, window.intercomSettings.name)
  }
  if (processing) {
    return
  }
  processing = true
  await addFeatures()
  processing = false
}

async function triggerReload() {
  await sleep(100)
  while ($('.ReactTable .-loading').hasClass('-active')) {
    await sleep(100)
  }
  $('.OL-row-enhanced').removeClass('OL-row-enhanced')
  $('.row-commented').removeClass('row-commented')
}

async function addFeatures() {
  if ($('.ReactTable .-loading').hasClass('-active')) {
    return
  }

  const rows = $('.ReactTable .rt-table .rt-tbody .rt-tr') || []
  if (!rows.length) {
    return
  }

  $('button[title="Previous"]').on('click', triggerReload)
  $('button[title="Next"]').on('click', triggerReload)
  $('.rt-th.-checkbox').on('click', triggerReload)
  $('.rt-th.-cursor-pointer').on('click', triggerReload)

  const headRow = $('.ReactTable .rt-table .rt-thead .rt-tr')
  if (!headRow.hasClass('OL-header-enhanced')) {
    headRow.addClass('OL-header-enhanced')
    headRow.append('<div class="rt-th" style="flex: 100 0 auto; width: 50px; max-width: 100px;">Actions</div>')
  }

  await Promise.all(rows.toArray().map(processRow))
}

async function processRow(row) {
  if ($(row).hasClass('OL-row-enhanced')) {
    return
  }
  else {
    $(row).addClass('OL-row-enhanced')
  }

  let actionsCell = $(row).find('.OL-actions')
  if (actionsCell.length) {
    actionsCell.html('Loading...')
  }
  else {
    actionsCell = $('<div class="rt-td OL-actions" style="flex: 100 0 auto; width: 50px; max-width: 100px;">Loading...</div>')
    $(row).append(actionsCell)
  }

  const path = $(row).find('a.bp3-link').attr('href')
  if (!path) {
    return
  }
  const { postingId, applicationId } = path.match(PATH_REGEX).groups

  const cachedActions = actionsCache[applicationId]
  if (cachedActions) {
    actionsCell.html('<div></div>')
    actionsCell.append(cachedActions.shortcuts.application)
    actionsCell.append(cachedActions.shortcuts.comments)
    bindShortcutToDialog(cachedActions.shortcuts.application, cachedActions.applicationDialog)
    bindShortcutToDialog(cachedActions.shortcuts.comments, cachedActions.commentsDialog)

    if (cachedActions.commented && !$(row).hasClass('.row-commented')) {
      $(row).addClass('row-commented')
    }
    else if (!cachedActions.commented && $(row).hasClass('.row-commented')) {
      $(row).removeClass('row-commented')
    }
  }
  else {
    const applicationUrl = `${BASE_URL}${path}`

    let cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse
    if (dataCache[applicationId]) {
      ;({ cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse } = dataCache[applicationId] || {})
    }
    else {
      const applicationResponse = await getApplication(applicationId)
      cacheUsernamesFromResponse(applicationResponse)
      ;({ cvUrl, name, summary, answers, scoreChanges, tags } = extractApplicationData(applicationResponse))
      dataCache[applicationId] = { cvUrl, name, summary, answers, scoreChanges, tags }
    }

    const tagsColIndex = $('.ReactTable .rt-table .rt-thead .rt-tr .rt-th:contains("Tags")').index()
    const tagsCell = $(row).find(`:nth-child(${tagsColIndex + 1})`)

    const { commentsDialog, loader } = renderCommentsDialog({ applicationId, applicationUrl, tags, tagsCell })
    const applicationDialog = renderApplicationDialog({ name, summary, answers, applicationUrl, cvUrl, commentsDialog })
    const shortcuts = appendShortcuts(actionsCell, { applicationId, applicationDialog, commentsDialog })

    if (!commentsResponse) {
      commentsResponse = await getComments(applicationId)
      cacheUsernamesFromResponse(commentsResponse)
      dataCache[applicationId].commentsResponse = commentsResponse
    }

    loader.remove()
    const { commentsSection, commented } = renderComments(commentsResponse, scoreChanges, currentUserId)
    commentsSection.appendTo(commentsDialog)
    if (commented) {
      $(row).addClass('row-commented')
    }
    actionsCache[applicationId] = {
      shortcuts,
      applicationDialog,
      commentsDialog,
      commented,
    }

    renderNewCommentSection(commentsDialog, { applicationId, commentsSection, row })
  }
}

(() => {
  if (!window.location.origin.endsWith('pinpointhq.com')) {
    return
  }

  $(document).ready(() => {
    setInterval(function() {
      checkLoadingState()
    }, 300)
  })

  ;(function(history) {
    const pushState = history.pushState
    history.pushState = function(state) {
      if (typeof history.onpushstate == 'function') {
        history.onpushstate({ state: state })
      }
      Object.keys(actionsCache).forEach(key => delete actionsCache[key])
      return pushState.apply(history, arguments)
    }
  })(window.history)
})()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
