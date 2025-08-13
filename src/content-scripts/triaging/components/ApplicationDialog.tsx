import { useApplicationContext } from '@src/content-scripts/triaging/context/ApplicationContext'
import { useState } from 'react'
import { CommentSection } from './CommentSection'
import * as React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { Alert, Badge, badgeClasses, CircularProgress, Grid, styled } from '@mui/material'
import { AccountBox } from '@mui/icons-material'

const CommentBadge = styled(Badge)`
  & .${badgeClasses.badge} {
    top: -12px;
    right: -20px;
    font-size: 1.4em;
  }
`

export function ApplicationDialog() {
  const [open, setOpen] = useState(false)
  const { applicationUrl, currentUserId, loading, error, data } = useApplicationContext()

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  if (loading || !data) {
    return <CircularProgress size='24px' />
  }

  if (error) {
    return <Alert severity='error'>Error</Alert>
  }

  const commentsCount = data.comments?.length
  const hasCommented = data.comments?.some((comment: any) => comment.attributes.user_id === currentUserId)

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
          <b>Application - {data.name}</b>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid size={7}>
              <p>
                <b>Personal Summary</b>
                <br />
                {data.summary || <i>No personal summary provided</i>}
              </p>
              {(data.answers || []).map(answer => (
                <p key={answer.title}>
                  <b>{answer.title}</b>
                  <br />
                  {answer.answer?.toString()}
                </p>
              ))}
            </Grid>
            <Grid size={5}>
              <CommentSection />
            </Grid>
            <Grid size={12}>
              <div id='document-container'>
                <div id='embed-border'></div>
                <embed src={data.cvUrl} width='100%' height='3000px' />
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
          <Button className='dialog-button' variant='contained' onClick={() => window.open(data.cvUrl, '_blank').focus()}>
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
