import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { getSpeechPlayback } from '../services/audioPlayback'
import { EMPTY_AUDIO_MANIFEST, loadAudioManifest } from '../services/audioManifest'
import { AUDIO_NARRATION_LANGUAGES } from '../types/audio'
import type { AudioAsset, AudioNarrationLanguage, AudioSource } from '../types/audio'

const sarvamVoices = [
  'shubh',
  'aditya',
  'ritu',
  'priya',
  'neha',
  'rahul',
  'pooja',
  'rohan',
  'simran',
  'kavya',
  'amit',
  'dev',
  'ishita',
  'shreya',
] as const

const providers: AudioSource[] = ['sarvam', 'google', 'azure', 'browser-fallback']

/** Development-only inspection surface. It never calls a paid provider. */
export function AudioLabPage() {
  const [language, setLanguage] = useState<AudioNarrationLanguage>('en-IN')
  const [provider, setProvider] = useState<AudioSource>('sarvam')
  const [voice, setVoice] = useState<string>('shubh')
  const [preferredVoice, setPreferredVoice] = useState<string | null>(null)
  const [pace, setPace] = useState(1)
  const [pitch, setPitch] = useState(0)
  const [sampleText, setSampleText] = useState(
    'Welcome to Sloka Steps. Today we will learn about Saraswati and wisdom.',
  )
  const [assets, setAssets] = useState<AudioAsset[]>(EMPTY_AUDIO_MANIFEST.assets)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [status, setStatus] = useState('Loading static audio manifest…')

  useEffect(() => {
    let active = true
    void loadAudioManifest().then((manifest) => {
      if (!active) return
      setAssets(manifest.assets)
      setSelectedAssetId(manifest.assets[0]?.id ?? '')
      setStatus(
        manifest.assets.length > 0
          ? `${manifest.assets.length} manifest asset(s) loaded.`
          : 'No reviewed static audio is installed yet.',
      )
    })
    return () => {
      active = false
      getSpeechPlayback().stop()
    }
  }, [])

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId),
    [assets, selectedAssetId],
  )

  if (!import.meta.env.DEV) {
    return (
      <div className="py-6">
        <h1 className="text-2xl font-bold text-ink-900">Audio Lab is unavailable.</h1>
        <p className="mt-2 text-ink-700">This development tool is disabled in production.</p>
      </div>
    )
  }

  const previewBrowserVoice = () => {
    const playback = getSpeechPlayback()
    if (!playback.isSupported()) {
      setStatus('Browser speech synthesis is unavailable in this browser.')
      return
    }
    setStatus('Playing the browser fallback. This is not reviewed teaching audio.')
    void playback
      .playText(sampleText, { language, rate: pace })
      .catch(() => setStatus('The browser fallback could not play this sample.'))
  }

  return (
    <div className="flex flex-col gap-5 py-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-lotus-700">Development only</p>
        <h1 className="text-3xl font-extrabold text-teal-700">Audio Lab</h1>
        <p className="mt-2 text-ink-700">
          Compare reviewed static assets and configure build-time narration requests. Paid TTS
          credentials never enter this page or the browser bundle.
        </p>
      </div>

      <Card className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-semibold text-ink-900">
          Language
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as AudioNarrationLanguage)}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3"
          >
            {AUDIO_NARRATION_LANGUAGES.map((code) => (
              <option key={code}>{code}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-semibold text-ink-900">
          Provider
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as AudioSource)}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3"
          >
            {providers.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-semibold text-ink-900">
          Voice
          <select
            value={voice}
            onChange={(event) => setVoice(event.target.value)}
            disabled={provider !== 'sarvam'}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3 disabled:opacity-60"
          >
            {sarvamVoices.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-3">
          <Button variant="secondary" onClick={() => setPreferredVoice(voice)}>
            Mark preferred voice
          </Button>
          {preferredVoice && <span className="pb-2 text-sm text-ink-700">{preferredVoice}</span>}
        </div>

        <label className="flex flex-col gap-1 font-semibold text-ink-900">
          Pace: {pace.toFixed(2)}
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={pace}
            onChange={(event) => setPace(Number(event.target.value))}
          />
        </label>

        <label className="flex flex-col gap-1 font-semibold text-ink-900">
          Pitch: {pitch.toFixed(2)}
          <input
            type="range"
            min="-0.75"
            max="0.75"
            step="0.05"
            value={pitch}
            onChange={(event) => setPitch(Number(event.target.value))}
          />
          <span className="text-xs font-normal text-ink-500">
            Bulbul v3 does not support pitch; this value is for compatible future providers.
          </span>
        </label>

        <label className="flex flex-col gap-1 font-semibold text-ink-900 sm:col-span-2">
          Sample text
          <textarea
            value={sampleText}
            onChange={(event) => setSampleText(event.target.value)}
            rows={4}
            className="rounded-xl border-2 border-cream-300 bg-white p-3 font-normal"
          />
        </label>

        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button onClick={previewBrowserVoice}>Preview browser fallback</Button>
          <Button variant="secondary" onClick={() => getSpeechPlayback().stop()}>
            Stop
          </Button>
        </div>
        <p role="status" className="text-sm text-ink-700 sm:col-span-2">
          {status}
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink-900">Static audio preview</h2>
        <label className="flex flex-col gap-1 font-semibold text-ink-900">
          Manifest asset
          <select
            value={selectedAssetId}
            onChange={(event) => setSelectedAssetId(event.target.value)}
            disabled={assets.length === 0}
            className="min-h-11 rounded-xl border-2 border-cream-300 bg-white px-3 disabled:opacity-60"
          >
            {assets.length === 0 && <option value="">No assets</option>}
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.id} · {asset.reviewStatus}
              </option>
            ))}
          </select>
        </label>
        {selectedAsset && (
          <>
            <audio key={selectedAsset.url} controls preload="metadata" src={selectedAsset.url} />
            <pre className="overflow-auto rounded-xl bg-ink-900 p-3 text-xs text-cream-50">
              {JSON.stringify(selectedAsset, null, 2)}
            </pre>
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-ink-900">Secure generation command</h2>
        <code className="mt-3 block overflow-auto rounded-xl bg-ink-900 p-3 text-sm text-cream-50">
          npm run audio:sample -- --language={language}
        </code>
        <p className="mt-2 text-sm text-ink-700">
          Run this in a trusted terminal with server-side environment variables. The lab never
          sends provider requests.
        </p>
      </Card>
    </div>
  )
}
