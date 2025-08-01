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

async function checkLoadingState(tableBody: Element) {
  if (processing) {
    return
  }
  processing = true
  if (!currentUserId && window?.intercomSettings) {
    currentUserId = window.intercomSettings.user_id?.toString()
    cacheUsername(currentUserId, window.intercomSettings.name)
  }

  const observer = new MutationObserver(function(mutationsList: any) {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const row = node.closest('.rt-tr')
            if (row) {
              processRow(row)
            }
          }
        }
      }
    }
  })
  observer.observe(tableBody, { childList: true, subtree: true })

  prepareTableHeader()
  processing = false
}

function prepareTableHeader() {
  const headRow = document.querySelector('.ReactTable .rt-table .rt-thead .rt-tr')
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

async function processRow(row: Element) {
  const applicationLink = row.querySelector('a.bp3-link')
  if (!applicationLink) {
    return
  }

  if (row.classList.contains('ppe-row-enhanced')) {
    return
  }
  else {
    row.classList.add('ppe-row-enhanced')

    if (applicationLink) {
      const observer = new MutationObserver(function(mutationsList: any) {
        for (const mutation of mutationsList) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
            row.classList.remove('ppe-row-enhanced')
            observer.disconnect()
            processRow(row)
          }
        }
      })
      observer.observe(applicationLink, { attributes: true })
    }
  }
  const headRow = document.querySelector('.ReactTable .rt-table .rt-thead .rt-tr')

  const path = applicationLink?.getAttribute('href')
  if (!path) {
    return
  }
  // @ts-ignore
  const { postingId, applicationId } = path.match(PATH_REGEX).groups

  let actionsCell = row.querySelector(`.rt-td.ppe-actions`)
  if (!actionsCell) {
    actionsCell = document.createElement('div')
    actionsCell.classList.add('rt-td', 'ppe-actions')
    actionsCell.setAttribute('style', 'flex: 100 0 auto; width: 50px; max-width: 100px; text-align: center;')
    row.appendChild(actionsCell)
  }
  const actionsRoot = document.createElement('div')
  actionsRoot.setAttribute('id', `ppe-actions-${applicationId}`)
  actionsCell.replaceChildren(actionsRoot)

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

(async () => {
  console.log('Pinpoint Enhancer: init')

  if (!window.location.origin.endsWith('pinpointhq.com')) {
    return
  }

  const tableBody = document.querySelector('.ReactTable .rt-table .rt-tbody')
  if (tableBody) {
    console.log('table body: init on start')
    await checkLoadingState(tableBody)
  }
  else {
    const observer = new MutationObserver(function(mutationsList: any) {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node: Element) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              console.log(node.className)
              if (node.classList.contains('rt-tbody')) {
                console.log('table body: init on mutation')
                observer.disconnect()
                checkLoadingState(node)
                return
              }
            }
          })
        }
        else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const node = mutation.target as Element
          console.log(node.className)
          if (node.classList.contains('rt-tbody')) {
            console.log('table body: init on mutation')
            observer.disconnect()
            checkLoadingState(node)
            return
          }
        }
      }
    })
    observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  }
})()

const getNodeIndex = (element: Element) => [...(element.parentNode?.children || [])].indexOf(element)
