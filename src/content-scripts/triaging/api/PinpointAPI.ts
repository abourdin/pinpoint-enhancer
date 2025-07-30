import { ApplicationData } from '@src/content-scripts/triaging/components/ApplicationDialog'
import { cacheUsernamesFromResponse } from '@src/content-scripts/triaging/utils'
import $ from 'jquery'

const BASE_URL = window.location.origin

const dataCache: { [key: string]: ApplicationData } = {}

export async function getApplicationData(applicationId: string): Promise<ApplicationData> {
  let cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse
  if (dataCache[applicationId]) {
    ;({ cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse } = dataCache[applicationId] || {})
  }
  else {
    const [response1, response2] = await Promise.all([$.get(
      `${BASE_URL}/admin/api/v1/applications/${applicationId}?filter[audits][visible_history]=true&fields[applications]=full_name,summary&fields[jobs]=title&extra_fields[answers]=document_file,documents_files&include=answers.answer_options,job.job_structured_sections.structured_section.structured_section_questions.question,structured_section_responses.structured_section_response_answers,candidate_survey.answers.answer_options,associated_audits.user&extra_fields[applications]=pdf_cv_file,tags&concealed=false`,
    ), getComments(applicationId)])
    commentsResponse = response2
    cacheUsernamesFromResponse(response1)
    cacheUsernamesFromResponse(response2)

    ;({ cvUrl, name, summary, answers, scoreChanges, tags } = extractApplicationData(response1))
    dataCache[applicationId] = { cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse }
  }
  return { cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse }
}

export function extractApplicationData(applicationResponse: any) {
  const cvUrl = `${BASE_URL}${applicationResponse.data.attributes.pdf_cv_file.path}`
  const summary = applicationResponse.data.attributes.summary
  const name = applicationResponse.data.attributes.full_name
  const tags = applicationResponse.data.attributes.tags
  const answers = applicationResponse.included.filter(entry => entry.type === 'answers' && ['boolean', 'long_text'].includes(entry.attributes.question_type)).map(answer => ({
    title: answer.attributes.title,
    answer: answer.attributes.text_answer || answer.attributes.boolean_answer,
    type: answer.attributes.question_type,
  }))
  const scoreChanges: {
    [key: string]: number;
  } = applicationResponse.included.filter(entry => entry.type === 'audits' && entry.attributes.rating_score_changes != null).reduce((acc, scoreChange) => {
    acc[scoreChange.relationships.user.data.id] = scoreChange.attributes.rating_score_changes.to
    return acc
  }, {})
  return { name, cvUrl, summary, answers, scoreChanges, tags }
}

export async function getComments(applicationId) {
  return $.get(
    `${BASE_URL}/admin/api/v1/comments?filter[commentable_type]=Application&filter[commentable_id]=${applicationId}&sort=created_at&include=user,mentioned_users`,
  )
}

export async function postComment(applicationId, comment) {
  const payload = {
    data: {
      type: 'comments',
      attributes: {
        commentable_id: applicationId,
        commentable_type: 'Application',
        body_json: comment.split('\n').filter(line => line.trim().length).map(line => ({
          type: 'paragraph',
          children: [
            {
              text: line,
            },
          ],
        })) || [],
      },
    },
  }
  return $.ajax({
    type: 'POST',
    url: `${BASE_URL}/admin/api/v1/comments?include=user,mentioned_users`,
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(payload),
    dataType: 'json',
  })
}

export async function postScore(applicationId, score) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').content
  const payload = {
    rating: {
      score,
    },
    authenticity_token: csrfToken,
  }
  return $.ajax({
    type: 'PATCH',
    url: `${BASE_URL}/admin/applications/${applicationId}/rating`,
    data: payload,
    dataType: 'json',
  })
}

export async function flagAsNotSuitable(applicationId) {
  const payload = {
    data: {
      type: 'applications',
      id: applicationId,
      'attributes': {
        add_tag_with_context: {
          tag: 'Not suitable for this position',
          context: 'rejection',
        },
      },
    },
  }
  return $.ajax({
    type: 'PATCH',
    url: `${BASE_URL}/admin/api/v1/applications/${applicationId}`,
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(payload),
    dataType: 'json',
  })
}
