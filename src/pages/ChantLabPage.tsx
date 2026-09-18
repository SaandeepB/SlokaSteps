import { useMemo, useState } from 'react'
import { Mic, Play, Square, Trash2, Upload } from 'lucide-react'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { ChantFeedback } from '../components/audio/ChantFeedback'
import { SLOKAS, getSlokaById } from '../content/slokas'
import { FEATURE_FLAGS } from '../config/featureFlags'
import { useChantCoach } from '../hooks/useChantCoach'
import { useRecorder } from '../hooks/useRecorder'
import {
  getChantCoachService,
  prepareChantCoach,
  probeChantCoach,
} from '../services/chantAnalysis/chantCoachRuntime'
import type { ChantEvaluationResult } from '../types/chant'

/**
 * Development-only harness for the on-device Chant Coach. Runs the real
 * analyzer (when local model assets are provisioned) against a microphone
 * recording or an uploaded local file, and shows the full evaluation result
 * — segments, coverage, provenance — exactly as the contract carries it.
 * Nothing here is uploaded anywhere; routing keeps this page out of
 * production navigation and builds.
 */
export function ChantLabPage() {
  const coach = useChantCoach()
  const [slokaId, setSlokaId] = useState(SLOKAS[0]?.id ?? '')
  const [expectedText, setExpectedText] = useState(
    SLOKAS[0]?.lines.map((line) => line.devanagari).join(' ') ?? '',
  )
  const [testFile, setTestFile] = useState<File | null>(null)
  const [result, setResult] = useState<ChantEvaluationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [labError, setLabError] = useState<string | null>(null)
  const recorder = useRecorder()

  const resultJson = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : null),
    [result],
  )

  if (!import.meta.env.DEV) {
    return (
      <div className="py-6">
        <h1 className="text-2xl font-bold text-ink-900">Chant Lab is unavailable.</h1>
        <p className="mt-2 text-ink-700">
          This development tool is disabled in production.
        </p>
      </div>
    )
  }

  const analyze = async (blob: Blob) => {
    const service = getChantCoachService()
    if (!service) {
      setLabError(
        'Analyzer not ready. Prepare the coach first (status above); without local model assets it stays unavailable.',
      )
      return
    }
    setBusy(true)
    setLabError(null)
    setResult(null)
    try {
      const evaluation = await service.evaluate({
        recording: blob,
        slokaId: slokaId || null,
        referenceId: null,
        expectedText,
        language: 'sa-IN',
        ageBand: '7-8',
        evaluationModes: ['completeness', 'pronunciation'],
      })
      setResult(evaluation)
    } catch (error) {
      setLabError(error instanceof Error ? error.message : 'analysis failed')
    } finally {
      setBusy(false)
    }
  }

  const onPickSloka = (id: string) => {
    setSlokaId(id)
    const sloka = getSlokaById(id)
    if (sloka) {
      setExpectedText(sloka.lines.map((line) => line.devanagari).join(' '))
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-lotus-700">
            Development tool
          </p>
          <h1 className="text-3xl font-extrabold text-teal-700">Chant Lab</h1>
        </div>
        <span className="rounded-full bg-cream-200 px-3 py-1 text-sm font-semibold text-ink-700">
          Feature flag: {FEATURE_FLAGS.chantCoachEnabled ? 'on' : 'off'}
        </span>
      </div>

      <Card className="border-lotus-300 bg-lotus-100">
        <h2 className="text-lg font-bold text-lotus-700">Internal-testing harness</h2>
        <p className="mt-2 text-ink-700">
          This page runs the REAL on-device analyzer when local model assets
          are provisioned (models-local/chant). Audio is processed in a worker
          on this machine and never uploaded. Results carry their provenance;
          nothing simulated is ever labelled as analysis.
        </p>
        <p className="mt-2 font-semibold text-ink-700">
          Analyzer status: {coach.status}
          {coach.status === 'preparing' && ` (${Math.round(coach.progress * 100)}%)`}
          {coach.executionProvider ? ` · ${coach.executionProvider}` : ''}
          {coach.analyzerVersion ? ` · ${coach.analyzerVersion}` : ''}
          {coach.errorMessage ? ` · ${coach.errorMessage}` : ''}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void probeChantCoach()}>
            Probe assets
          </Button>
          <Button
            onClick={() => void prepareChantCoach()}
            disabled={coach.status === 'preparing' || coach.status === 'ready'}
          >
            Prepare analyzer
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink-900">Test inputs</h2>

        <label className="flex flex-col gap-2 font-semibold text-ink-700">
          Sloka
          <select
            value={slokaId}
            onChange={(event) => onPickSloka(event.target.value)}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3 py-2"
          >
            {SLOKAS.map((sloka) => (
              <option key={sloka.id} value={sloka.id}>
                {sloka.title}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 font-semibold text-ink-700">
          Expected Devanagari text (editable — try a WRONG sloka to see the
          coverage gate refuse)
          <textarea
            value={expectedText}
            onChange={(event) => setExpectedText(event.target.value)}
            rows={3}
            lang="sa-Deva"
            className="rounded-xl border-2 border-cream-300 bg-white px-3 py-2 text-lg font-normal"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="font-semibold text-ink-700">Microphone test</p>
          <div className="flex flex-wrap gap-3">
            {recorder.status !== 'recording' ? (
              <Button onClick={recorder.start} disabled={!recorder.supported}>
                <Mic size={18} aria-hidden="true" /> Record
              </Button>
            ) : (
              <Button onClick={recorder.stop}>
                <Square size={18} aria-hidden="true" /> Stop ({recorder.elapsedSeconds}s)
              </Button>
            )}
            {recorder.status === 'recorded' && recorder.recordingBlob && (
              <>
                <Button
                  onClick={() => void analyze(recorder.recordingBlob!)}
                  disabled={busy}
                >
                  <Play size={18} aria-hidden="true" /> Analyze recording
                </Button>
                <Button variant="secondary" onClick={recorder.reset}>
                  <Trash2 size={18} aria-hidden="true" /> Discard
                </Button>
              </>
            )}
          </div>
          {recorder.status === 'error' && (
            <p className="text-sm text-lotus-700">
              Microphone unavailable ({recorder.errorKind}); use file upload below.
            </p>
          )}
        </div>

        <label className="flex flex-col gap-2 font-semibold text-ink-700">
          Or upload local test audio (stays in memory)
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => setTestFile(event.target.files?.[0] ?? null)}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white p-2 font-normal"
          />
        </label>
        {testFile && (
          <Button onClick={() => void analyze(testFile)} disabled={busy} className="self-start">
            <Upload size={18} aria-hidden="true" /> Analyze {testFile.name}
          </Button>
        )}

        {busy && (
          <p role="status" className="font-semibold text-teal-700">
            Analyzing on this device…
          </p>
        )}
        {labError && (
          <p role="alert" className="rounded-xl bg-lotus-100 p-3 text-lotus-700">
            {labError}
          </p>
        )}
      </Card>

      {result && (
        <>
          <ChantFeedback result={result} />
          <Card>
            <h2 className="text-xl font-bold text-ink-900">Evaluation JSON</h2>
            <p className="mt-1 text-sm text-ink-500">
              Exact contract payload, including provenance and evidence.
            </p>
            <pre
              className="mt-3 overflow-x-auto rounded-2xl bg-ink-900 p-4 text-sm text-cream-50"
              data-testid="chant-evaluation-json"
            >
              {resultJson}
            </pre>
          </Card>
        </>
      )}
    </div>
  )
}
