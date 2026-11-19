import { createContext, useContext, useEffect, useRef } from 'react'

export const WorkspaceContext = createContext<{
  setDirty: (value: boolean) => void
  request: (action: () => void) => void
  registerDiscard: (callback: () => void) => () => void
} | null>(null)

export function useWorkspaceGuard() {
  const guard = useContext(WorkspaceContext)
  if (!guard) throw new Error('WorkspaceGuard is required')
  return guard
}
export function useUnsavedChanges(dirty: boolean, onDiscard?: () => void) {
  const { setDirty, registerDiscard } = useWorkspaceGuard()
  const discardCallback = useRef(onDiscard)
  discardCallback.current = onDiscard
  useEffect(() => {
    setDirty(dirty)
    const unregister = registerDiscard(() => discardCallback.current?.())
    return () => {
      setDirty(false)
      unregister()
    }
  }, [dirty, setDirty, registerDiscard])
}
