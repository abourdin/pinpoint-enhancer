import { cacheUsernamesFromResponse } from '@src/content-scripts/triaging/utils'
import { ApplicationData } from '../types'

const BASE_URL = window.location.origin

const dataCache: { [key: string]: ApplicationData } = {}

export async function getApplicationData(applicationId: string): Promise<ApplicationData> {
  let cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse
  if (dataCache[applicationId]) {
    ;({ cvUrl, name, summary, answers, scoreChanges, tags, commentsResponse } = dataCache[applicationId] || {})
  }
  else {
    const applicationDetailsUrl = `${BASE_URL}/admin/api/v1/applications/${applicationId}?filter[audits][visible_history]=true&fields[applications]=full_name,summary&fields[jobs]=title&extra_fields[answers]=document_file,documents_files&include=answers.answer_options,job.job_structured_sections.structured_section.structured_section_questions.question,structured_section_responses.structured_section_response_answers,candidate_survey.answers.answer_options,associated_audits.user&extra_fields[applications]=pdf_cv_file,tags&concealed=false`

    const [response1, response2] = await Promise.all([
      fetchAndParse(applicationDetailsUrl),
      getComments(applicationId),
    ])
    commentsResponse = response2.data
    cacheUsernamesFromResponse(response1)
    cacheUsernamesFromResponse(response2)

    ;({ cvUrl, name, summary, answers, scoreChanges, tags } = extractApplicationData(response1))
    dataCache[applicationId] = { cvUrl, name, summary, answers, scoreChanges, tags, comments: commentsResponse }
  }
  return { cvUrl, name, summary, answers, scoreChanges, tags, comments: commentsResponse }
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

export async function getComments(applicationId: string) {
  return fetchAndParse(
    `${BASE_URL}/admin/api/v1/comments?filter[commentable_type]=Application&filter[commentable_id]=${applicationId}&sort=created_at&include=user,mentioned_users`,
  )
}

export async function postComment(applicationId: string, comment: string) {
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
  return fetchAndParse(`${BASE_URL}/admin/api/v1/comments?include=user,mentioned_users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })
}

export async function postScore(applicationId: string, score: number) {
  const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content
  if (!csrfToken) {
    throw new Error('CSRF token not found')
  }

  const formData = new URLSearchParams()
  formData.append('rating[score]', score.toString())
  formData.append('authenticity_token', csrfToken)

  return fetchAndParse(`${BASE_URL}/admin/applications/${applicationId}/rating`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  })
}

export async function flagAsNotSuitable(applicationId: string) {
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
  return fetchAndParse(`${BASE_URL}/admin/api/v1/applications/${applicationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })
}

async function fetchAndParse(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}
