import { Alert, ScopedCssBaseline } from '@mui/material'
import { TagChip } from '@src/content-scripts/triaging/components/TagChip'
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

async function addFeatures() {
  if (document.querySelector('.ReactTable .-loading')?.classList.contains('-active')) {
    return
  }

  const headRow = document.querySelector('.ReactTable .rt-table .rt-thead .rt-tr')
  if (!headRow) {
    return
  }
  enhanceHeaderRow(headRow)

  const rows = document.querySelectorAll('.ReactTable .rt-table .rt-tbody .rt-tr')
  if (!rows.length || !rows.values().some(row => !isRowEnhanced(row))) {
    return
  }

  await Promise.all(rows.values().map(row => processRow(row, headRow)))
}

async function processRow(row: Element, headRow: Element) {
  if (isRowEnhanced(row)) {
    return
  }

  const path = row.querySelector('a.bp3-link')?.getAttribute('href')
  const applicationId = getRowApplicationId(row)

  let actionsCell = row.querySelector(`.rt-td.ppe-actions`)
  if (!actionsCell) {
    actionsCell = document.createElement('div')
    actionsCell.classList.add('rt-td', 'ppe-actions')
    actionsCell.setAttribute('style', 'flex: 100 0 auto; width: 50px; max-width: 100px; text-align: center;')
    row.appendChild(actionsCell)
  }
  const actionsRoot = document.createElement('div')
  actionsRoot.setAttribute('id', `ppe-actions-${applicationId}`)
  actionsCell.innerHTML = ''
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

  createRoot(document.querySelector(`#ppe-actions-${applicationId}`)!)
    .render(
      <ErrorBoundary fallback={<Alert severity='error'>Something went wrong</Alert>}>
        <ScopedCssBaseline>
          <ApplicationDialog applicationId={applicationId} applicationUrl={applicationUrl} currentUserId={currentUserId}
                             rejectCallback={tagRowOnReject} />
        </ScopedCssBaseline>
      </ErrorBoundary>,
    )
}

function enhanceHeaderRow(headRow: Element): void {
  let actionsHeaderCell = headRow.querySelector('#ppe-actions-header')
  if (!actionsHeaderCell) {
    actionsHeaderCell = document.createElement('div')
    actionsHeaderCell.classList.add('rt-th')
    actionsHeaderCell.setAttribute('style', 'flex: 100 0 auto; width: 50px; max-width: 100px; text-align: center;')
    actionsHeaderCell.setAttribute('id', 'ppe-actions-header')
    actionsHeaderCell.textContent = 'Actions'
    headRow.appendChild(actionsHeaderCell)
  }
}

(() => {
  if (!window.location.origin.endsWith('pinpointhq.com')) {
    return
  }

  setInterval(checkLoadingState, 300)
})()

function isRowEnhanced(row: Element) {
  const applicationId = getRowApplicationId(row)
  if (!applicationId) {
    return false
  }
  const actionCell = row.querySelector(`#ppe-actions-${applicationId}`)
  return actionCell !== null
}

function getRowApplicationId(row: Element) {
  const path = row.querySelector('a.bp3-link')?.getAttribute('href')
  if (!path) {
    return
  }
  // @ts-ignore
  const { applicationId } = path.match(PATH_REGEX).groups
  return applicationId
}

const getNodeIndex = (element: Element) => [...(element.parentNode?.children || [])].indexOf(element)
