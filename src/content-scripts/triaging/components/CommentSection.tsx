import { Card, CardContent, Rating, Stack, TextField, Typography } from '@mui/material'
import Button from '@mui/material/Button'
import * as React from 'react'
import { postComment, postScore } from '../api/PinpointAPI'
import { cacheUsernamesFromResponse, getUsername } from '@src/content-scripts/triaging/utils'
import { useCallback, useState } from 'react'
import { ApplicationData } from '../types'

export function CommentSection({ applicationId, applicationData, currentUserId }: {
  applicationId: string
  applicationData: ApplicationData;
  currentUserId: string;
}) {
  const [rating, setRating] = useState<number>(1)
  const [comment, setComment] = useState<string>('')
  const [submitting, setSubmitting] = React.useState<boolean>(false)
  const [comments, setComments] = React.useState<any[]>(applicationData.commentsResponse?.data)
  const [scoreChanges, setScoreChanges] = React.useState<{ [key: string]: number }>(applicationData.scoreChanges || {})

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      const commentResponse = await postComment(applicationId, comment)
      cacheUsernamesFromResponse(commentResponse)
      await postScore(applicationId, rating)
      setComment('')
      setComments(comments => [...comments, commentResponse.data])
      setScoreChanges(scoreChanges => ({
        ...scoreChanges,
        [currentUserId]: rating,
      }))
    }
    catch (error) {
      console.error(error)
    }
    setSubmitting(false)
  }, [rating, comment, setComment, setComments, setScoreChanges, currentUserId])

  if (!comments) {
    return null
  }

  return <Card variant='outlined'>
    <CardContent>
      {comments.map((comment: any) => {
        const userId = comment.attributes.user_id
        const score = scoreChanges[userId]
        return (
          <>
            <b>{getUsername(userId)}</b> {score ? <>rated <Rating name='read-only' value={score} readOnly /></> : `commented`}:
            {comment.attributes.body_json.map((entry, index) => <p key={`comment-${index}`}>{entry.children[0].text}</p>)}
          </>
        )
      })}
      <hr />
      <Stack spacing={2}>
        <div>
          <Typography component='legend'>Rating</Typography>
          <Rating
            name='simple-controlled'
            value={rating}
            onChange={(event, newValue: number) => {
              setRating(newValue)
            }}
            disabled={submitting}
          />
        </div>
        <div>
          <TextField
            id='outlined-multiline-static'
            label='Write a comment'
            multiline
            rows={4}
            fullWidth
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setComment(event.target.value)
            }}
            value={comment}
            disabled={submitting}
          />
        </div>
        <div>
          <Button variant='contained'
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={!rating || !comment}>
            Submit review
          </Button>
        </div>
      </Stack>
    </CardContent>
  </Card>
}
