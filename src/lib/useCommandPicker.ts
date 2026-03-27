'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { CommandDefinition, SendOptions } from '@/types/events'

const COMMAND_PREFIX = '/'

/** Builtin commands that have a sub-option picker */
const BUILTIN_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  model: [
    { value: 'opus', label: 'Opus — most capable' },
    { value: 'sonnet', label: 'Sonnet — balanced' },
    { value: 'haiku', label: 'Haiku — fastest' },
  ],
  effort: [
    { value: 'max', label: 'Max — thorough analysis' },
    { value: 'high', label: 'High — detailed' },
    { value: 'medium', label: 'Medium — balanced' },
    { value: 'low', label: 'Low — quick response' },
  ],
  permission: [
    { value: 'default', label: 'Default — ask before actions' },
    { value: 'auto', label: 'Auto — allow safe actions' },
    { value: 'plan', label: 'Plan — plan before acting' },
  ],
}

interface PickerItem {
  name: string
  description: string
}

function parseCommandInput(value: string): { name: string; args: string } | null {
  if (value.startsWith(COMMAND_PREFIX) === false) return null
  const withoutPrefix = value.slice(1)
  const spaceIndex = withoutPrefix.indexOf(' ')
  if (spaceIndex === -1) {
    return { name: withoutPrefix, args: '' }
  }
  return {
    name: withoutPrefix.slice(0, spaceIndex),
    args: withoutPrefix.slice(spaceIndex + 1),
  }
}

function resolveCommand(template: string, args: string): string {
  return template.replace(/\$ARGUMENTS/g, args)
}

interface UseCommandPickerOptions {
  commands: CommandDefinition[]
  value: string
  isComposing: boolean
  onSend: (message: string, options?: SendOptions) => void
  onBuiltinCommand: (name: string, args: string) => void
  setValue: (value: string) => void
}

interface UseCommandPickerReturn {
  isPickerOpen: boolean
  setIsPickerOpen: (open: boolean) => void
  shouldShowPicker: boolean
  isSubOptionMode: boolean
  selectedIndex: number
  pickerItems: PickerItem[]
  handlePickerSelect: (index: number) => void
  handlePickerComplete: (index: number) => void
  handleCommandSubmit: () => boolean
  handleKeyDown: (e: React.KeyboardEvent) => boolean
}

export function useCommandPicker({
  commands,
  value,
  isComposing,
  onSend,
  onBuiltinCommand,
  setValue,
}: UseCommandPickerOptions): UseCommandPickerReturn {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const parsed = useMemo(() => parseCommandInput(value), [value])
  const commandFilter = parsed?.name ?? ''

  // Detect sub-option mode
  const hasSpace = value.indexOf(' ') > 0
  const isBuiltinWithOptions = parsed != null && BUILTIN_OPTIONS[parsed.name] != null
  const isSubOptionMode = isBuiltinWithOptions && hasSpace

  const subOptions = useMemo(() => {
    if (isSubOptionMode === false || parsed == null) return []
    const opts = BUILTIN_OPTIONS[parsed.name]
    if (opts == null) return []
    const argFilter = parsed.args.toLowerCase()
    return opts.filter((o) => o.value.startsWith(argFilter))
  }, [isSubOptionMode, parsed])

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) =>
      cmd.name.toLowerCase().startsWith(commandFilter.toLowerCase()),
    )
  }, [commands, commandFilter])

  const shouldShowPicker = isPickerOpen
    && value.startsWith(COMMAND_PREFIX)
    && isComposing === false
    && (hasSpace === false || isSubOptionMode)

  const pickerItems = useMemo((): PickerItem[] => {
    if (isSubOptionMode) {
      return subOptions.map((o) => ({ name: o.value, description: o.label }))
    }
    return filteredCommands.map((c) => ({ name: c.name, description: c.description }))
  }, [isSubOptionMode, subOptions, filteredCommands])

  // Reset selected index when list changes or picker reopens
  const prevPickerOpenRef = useRef(false)
  useEffect(() => {
    if (isPickerOpen && prevPickerOpenRef.current === false) {
      setSelectedIndex(0)
    }
    prevPickerOpenRef.current = isPickerOpen
  }, [isPickerOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [commandFilter, isSubOptionMode])

  function selectSubOption(index: number) {
    if (parsed == null) return
    const opt = subOptions[index]
    if (opt == null) return
    onBuiltinCommand(parsed.name, opt.value)
    setValue('')
    setIsPickerOpen(false)
  }

  function handleCommandSend(cmd: CommandDefinition) {
    const args = parsed?.args ?? ''

    // Builtin with sub-options: show option picker
    if (cmd.source === 'builtin' && BUILTIN_OPTIONS[cmd.name] != null) {
      setValue(`/${cmd.name} `)
      setIsPickerOpen(true)
      return
    }

    if (cmd.source === 'builtin') {
      onBuiltinCommand(cmd.name, args)
      setValue('')
      setIsPickerOpen(false)
      return
    }

    const expanded = resolveCommand(cmd.template, args)
    const displayText = args !== '' ? `/${cmd.name} ${args}` : `/${cmd.name}`
    onSend(expanded, { displayContent: displayText })
    setValue('')
    setIsPickerOpen(false)
  }

  function handlePickerSelect(index: number) {
    if (isSubOptionMode) {
      selectSubOption(index)
    } else {
      const cmd = filteredCommands[index]
      if (cmd != null) handleCommandSend(cmd)
    }
  }

  function handlePickerComplete(index: number) {
    if (isSubOptionMode) {
      if (parsed == null) return
      const opt = subOptions[index]
      if (opt != null) {
        setValue(`/${parsed.name} ${opt.value}`)
      }
    } else {
      const cmd = filteredCommands[index]
      if (cmd != null) {
        setValue(`/${cmd.name} `)
      }
    }
  }

  /** Try to submit as a command. Returns true if handled. */
  function handleCommandSubmit(): boolean {
    const trimmed = value.trim()
    if (trimmed.startsWith(COMMAND_PREFIX) === false) return false

    const p = parseCommandInput(trimmed)
    if (p == null) return false

    const cmd = commands.find((c) => c.name === p.name)
    if (cmd == null) return false

    if (cmd.source === 'builtin') {
      onBuiltinCommand(cmd.name, p.args)
    } else {
      const expanded = resolveCommand(cmd.template, p.args)
      onSend(expanded, { displayContent: trimmed })
    }
    setValue('')
    setIsPickerOpen(false)
    return true
  }

  /** Handle keyboard events for the picker. Returns true if the event was consumed. */
  function handleKeyDown(e: React.KeyboardEvent): boolean {
    if (shouldShowPicker && pickerItems.length > 0) {
      if (e.key === 'Tab' || e.key === 'ArrowRight') {
        e.preventDefault()
        handlePickerComplete(selectedIndex)
        return true
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev <= 0 ? pickerItems.length - 1 : prev - 1,
        )
        return true
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev >= pickerItems.length - 1 ? 0 : prev + 1,
        )
        return true
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsPickerOpen(false)
        return true
      }
      if (e.key === 'Enter' && e.shiftKey === false) {
        e.preventDefault()
        handlePickerSelect(selectedIndex)
        return true
      }
    }

    if (e.key === 'Escape' && isPickerOpen) {
      e.preventDefault()
      setIsPickerOpen(false)
      return true
    }

    return false
  }

  return {
    isPickerOpen,
    setIsPickerOpen,
    shouldShowPicker,
    isSubOptionMode,
    selectedIndex,
    pickerItems,
    handlePickerSelect,
    handlePickerComplete,
    handleCommandSubmit,
    handleKeyDown,
  }
}
