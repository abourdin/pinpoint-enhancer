import { styled } from '@mui/material'
import React from 'react'

import logo from '@common/assets/favicon.png'

const Pre = styled('pre')(({ theme }) => ({
  ...theme.typography.pre,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  padding: theme.spacing(1),
  textAlign: 'left',
}))

export function PopupPage(): JSX.Element {
  return (
    <div className='popup-container'>
      <img src={logo} className='popup-logo' />
      <p>
        <b>Pinpoint Enhancer - beta</b>
      </p>
      <Pre>
        Author: <a href='https://github.com/abourdin' target='_blank'>Alex Bourdin</a>
        <br />
        <br />
        <hr />
        <br />
        <a href='https://github.com/abourdin/pinpoint-enhancer' target='_blank'>Github Repository</a> - <a
        href='https://github.com/abourdin/pinpoint-enhancer/issues/new' target='_blank'>Open an issue</a>
      </Pre>
    </div>
  )
}
