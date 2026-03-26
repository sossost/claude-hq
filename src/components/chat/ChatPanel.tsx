'use client'

import type { ChatMessage, SessionSettings } from '@/types/events'
import type { ClaudeDefaults } from '@/lib/useClaudeConfig'
import { ChatMessages } from './ChatMessages'
import { ChatInput } from './ChatInput'
import { SettingsPanel } from '@/components/settings'

interface ChatPanelProps {
  messages: ChatMessage[]
  isRunning: boolean
  hasProject: boolean
  projectName?: string
  settings: SessionSettings
  activeModel: string | null
  activePermissionMode: string | null
  claudeDefaults: ClaudeDefaults
  onSettingsChange: (settings: SessionSettings) => void
  onSend: (message: string) => void
  onStop: () => void
}

export function ChatPanel({ messages, isRunning, hasProject, projectName, settings, activeModel, activePermissionMode, claudeDefaults, onSettingsChange, onSend, onStop }: ChatPanelProps) {
  return (
    <>
      <ChatMessages messages={messages} isRunning={isRunning} projectName={projectName} />
      <div className="relative">
        {/* Fade gradient above input */}
        <div
          className="absolute -top-8 left-0 right-0 h-8 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--background))',
          }}
        />
        <div className="px-4 pt-2 pb-1">
          <SettingsPanel settings={settings} activeModel={activeModel} activePermissionMode={activePermissionMode} claudeDefaults={claudeDefaults} onChange={onSettingsChange} />
        </div>
        <ChatInput onSend={onSend} onStop={onStop} isRunning={isRunning} disabled={!hasProject} />
      </div>
    </>
  )
}
