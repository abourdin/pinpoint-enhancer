import useAsync from '@common/hooks/useAsync'
import { useCallback, useState } from 'react'
import { CommentSection } from './CommentSection'
import { flagAsNotSuitable, getApplicationData } from '../api/PinpointAPI'
import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { Alert, Badge, badgeClasses, CircularProgress, Grid, IconButton, styled } from '@mui/material'
import { ApplicationData } from '../types'
import { AccountBox } from '@mui/icons-material'

const CommentBadge = styled(Badge)`
  & .${badgeClasses.badge} {
    top: -12px;
    right: -20px;
    font-size: 1.4em;
  }
`

type ApplicationDialogProps = {
  applicationId: string
  applicationUrl: string
  currentUserId: string
  rejectCallback: (tag: Tag) => void
}

export function ApplicationDialog({
  applicationId, applicationUrl, currentUserId, rejectCallback,
}: ApplicationDialogProps) {
  const [open, setOpen] = useState(false)

  const { loading, error, data: applicationData } = useAsync<ApplicationData>(async () => {
    return await getApplicationData(applicationId)
  }, [applicationId])

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  if (loading || !applicationData) {
    return <CircularProgress size='24px' />
  }

  if (error) {
    return <Alert severity='error'>Error</Alert>
  }

  const commentsCount = applicationData.commentsResponse?.data?.length
  const hasCommented = applicationData.commentsResponse?.data?.some((comment: any) => comment.attributes.user_id === currentUserId)

  return (
    <>
      <Button variant='contained' color={hasCommented ? 'success' : 'primary'} onClick={handleClickOpen}>
        <AccountBox />
        <CommentBadge badgeContent={commentsCount} color='success' overlap='circular' />
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby='draggable-dialog-title'
        fullScreen
        maxWidth='lg'
        slotProps={{
          paper: {
            style: {
              pointerEvents: 'auto',
            },
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} className='dialog-title'>
          <b>Application - {applicationData.name}</b>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={7}>
              <p>
                <b>Personal Summary</b>
                <br />
                {applicationData.summary || <i>No personal summary provided</i>}
              </p>
              {(applicationData.answers || []).map(answer => (
                <p key={answer.title}>
                  <b>{answer.title}</b>
                  <br />
                  {answer.answer?.toString()}
                </p>
              ))}
            </Grid>
            <Grid size={5}>
              <CommentSection applicationId={applicationId} applicationData={applicationData} currentUserId={currentUserId}
                              rejectCallback={rejectCallback} />
            </Grid>
            <Grid size={12}>
              <div id='document-container'>
                <div id='embed-border'></div>
                <embed src={applicationData.cvUrl} width='100%' height='3000px' />
              </div>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button className='dialog-button'
                  variant='contained'
                  onClick={() => window.open(applicationUrl, '_blank').focus()}>
            Open full application
          </Button>
          <Button className='dialog-button' variant='contained' onClick={() => window.open(applicationData.cvUrl, '_blank').focus()}>
            Open CV in new tab
          </Button>
          <Button className='dialog-button' variant='contained' onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
