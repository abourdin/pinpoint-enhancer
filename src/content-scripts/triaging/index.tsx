import { Alert, ScopedCssBaseline } from '@mui/material'
import { TagChip } from '@src/content-scripts/triaging/components/Tag'
import React from 'react'
import { Tag } from './types'
import { ApplicationDialog } from './components/ApplicationDialog'
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
    currentUserId = window.intercomSettings.user_id?.toString()
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
  await sleep(200)
  while (document.querySelector('.ReactTable .-loading')?.classList.contains('-active')) {
    await sleep(200)
  }
  document.querySelectorAll('.OL-row-enhanced').forEach(element => element.classList.remove('OL-row-enhanced'))
  document.querySelectorAll('.row-commented').forEach(element => element.classList.remove('row-commented'))
}

async function addFeatures() {
  if (document.querySelector('.ReactTable .-loading')?.classList.contains('-active')) {
    return
  }

  const rows = document.querySelectorAll('.ReactTable .rt-table .rt-tbody .rt-tr')
  if (!rows.length || !rows.values().some(row => !row.classList.contains('OL-row-enhanced'))) {
    return
  }

  const headRow = document.querySelector('.ReactTable .rt-table .rt-thead .rt-tr')
  if (!headRow) {
    return
  }

  let actionsHeaderCell = headRow.querySelector('#actions-header')
  if (!actionsHeaderCell) {
    actionsHeaderCell = document.createElement('div')
    actionsHeaderCell.classList.add('rt-th')
    actionsHeaderCell.setAttribute('style', 'flex: 100 0 auto; width: 50px; max-width: 100px; text-align: center;')
    actionsHeaderCell.setAttribute('id', 'actions-header')
    actionsHeaderCell.textContent = 'Actions'
    headRow.appendChild(actionsHeaderCell)

    document.querySelectorAll('.rt-th.-checkbox').forEach(item => item.addEventListener('click', triggerReload))
    document.querySelectorAll('.rt-th.-cursor-pointer').forEach(item => item.addEventListener('click', triggerReload))
  }

  document.querySelector('button[title="Previous"]')?.addEventListener('click', triggerReload)
  document.querySelector('button[title="Next"]')?.addEventListener('click', triggerReload)

  await Promise.all(rows.values().map(row => processRow(row, headRow)))
}

async function processRow(row: Element, headRow: Element) {
  if (row.classList.contains('OL-row-enhanced')) {
    return
  }
  else {
    row.classList.add('OL-row-enhanced')
  }

  const path = row.querySelector('a.bp3-link')?.getAttribute('href')
  if (!path) {
    return
  }
  // @ts-ignore
  const { postingId, applicationId } = path.match(PATH_REGEX).groups

  let actionsCell = row.querySelector(`.rt-td.OL-actions`)
  if (!actionsCell) {
    actionsCell = document.createElement('div')
    actionsCell.classList.add('rt-td', 'OL-actions')
    actionsCell.setAttribute('style', 'flex: 100 0 auto; width: 50px; max-width: 100px; text-align: center;')
    row.appendChild(actionsCell)
  }
  const actionsRoot = document.createElement('div')
  actionsRoot.setAttribute('id', `actions-${applicationId}`)
  actionsCell.appendChild(actionsRoot)

  const applicationUrl = `${BASE_URL}${path}`

  const tagRowOnReject = (tag: Tag) => {
    const tagHeaderCell = headRow.querySelectorAll('.rt-th')?.values().find(cell => cell.firstChild?.textContent?.includes('Tags'))
    if (!tagHeaderCell) {
      return
    }
    const columnIndex = getNodeIndex(tagHeaderCell)
    const tagsCell = row.children[columnIndex]
    const tagRoot = document.createElement('div')
    tagsCell?.appendChild(tagRoot)
    createRoot(tagRoot).render(<TagChip tag={tag} />)
  }

  createRoot(document.querySelector(`#actions-${applicationId}`)!)
    .render(
      <ErrorBoundary fallback={<Alert severity='error'>Something went wrong</Alert>}>
        <ScopedCssBaseline>
          <ApplicationDialog applicationId={applicationId} applicationUrl={applicationUrl} currentUserId={currentUserId}
                             rejectCallback={tagRowOnReject} />
        </ScopedCssBaseline>
      </ErrorBoundary>,
    )
}

(() => {
  if (!window.location.origin.endsWith('pinpointhq.com')) {
    return
  }

  setInterval(checkLoadingState, 300)
})()

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const getNodeIndex = (element: Element) => [...(element.parentNode?.children || [])].indexOf(element)
