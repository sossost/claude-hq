'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types/events'

interface UseProjectsReturn {
  projects: Project[]
  isLoading: boolean
  importProject: (path: string) => Promise<void>
  removeProject: (path: string) => Promise<void>
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProjects = useCallback(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const importProject = useCallback(async (path: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    const data = await res.json()
    if (data.project != null) {
      setProjects((prev) => [...prev, data.project])
    }
  }, [])

  const removeProject = useCallback(async (path: string) => {
    await fetch(`/api/projects?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    })
    setProjects((prev) => prev.filter((p) => p.path !== path))
  }, [])

  return { projects, isLoading, importProject, removeProject }
}
