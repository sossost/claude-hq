/** Event types from `claude -p --output-format stream-json --verbose` */

export interface SystemInitEvent {
  type: 'system'
  subtype: 'init'
  session_id: string
  cwd: string
  model: string
  tools: string[]
  mcp_servers: Array<{ name: string; status: string }>
}

export interface AssistantTextEvent {
  type: 'assistant'
  session_id: string
  message: {
    role: 'assistant'
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      | { type: 'thinking'; thinking: string }
    >
  }
}

export interface ToolResultEvent {
  type: 'user'
  session_id: string
  message: {
    role: 'user'
    content: Array<{
      tool_use_id: string
      type: 'tool_result'
      content: string
      is_error: boolean
    }>
  }
  tool_use_result?: {
    stdout: string
    stderr: string
  }
}

export interface ResultEvent {
  type: 'result'
  subtype: 'success' | 'error'
  session_id: string
  result: string
  duration_ms: number
  num_turns: number
  total_cost_usd: number
}

export type ClaudeStreamEvent =
  | SystemInitEvent
  | AssistantTextEvent
  | ToolResultEvent
  | ResultEvent
  | { type: string; [key: string]: unknown }

// ─── Chat Messages ─────────────────────────────────────

export type ChatMessage =
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | SystemMessage
  | StatusMessage

interface UserMessage {
  id: string
  role: 'user'
  content: string
  timestamp: number
}

interface AssistantMessage {
  id: string
  role: 'assistant'
  content: string
  timestamp: number
}

interface ToolMessage {
  id: string
  role: 'tool'
  toolName: string
  input: string
  output: string | null
  isError: boolean
  timestamp: number
}

interface SystemMessage {
  id: string
  role: 'system'
  content: string
  timestamp: number
}

interface StatusMessage {
  id: string
  role: 'status'
  sessionId: string
  status: 'running' | 'done' | 'error'
  duration?: number
  cost?: number
  turns?: number
  timestamp: number
}

// ─── Project ───────────────────────────────────────────

export interface Project {
  /** Display name (e.g., "my-project") */
  name: string
  /** Absolute filesystem path */
  path: string
  /** Whether the path exists on disk */
  exists: boolean
}

// ─── Session Persistence ───────────────────────────────

export interface PersistedSession {
  id: string
  claudeSessionId: string | null
  projectPath: string
  projectName: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/** Lightweight session info for list views (messages omitted) */
export interface SessionSummary {
  id: string
  claudeSessionId: string | null
  projectPath: string
  projectName: string
  title: string
  messageCount: number
  createdAt: number
  updatedAt: number
}

// ─── Agent Definition ─────────────────────────────────

export type AgentSource = 'project' | 'user' | 'built-in'
export type AgentModel = string
export type AgentCategory = 'planning' | 'quality' | 'build' | 'maintenance' | 'exploration'

export interface AgentDefinition {
  name: string
  description: string
  tools: string[]
  model: AgentModel
  source: AgentSource
  category: AgentCategory
}
