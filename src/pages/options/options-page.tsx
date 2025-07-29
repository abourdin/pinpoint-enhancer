import React from 'react'

import logo from '@common/assets/favicon.png'
import { config } from '@common/config'

export function OptionsPage(): JSX.Element {
  return (
    <>
      <h2>Options page</h2>
      <img src={logo} width={48} height={48} />
    </>
  )
}
