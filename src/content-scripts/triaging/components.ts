import { flagAsNotSuitable } from './API'
import { getUsername, cacheUsernamesFromResponse } from './utils'

const dialogOptions = {
  show: false,
  hide: false,
  autoOpen: false,
  width: 800,
  height: 700,
  classes: {
    'ui-dialog': 'highlight ui-corner-all no-close',
  },
  buttons: {
    Close: function() {
      $(this).dialog('close')
    },
  },
}

export function renderApplicationDialog({ name, summary, answers, applicationUrl, cvUrl, commentsDialog }) {
  return $(`<div class='card'>
        <div>
          <b>Personal Summary</b>
          <br/>
          <div>${summary || '<i>No personal summary provided</i>'}</div>
        </div>
        <br/>
        ${answers.map(answer => `
          <div>
            <b>${answer.title}</b>
            <br/>
            <div>${answer.answer}</div>
          </div>
        `).join('<br/>')}
        <hr/>
        <div id='document-container'>
          <div id='embed-border'></div>
          <embed src='${cvUrl}' width='950px' height='3000px' />
        </div>
      </div>`).dialog({
    ...dialogOptions,
    title: `Application - ${name}`,
    width: 1000,
    height: 800,
    buttons: {
      'Open full application': function() {
        window.open(applicationUrl, '_blank').focus()
      },
      'Open CV in new tab': function() {
        window.open(cvUrl, '_blank').focus()
      },
      'Open comments': function() {
        $(commentsDialog).dialog('open')
      },
      Close: function() {
        $(this).dialog('close')
      },
    },
  })
}

export function renderCommentsDialog({ applicationId, applicationUrl, tags, tagsCell }) {
  const tagsSection = $(renderTags(tags))
  const commentsDialog = $(`<div></div>`).dialog({
    ...dialogOptions,
    title: 'Comments',
    height: 700,
    buttons: [{
      id: `comment-dialog-btn-open-${applicationId}`,
      text: 'Open in new tab',
      click: function() {
        window.open(`${applicationUrl}/comments`, '_blank').focus()
      },
    },
      {
        id: `comment-dialog-reject-${applicationId}`,
        text: 'Reject as not suitable',
        click: async function() {
          const button = $(`#comment-dialog-reject-${applicationId}`)
          button.button('disable')
          await flagAsNotSuitable(applicationId)
          const tag = renderTag({ name: 'Not suitable for this position' })
          $(tag).appendTo(tagsSection)
          $(tag).appendTo(tagsCell)
          button.button('enable')
        },
      },
      {
        id: `comment-dialog-close-${applicationId}`,
        text: 'Close',
        click: function() {
          $(this).dialog('close')
        },
      }],
  })
  tagsSection.appendTo(commentsDialog)
  const loader = $('<div>Loading...</div>').appendTo(commentsDialog)
  return { commentsDialog, loader }
}

export function renderTags(tags) {
  return `<div>
    ${tags.map(renderTag).join(' ')}
  </div><br/>`
}

function renderTag(tag) {
  return `<span class='bp3-tag bp3-minimal bp3-muted' style='background-color: rgb(253, 236, 235);'>
    <span class='bp3-fill bp3-text-overflow-ellipsis' title='${tag.name}'>${tag.name}</span>
  </span>`
}

export function renderComments(commentsResponse, scoreChanges, currentUserId) {
  const commentsSection = $(`<div></div>`)
  let commented = false
  for (const comment of commentsResponse.data) {
    const userId = comment.attributes.user_id
    const score = scoreChanges[userId]
    $(renderComment(comment, score) + '<hr/>').appendTo(commentsSection)

    if (parseInt(userId) === currentUserId) {
      commented = true
    }
  }
  return { commentsSection, commented }
}

export function renderNewCommentSection(commentsDialog, { applicationId, commentsSection, row }) {
  const newCommentSection = $('<div></div>').appendTo(commentsDialog)
  const commentGroup = $(`<fieldset>
            <label for='comment'>Write a comment</label>
          </fieldset>`).appendTo(newCommentSection)
  const commentInput = $(`<textarea name='comment' id='comment-input-${applicationId}' />`).appendTo(commentGroup)

  const scoreGroup = $(`<fieldset>
            <label for='score'>Select a score</label>
          </fieldset>`).appendTo(newCommentSection)
  const scoreSelectInput = $(`<select name='score' id='score-select-${applicationId}'>
          <option value='1' selected='selected'>⭐️</option>
          <option value='2'>⭐️⭐️</option>
          <option value='3'>⭐️⭐️⭐️</option>
          <option value='4'>⭐️⭐️⭐️⭐️</option>
          <option value='5'>⭐️⭐️⭐️⭐️⭐️</option>
        </select>`).appendTo(scoreGroup).selectmenu()

  const submitGroup = $('<fieldset></fieldset>').appendTo(newCommentSection)

  const submitButton = $('<button type="button" class="ui-button ui-corner-all ui-widget" style="float: right;">Submit</button>').button().appendTo(submitGroup)
  submitButton.on('click', async function(event) {
    submitButton.button('disable')
    commentInput.prop('disabled', true)
    scoreSelectInput.selectmenu('disable')

    const comment = commentInput.val()
    const score = parseInt(scoreSelectInput.val())
    await postScore(applicationId, score)
    if (comment?.length) {
      const commentResponse = await postComment(applicationId, comment)
      cacheUsernamesFromResponse(commentResponse)
      $(renderComment(commentResponse.data, score)).appendTo(commentsSection)
      $('<hr/>').appendTo(newCommentSection)
      $(row).addClass('row-commented')
    }

    commentInput.val('')
    commentInput.prop('disabled', false)
    scoreSelectInput.selectmenu('enable')
    submitButton.button('enable')
  })
  return newCommentSection
}

export function bindShortcutToDialog(shortcut, dialog) {
  shortcut.on('click', (e) => {
    e.stopPropagation()
    $(dialog).dialog('open')
  })
}

export function appendShortcuts(cell, { applicationId, applicationDialog, commentsDialog }) {
  const applicationShortcut = $(`<a title='Application' id='icon-app-${applicationId}' class='shortcut-icon'>🧑‍💻</a>`)
  const commentsShortcut = $(`<a title='Comments' id='icon-comments-${applicationId}' class='shortcut-icon'>⭐️</a>`)
  const shortcuts = $('<div></div>').append(applicationShortcut).append(commentsShortcut)
  $(cell).html(shortcuts)

  bindShortcutToDialog(applicationShortcut, applicationDialog)
  bindShortcutToDialog(commentsShortcut, commentsDialog)
  return {
    application: applicationShortcut,
    comments: commentsShortcut,
  }
}

function renderComment(comment, score) {
  const userId = comment.attributes.user_id
  return `<b>${getUsername(userId)}</b> ${score ? `rated ${'⭐️'.repeat(score || 0)} ` : `commented`}: ${comment.attributes.body_json.map(entry => `<p>${entry.children[0].text}</p>`).join('')}`
}
