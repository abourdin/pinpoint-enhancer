import { Tag } from '../types'
import * as React from 'react'

export function TagChip({ tag }: { tag: Tag }) {
  return <span className='bp3-tag bp3-minimal bp3-muted' style={{ backgroundColor: 'rgb(253, 236, 235)' }}>
    <span className='bp3-fill bp3-text-overflow-ellipsis' title={tag.name}>{tag.name}</span>
  </span>
}
