import {
  contentMatches,
  DEFAULT_CATALOG_PATH,
  loadCatalog,
  loadLocalEnvironment,
  parseArgs,
} from './common.mjs'
import { generateAudioSegments } from './pipeline.mjs'

await loadLocalEnvironment()
const args = parseArgs(process.argv.slice(2))
const catalog = await loadCatalog(
  typeof args.catalog === 'string' ? args.catalog : DEFAULT_CATALOG_PATH,
)
const contentId = typeof args.content === 'string' ? args.content : undefined
const contentType = typeof args.type === 'string' ? args.type : undefined
const language = typeof args.language === 'string' ? args.language : undefined
const provider =
  typeof args.provider === 'string' ? args.provider : process.env.TTS_PROVIDER || 'sarvam'

const segments = catalog.segments.filter(
  (segment) =>
    segment.enabled !== false &&
    (!contentType || segment.contentType === contentType) &&
    (!language || segment.language === language) &&
    contentMatches(catalog, segment.contentId, contentId),
)

if (segments.length === 0) {
  console.log('No audio catalog segments matched the requested filters; nothing was changed.')
  console.log('Add reviewed narration text to scripts/audio/content-catalog.json or pass --catalog=PATH.')
} else {
  console.log(`Preparing ${segments.length} segment(s) with provider ${provider}.`)
  const summary = await generateAudioSegments(segments, provider)
  console.log(
    `Audio generation complete: ${summary.generated} generated, ${summary.cached} cached, ${summary.skipped} skipped, ${summary.failed} failed.`,
  )
  if (summary.failed > 0) process.exitCode = 1
}
