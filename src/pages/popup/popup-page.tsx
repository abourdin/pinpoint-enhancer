import React from 'react'

import logo from '@common/assets/favicon.png'
import { config } from '@common/config'

export function PopupPage(): JSX.Element {
  return (
    <div className='popup-container'>
      <img src={logo} className='popup-logo' />
    </div>
  )
}
