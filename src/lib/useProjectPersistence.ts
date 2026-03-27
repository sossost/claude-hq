'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types/events'

const LAST_PROJECT_KEY = 'lastProjectPath'

type SidebarView = 'projects' | 'sessions'

interface UseProjectPersistenceOptions {
  projects: Project[]
  onClear: () => void
  onRemove: (path: string) => Promise<void>
}

interface UseProjectPersistenceReturn {
  selectedProject: Project | null
  sidebarView: SidebarView
  setSidebarView: (view: SidebarView) => void
  handleProjectSelect: (project: Project) => void
  handleProjectRemove: (path: string) => Promise<void>
}

export function useProjectPersistence({
  projects,
  onClear,
  onRemove,
}: UseProjectPersistenceOptions): UseProjectPersistenceReturn {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [sidebarView, setSidebarView] = useState<SidebarView>('projects')

  // Restore last used project
  useEffect(() => {
    if (projects.length === 0) return

    const lastPath = localStorage.getItem(LAST_PROJECT_KEY)
    if (lastPath != null) {
      const found = projects.find((p) => p.path === lastPath)
      if (found != null) {
        setSelectedProject(found)
        setSidebarView('sessions')
        return
      }
    }

    setSelectedProject(projects[0])
    setSidebarView('sessions')
  }, [projects])

  const handleProjectSelect = useCallback((project: Project) => {
    const isSameProject = project.path === selectedProject?.path
    if (isSameProject === false) {
      setSelectedProject(project)
      localStorage.setItem(LAST_PROJECT_KEY, project.path)
      onClear()
    }
    setSidebarView('sessions')
  }, [selectedProject?.path, onClear])

  const handleProjectRemove = useCallback(async (path: string) => {
    await onRemove(path)
    if (selectedProject?.path === path) {
      setSelectedProject(null)
      setSidebarView('projects')
      onClear()
    }
  }, [selectedProject?.path, onRemove, onClear])

  return {
    selectedProject,
    sidebarView,
    setSidebarView,
    handleProjectSelect,
    handleProjectRemove,
  }
}
