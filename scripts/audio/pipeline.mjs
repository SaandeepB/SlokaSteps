import {
  generatedAssetId,
  loadManifest,
  pathExists,
  publicUrlToPath,
  saveManifest,
  sha256,
  sha256File,
  speakerForLanguage,
  writeBinary,
} from './common.mjs'
import { createTextToSpeechProvider, MissingProviderCredentialError } from './providers.mjs'

function generationInput(provider, model, segment, speaker) {
  return JSON.stringify({
    provider,
    model,
    text: segment.text,
    language: segment.language,
    speaker,
    pace: segment.pace ?? 1,
    pitch: segment.pitch,
    outputFormat: segment.outputFormat ?? 'mp3',
    pronunciationDictionaryId: segment.pronunciationDictionaryId,
    purpose: segment.purpose,
  })
}

function sameSlot(asset, segment) {
  return (
    asset.contentId === segment.contentId &&
    asset.segmentId === segment.segmentId &&
    asset.purpose === segment.purpose &&
    asset.language === segment.language
  )
}

export async function generateAudioSegments(segments, providerId = 'sarvam') {
  const provider = createTextToSpeechProvider(providerId)
  const manifest = await loadManifest()
  const summary = { generated: 0, cached: 0, skipped: 0, failed: 0 }

  if (segments.length > 0 && !provider.isConfigured()) {
    const variable =
      providerId === 'sarvam' ? 'SARVAM_API_KEY' : `${providerId.toUpperCase()} credentials`
    console.log(`[skip] ${providerId} is not configured (${variable}); no network request was made.`)
    summary.skipped = segments.length
    return summary
  }

  for (const segment of segments) {
    try {
      if (!segment.outputUrl?.includes('/generated/')) {
        throw new Error(`Generated output must use a /generated/ directory: ${segment.outputUrl}`)
      }
      const approvedHuman = manifest.assets.find(
        (asset) =>
          sameSlot(asset, segment) &&
          asset.source === 'human' &&
          asset.reviewStatus === 'approved',
      )
      if (approvedHuman) {
        console.log(`[skip] ${segment.contentId}/${segment.segmentId}: approved human audio exists.`)
        summary.skipped += 1
        continue
      }

      const speaker = segment.speaker ?? speakerForLanguage(segment.language)
      const model = provider.model ?? 'provider-default'
      const inputChecksum = sha256(generationInput(providerId, model, segment, speaker))
      const id = generatedAssetId(providerId, segment)
      const existing = manifest.assets.find((asset) => asset.id === id)
      const outputPath = publicUrlToPath(segment.outputUrl)

      if (existing?.inputChecksum === inputChecksum && (await pathExists(outputPath))) {
        console.log(`[cache] ${segment.contentId}/${segment.segmentId}`)
        summary.cached += 1
        continue
      }
      if (existing?.reviewStatus === 'approved') {
        console.log(`[skip] ${id}: approved audio is immutable; create a new version instead.`)
        summary.skipped += 1
        continue
      }
      const owner = manifest.assets.find((asset) => asset.url === segment.outputUrl)
      if ((await pathExists(outputPath)) && !existing && !owner) {
        throw new Error(`Refusing to overwrite unmanaged audio file: ${segment.outputUrl}`)
      }
      if (owner?.source === 'human' || owner?.reviewStatus === 'approved') {
        console.log(`[skip] ${segment.outputUrl}: protected reviewed asset owns this path.`)
        summary.skipped += 1
        continue
      }

      const generated = await provider.synthesize({
        text: segment.text,
        language: segment.language,
        speaker,
        pace: segment.pace,
        pitch: segment.pitch,
        outputFormat: segment.outputFormat ?? 'mp3',
        pronunciationDictionaryId: segment.pronunciationDictionaryId,
      })
      await writeBinary(outputPath, generated.buffer)
      const checksum = await sha256File(outputPath)
      const asset = {
        id,
        contentId: segment.contentId,
        segmentId: segment.segmentId,
        purpose: segment.purpose,
        language: segment.language,
        source: providerId,
        voiceId: generated.voiceId,
        url: segment.outputUrl,
        checksum,
        inputChecksum,
        version: (existing?.version ?? 0) + 1,
        reviewStatus: 'needs-review',
        providerMetadata: {
          provider: providerId,
          model: generated.model,
          requestId: generated.requestId,
          generatedAt: new Date().toISOString(),
        },
      }
      manifest.assets = manifest.assets.filter((candidate) => candidate.id !== id)
      manifest.assets.push(asset)
      await saveManifest(manifest)
      console.log(`[generated] ${segment.outputUrl}`)
      summary.generated += 1
    } catch (error) {
      if (error instanceof MissingProviderCredentialError) {
        console.log(`[skip] ${error.message}`)
        summary.skipped += 1
      } else {
        console.error(`[failed] ${segment.contentId}/${segment.segmentId}: ${error.message}`)
        summary.failed += 1
      }
    }
  }
  return summary
}
