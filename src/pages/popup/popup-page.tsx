import React from 'react'

import logo from '@common/assets/favicon.png'

export function PopupPage(): JSX.Element {
  return (
    <div className='popup-container'>
      <img src={logo} className='popup-logo' />
      <div>
        <b>Pinpoint Enhancer - beta</b>
      </div>
    </div>
  )
}
