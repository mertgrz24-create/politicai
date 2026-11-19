import { useState, useRef, useCallback, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { Draft, DraftJobStatus } from '@/types'
interface JobResult {
  id: string
  status: DraftJobStatus
  error_message: string | null
  drafts?: Draft[]
}
interface PollerState {
  jobId: string | null
  status: DraftJobStatus | null
  drafts: Draft[]
  error: string | null
  polling: boolean
}
const initial: PollerState = {
  jobId: null,
  status: null,
  drafts: [],
  error: null,
  polling: false,
}
export function useJobPoller() {
  const [state, setState] = useState<PollerState>(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revision = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      revision.current++
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  const poll = useCallback(async function pollJob(
    jobId: string,
    current: number,
    failures = 0,
  ): Promise<void> {
    try {
      const data = await apiGet<JobResult>(
        `/api/job-status?job_id=${encodeURIComponent(jobId)}`,
      )
      if (!mounted.current || current !== revision.current) return
      const terminal = data.status === 'saved' || data.status === 'failed'
      setState((previous) => ({
        ...previous,
        status: data.status,
        drafts: data.drafts ?? previous.drafts,
        error:
          data.status === 'failed'
            ? data.error_message || 'Üretim tamamlanamadı.'
            : null,
        polling: !terminal,
      }))
      if (!terminal)
        timer.current = setTimeout(() => {
          void pollJob(jobId, current)
        }, 2000)
    } catch {
      if (!mounted.current || current !== revision.current) return
      setState((previous) => ({
        ...previous,
        error:
          'Üretim durumuna ulaşılamıyor. Bağlantı yeniden deneniyor; sunucudaki işlem devam ediyor olabilir.',
      }))
      timer.current = setTimeout(
        () => {
          void pollJob(jobId, current, failures + 1)
        },
        Math.min(4000 * 2 ** Math.min(failures, 3), 30000),
      )
    }
  }, [])
  const stop = useCallback(() => {
    revision.current++
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (mounted.current)
      setState((previous) => ({ ...previous, polling: false }))
  }, [])
  const start = useCallback(
    (jobId: string) => {
      if (!mounted.current) return
      if (timer.current) clearTimeout(timer.current)
      const current = ++revision.current
      setState({ ...initial, jobId, status: 'queued', polling: true })
      timer.current = setTimeout(() => {
        void poll(jobId, current)
      }, 2000)
    },
    [poll],
  )
  const reset = useCallback(() => {
    stop()
    if (mounted.current) setState(initial)
  }, [stop])
  return { ...state, start, stop, reset }
}
