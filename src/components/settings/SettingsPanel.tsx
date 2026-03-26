'use client'

import { useState, useRef, useEffect } from 'react'
import type { SessionSettings, ModelOption, EffortLevel, PermissionMode } from '@/types/events'
import type { ClaudeDefaults } from '@/lib/useClaudeConfig'

interface SettingsPanelProps {
  settings: SessionSettings
  activeModel: string | null
  activePermissionMode: string | null
  claudeDefaults: ClaudeDefaults
  onChange: (settings: SessionSettings) => void
}

const MODEL_OPTIONS: Array<{ value: ModelOption; label: string }> = [
  { value: 'opus', label: 'Opus' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'haiku', label: 'Haiku' },
]

const EFFORT_OPTIONS: Array<{ value: EffortLevel; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
]

const PERMISSION_OPTIONS: Array<{ value: PermissionMode; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'auto', label: 'Auto' },
  { value: 'plan', label: 'Plan' },
]

type DropdownType = 'model' | 'effort' | 'permission' | null

function formatModelName(fullModelId: string): string {
  if (fullModelId.includes('opus')) return 'Opus'
  if (fullModelId.includes('sonnet')) return 'Sonnet'
  if (fullModelId.includes('haiku')) return 'Haiku'
  return fullModelId
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SettingsPanel({ settings, activeModel, activePermissionMode, claudeDefaults, onChange }: SettingsPanelProps) {
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openDropdown == null) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current != null && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenDropdown(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openDropdown])

  function toggleDropdown(type: DropdownType) {
    setOpenDropdown((prev) => (prev === type ? null : type))
  }

  // Resolve: override → stream init → config probe → null
  const resolvedModel = settings.model != null
    ? MODEL_OPTIONS.find((o) => o.value === settings.model)?.label ?? settings.model
    : activeModel != null
      ? formatModelName(activeModel)
      : claudeDefaults.model != null
        ? formatModelName(claudeDefaults.model)
        : null

  const resolvedEffort = settings.effort != null
    ? capitalize(settings.effort)
    : claudeDefaults.effortLevel != null
      ? capitalize(claudeDefaults.effortLevel)
      : null

  const resolvedPermission = settings.permissionMode != null
    ? capitalize(settings.permissionMode)
    : activePermissionMode != null
      ? capitalize(activePermissionMode)
      : claudeDefaults.permissionMode != null
        ? capitalize(claudeDefaults.permissionMode)
        : null

  const hasAnyVisible = resolvedModel != null || resolvedEffort != null || resolvedPermission != null
    || settings.model != null || settings.effort != null || settings.permissionMode != null

  if (!hasAnyVisible) return null

  type ItemConfig = {
    key: DropdownType
    label: string | null
    isOverridden: boolean
    options: Array<{ value: string; label: string }>
    selected: string | null
    field: keyof SessionSettings
  }

  const allItems: ItemConfig[] = [
    { key: 'model', label: resolvedModel, isOverridden: settings.model != null, options: MODEL_OPTIONS, selected: settings.model, field: 'model' },
    { key: 'effort', label: resolvedEffort, isOverridden: settings.effort != null, options: EFFORT_OPTIONS, selected: settings.effort, field: 'effort' },
    { key: 'permission', label: resolvedPermission, isOverridden: settings.permissionMode != null, options: PERMISSION_OPTIONS, selected: settings.permissionMode, field: 'permissionMode' },
  ]

  const visibleItems = allItems.filter((item) => item.label != null || item.isOverridden)

  return (
    <div ref={containerRef} className="flex items-center gap-3 max-w-3xl mx-auto px-1">
      {visibleItems.map((item, idx) => (
        <div key={item.key} className="flex items-center gap-3">
          {idx > 0 && <Separator />}
          <div className="relative">
            <TextButton
              label={item.label ?? '—'}
              isOverridden={item.isOverridden}
              isOpen={openDropdown === item.key}
              onClick={() => toggleDropdown(item.key)}
            />
            {openDropdown === item.key && (
              <DropdownMenu
                options={item.options}
                selected={item.selected}
                onSelect={(value) => {
                  const current = settings[item.field]
                  onChange({ ...settings, [item.field]: current === value ? null : value })
                  setOpenDropdown(null)
                }}
              />
            )}
          </div>
        </div>
      ))}

    </div>
  )
}

function Separator() {
  return (
    <span
      className="h-3 w-px shrink-0"
      style={{ background: 'var(--border)' }}
    />
  )
}

function TextButton({
  label,
  isOverridden,
  isOpen,
  onClick,
}: {
  label: string
  isOverridden: boolean
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] py-0.5 transition-colors flex items-center gap-1"
      style={{
        color: isOverridden ? 'var(--foreground)' : 'var(--content-muted)',
      }}
    >
      <span style={{ fontWeight: isOverridden ? 500 : 400 }}>{label}</span>
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        className="transition-transform"
        style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
      >
        <path d="M2 3L4 5L6 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function DropdownMenu({
  options,
  selected,
  onSelect,
}: {
  options: Array<{ value: string; label: string }>
  selected: string | null
  onSelect: (value: string) => void
}) {
  return (
    <div
      className="absolute left-0 bottom-full mb-1 z-50 rounded-md shadow-lg overflow-hidden"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        minWidth: '7rem',
      }}
    >
      {options.map((opt) => {
        const isSelected = selected === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className="w-full text-left text-xs px-3 py-1.5 transition-colors flex items-center justify-between gap-3"
            style={{
              background: isSelected ? 'var(--surface-hover)' : 'transparent',
              color: isSelected ? 'var(--foreground)' : 'var(--content-secondary)',
            }}
          >
            {opt.label}
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
