'use client'

import { useRef, useEffect } from 'react'

const MAX_VISIBLE_ITEMS = 8
const ITEM_HEIGHT_PX = 30

interface PickerItem {
  name: string
  description: string
}

interface CommandPickerProps {
  items: PickerItem[]
  selectedIndex: number
  onSelect: (index: number) => void
  isSubOption?: boolean
}

export function CommandPicker({ items, selectedIndex, onSelect, isSubOption }: CommandPickerProps) {
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-1 mx-4" style={{ zIndex: 50 }}>
        <div
          className="max-w-3xl mx-auto rounded-lg overflow-hidden shadow-lg"
          style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="px-3 py-2 text-xs" style={{ color: 'var(--content-muted)' }}>
            No matching commands
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 mx-4" style={{ zIndex: 50 }}>
      <div
        className="max-w-3xl mx-auto rounded-lg overflow-hidden overflow-y-auto shadow-lg"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          maxHeight: `${MAX_VISIBLE_ITEMS * ITEM_HEIGHT_PX}px`,
        }}
        role="listbox"
        aria-label={isSubOption === true ? 'Option suggestions' : 'Command suggestions'}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex
          return (
            <div
              key={`${item.name}-${index}`}
              ref={isSelected ? selectedRef : undefined}
              className="w-full text-left px-3 py-1.5 flex items-center gap-2 cursor-pointer"
              style={{ background: isSelected ? 'var(--surface-hover)' : 'transparent' }}
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
              onClick={() => onSelect(index)}
            >
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--foreground)' }}>
                {isSubOption === true ? item.name : `/${item.name}`}
              </span>
              {item.description !== '' && (
                <span
                  className="text-[11px] truncate"
                  style={{ color: 'var(--content-muted)' }}
                >
                  {isSubOption === true ? `— ${item.description}` : item.description}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
