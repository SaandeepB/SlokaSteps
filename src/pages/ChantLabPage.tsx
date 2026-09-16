import { useMemo, useState } from 'react'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { SLOKAS } from '../content/slokas'
import { FEATURE_FLAGS } from '../config/featureFlags'

const REFERENCE_OPTIONS = [
  {
    id: 'none',
    name: 'No approved Chant Coach reference is bundled',
  },
]

/**
 * Development-only scaffolding for inspecting the future Chant Coach flow.
 * Routing must keep this page out of production navigation.
 */
export function ChantLabPage() {
  const [slokaId, setSlokaId] = useState(SLOKAS[0]?.id ?? '')
  const [referenceId, setReferenceId] = useState(REFERENCE_OPTIONS[0].id)
  const [testFile, setTestFile] = useState<File | null>(null)

  const evaluationPreview = useMemo(
    () =>
      JSON.stringify(
        {
          status: 'unable-to-evaluate',
          simulated: true,
          message: 'Development placeholder — no audio analysis was performed.',
          slokaId,
          referenceId,
          recording: testFile
            ? {
                name: testFile.name,
                type: testFile.type || 'unknown',
                sizeBytes: testFile.size,
                retained: false,
              }
            : null,
          scores: null,
        },
        null,
        2,
      ),
    [referenceId, slokaId, testFile],
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
        <h2 className="text-lg font-bold text-lotus-700">Prototype only</h2>
        <p className="mt-2 text-ink-700">
          Chant Coach is disabled. This page does not analyze pronunciation,
          rhythm, melody, completeness, or audio quality. It never uploads a
          recording and never presents simulated feedback as genuine analysis.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink-900">Test inputs</h2>

        <label className="flex flex-col gap-2 font-semibold text-ink-700">
          Sloka
          <select
            value={slokaId}
            onChange={(event) => setSlokaId(event.target.value)}
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
          Reference recording
          <select
            value={referenceId}
            onChange={(event) => setReferenceId(event.target.value)}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3 py-2"
          >
            {REFERENCE_OPTIONS.map((reference) => (
              <option key={reference.id} value={reference.id}>
                {reference.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button disabled aria-describedby="chant-record-disabled">
            Record test audio
          </Button>
          <p id="chant-record-disabled" className="self-center text-sm text-ink-500">
            Recording is disabled until the feature passes privacy and validation review.
          </p>
        </div>

        <label className="flex flex-col gap-2 font-semibold text-ink-700">
          Upload local test audio
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => setTestFile(event.target.files?.[0] ?? null)}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white p-2 font-normal"
          />
          <span className="text-sm font-normal text-ink-500">
            The selected file remains in memory for this page and is not uploaded.
          </span>
        </label>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-bold text-ink-900">Waveform</h2>
          <div
            className="mt-3 flex min-h-28 items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-100 text-center text-sm text-sky-700"
            aria-label="Waveform placeholder"
          >
            Waveform placeholder — no signal processing installed
          </div>
        </Card>
        <Card>
          <h2 className="font-bold text-ink-900">Pitch contour</h2>
          <div
            className="mt-3 flex min-h-28 items-center justify-center rounded-2xl border-2 border-dashed border-lavender-300 bg-lavender-100 text-center text-sm text-lavender-700"
            aria-label="Pitch contour placeholder"
          >
            Pitch contour placeholder — recitation styles remain separate
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-ink-900">Evaluation JSON</h2>
        <p className="mt-1 text-sm text-ink-500">
          Safe placeholder output; scores are intentionally absent.
        </p>
        <pre
          className="mt-3 overflow-x-auto rounded-2xl bg-ink-900 p-4 text-sm text-cream-50"
          data-testid="chant-evaluation-json"
        >
          {evaluationPreview}
        </pre>
      </Card>
    </div>
  )
}
