import { useState, useRef, useCallback } from 'react'
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

const TERMINAL: DraftJobStatus[] = ['saved', 'failed']
const POLL_INTERVAL_MS = 2000

export function useJobPoller() {
  const [state, setState] = useState<PollerState>({
    jobId: null,
    status: null,
    drafts: [],
    error: null,
    polling: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setState(prev => ({ ...prev, polling: false }))
  }, [])

  const poll = useCallback((jobId: string) => {
    apiGet<JobResult>(`/webhook/job-status?job_id=${jobId}`)
      .then(data => {
        const terminal = TERMINAL.includes(data.status)
        setState(prev => ({
          ...prev,
          status: data.status,
          drafts: data.drafts ?? prev.drafts,
          error: data.status === 'failed' ? (data.error_message ?? 'Üretim başarısız.') : null,
          polling: !terminal,
        }))
        if (!terminal) {
          timerRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS)
        }
      })
      .catch(() => {
        // Geçici ağ hatası — bir sonraki turda tekrar dene
        timerRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS * 2)
      })
  }, [])

  const start = useCallback((jobId: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setState({
      jobId,
      status: 'queued',
      drafts: [],
      error: null,
      polling: true,
    })
    timerRef.current = setTimeout(() => poll(jobId), POLL_INTERVAL_MS)
  }, [poll])

  const reset = useCallback(() => {
    stop()
    setState({ jobId: null, status: null, drafts: [], error: null, polling: false })
  }, [stop])

  return { ...state, start, stop, reset }
}
