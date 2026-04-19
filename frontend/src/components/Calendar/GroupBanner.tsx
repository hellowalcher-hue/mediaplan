// src/components/Calendar/GroupBanner.tsx
import type { ActivityGroup } from '../../types'
import { hexAlpha } from '../../utils/color'
import './GroupBanner.css'

interface Props {
  group:   ActivityGroup
  isStart: boolean
}

export default function GroupBanner({ group, isStart }: Props) {
  return (
    <div
      className="group-banner"
      title={group.name}
      style={{
        background:  hexAlpha(group.color, 0.15),
        borderLeft:  isStart ? `3px solid ${group.color}` : '3px solid transparent',
        color: group.color,
      }}
    >
      {isStart && (
        <span className="group-banner-name">
          {group.project_emoji && <span>{group.project_emoji} </span>}
          {group.name}
        </span>
      )}
    </div>
  )
}
