import $ from 'jquery'
import React from 'react'
import { ApplicationDialog } from '@src/content-scripts/triaging/components/ApplicationDialog'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { cacheUsername } from './utils'
import './index.css'

const BASE_URL = window.location.origin
const PATH_REGEX = /\/admin\/jobs\/(?<postingId>\d+)\/applications\/(?<applicationId>\d+)/m

let currentUserId: string
let processing = false

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

  const path = $(row).find('a.bp3-link').attr('href')
  if (!path) {
    return
  }
  // @ts-ignore
  const { postingId, applicationId } = path.match(PATH_REGEX).groups

  let actionsCell = $(row).find(`.rt-td.OL-actions`)
  if (!actionsCell.length) {
    actionsCell = $(`<div class='rt-td OL-actions' style='flex: 100 0 auto; width: 50px; max-width: 100px;'></div>`)
    $(row).append(actionsCell)
  }
  actionsCell.html(`<div id='actions-${applicationId}' />`)

  const applicationUrl = `${BASE_URL}${path}`

  const tagsColIndex = $('.ReactTable .rt-table .rt-thead .rt-tr .rt-th:contains("Tags")').index()
  const tagsCell = $(row).find(`:nth-child(${tagsColIndex + 1})`)

  createRoot(document.querySelector(`#actions-${applicationId}`)!)
    .render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ApplicationDialog applicationId={applicationId} applicationUrl={applicationUrl} currentUserId={currentUserId} />
      </ErrorBoundary>,
    )
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
})()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
