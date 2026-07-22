import {
  loadLocalEnvironment,
  NARRATION_LANGUAGES,
  parseArgs,
  speakerForLanguage,
} from './common.mjs'
import { listKnownVoices } from './providers.mjs'

await loadLocalEnvironment()
const args = parseArgs(process.argv.slice(2))
const provider = typeof args.provider === 'string' ? args.provider : 'sarvam'
const voices = listKnownVoices(provider)

console.log(`Known ${provider} voices (offline configuration; no API request made):`)
if (voices.length === 0) {
  console.log('  No local voice catalog is configured for this provider.')
} else {
  console.log(`  ${voices.join(', ')}`)
}
console.log('Configured defaults:')
for (const language of NARRATION_LANGUAGES) {
  console.log(`  ${language}: ${speakerForLanguage(language)}`)
}
console.log('Review voice availability against the provider documentation before production use.')
