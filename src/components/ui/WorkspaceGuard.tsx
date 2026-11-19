import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { WorkspaceContext } from '@/contexts/WorkspaceContext'

export function WorkspaceGuard({ children }: { children: ReactNode }) {
  const [dirty, setDirtyState] = useState(false)
  const dirtyRef = useRef(false)
  const discardRef = useRef<(() => void) | null>(null)
  const registerDiscard = useCallback((callback: () => void) => {
    discardRef.current = callback
    return () => {
      if (discardRef.current === callback) discardRef.current = null
    }
  }, [])
  const setDirty = useCallback((value: boolean) => {
    dirtyRef.current = value
    setDirtyState(value)
  }, [])
  const [pending, setPending] = useState<(() => void) | null>(null)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  )
  const routeBlocked = blocker.state === 'blocked'
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if ((pending || routeBlocked) && !dialog.current?.open)
      dialog.current?.showModal()
    else if (!pending && !routeBlocked) dialog.current?.close()
  }, [pending, routeBlocked])
  function cancel() {
    setPending(null)
    if (blocker.state === 'blocked') blocker.reset()
  }
  function discard() {
    discardRef.current?.()
    setDirty(false)
    if (blocker.state === 'blocked') blocker.proceed()
    else pending?.()
    setPending(null)
  }
  return (
    <WorkspaceContext.Provider
      value={{
        setDirty,
        registerDiscard,
        request: (action) => {
          if (dirtyRef.current) setPending(() => action)
          else action()
        },
      }}
    >
      {children}
      <dialog
        className="pa-dialog"
        ref={dialog}
        aria-labelledby="pa-discard-title"
        onCancel={(event) => {
          event.preventDefault()
          cancel()
        }}
      >
        <CircleAlert size={25} />
        <h2 id="pa-discard-title">Değişiklikler kaydedilmedi</h2>
        <p>Devam edersen son düzenlemelerin kaybolacak.</p>
        <div className="pa-actions">
          <button className="pa-button pa-secondary" autoFocus onClick={cancel}>
            Düzenlemeye dön
          </button>
          <button className="pa-button" onClick={discard}>
            Değişiklikleri bırak
          </button>
        </div>
      </dialog>
    </WorkspaceContext.Provider>
  )
}
