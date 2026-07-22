import { readdir, readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import {
  loadManifest,
  pathExists,
  PROJECT_ROOT,
  PUBLIC_ROOT,
  publicUrlToPath,
  sha256File,
} from './common.mjs'

const allowedSources = new Set([
  'human',
  'sarvam',
  'suno',
  'google',
  'azure',
  'browser-fallback',
])
const allowedReviews = new Set(['draft', 'needs-review', 'approved', 'rejected'])
const allowedPurposes = new Set([
  'canonical-chant',
  'slow-teaching',
  'melodic-learning',
  'instrumental-practice',
  'meaning-narration',
  'story-narration',
  'background-music',
  'reward-jingle',
])
const allowedLanguages = new Set(['en-IN', 'hi-IN', 'te-IN', 'kn-IN', 'ta-IN', 'mr-IN', 'sa-IN'])
const checksumPattern = /^[a-f0-9]{64}$/
const errors = []
const warnings = []

async function collectFiles(directory) {
  if (!(await pathExists(directory))) return []
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectFiles(path)))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

const manifest = await loadManifest()
const ids = new Set()
const urls = new Map()
for (const [index, asset] of manifest.assets.entries()) {
  const label = asset?.id || `assets[${index}]`
  if (!asset || typeof asset !== 'object') {
    errors.push(`${label}: must be an object`)
    continue
  }
  if (!asset.id || !asset.contentId || !asset.segmentId) {
    errors.push(`${label}: id, contentId, and segmentId are required`)
  }
  if (ids.has(asset.id)) errors.push(`${label}: duplicate id`)
  ids.add(asset.id)
  if (!allowedSources.has(asset.source)) errors.push(`${label}: unsupported source ${asset.source}`)
  if (!allowedReviews.has(asset.reviewStatus)) {
    errors.push(`${label}: unsupported review status ${asset.reviewStatus}`)
  }
  if (!allowedPurposes.has(asset.purpose)) {
    errors.push(`${label}: unsupported purpose ${asset.purpose}`)
  }
  if (!allowedLanguages.has(asset.language)) {
    errors.push(`${label}: unsupported language ${asset.language}`)
  }
  if (!Number.isInteger(asset.version) || asset.version < 1) {
    errors.push(`${label}: version must be a positive integer`)
  }
  if (urls.has(asset.url) && urls.get(asset.url) !== asset.id) {
    errors.push(`${label}: URL is also owned by ${urls.get(asset.url)}`)
  }
  urls.set(asset.url, asset.id)

  let audioPath
  try {
    audioPath = publicUrlToPath(asset.url)
  } catch (error) {
    errors.push(`${label}: ${error.message}`)
    continue
  }
  if (!(await pathExists(audioPath))) {
    errors.push(`${label}: missing file ${asset.url}`)
  } else if (asset.checksum) {
    if (!checksumPattern.test(asset.checksum)) {
      errors.push(`${label}: checksum must be a lowercase SHA-256 value`)
    } else if ((await sha256File(audioPath)) !== asset.checksum) {
      errors.push(`${label}: checksum does not match ${asset.url}`)
    }
  } else if (asset.reviewStatus === 'approved') {
    errors.push(`${label}: approved assets require a checksum`)
  }

  if (asset.slowUrl) {
    try {
      if (!(await pathExists(publicUrlToPath(asset.slowUrl)))) {
        errors.push(`${label}: missing slow file ${asset.slowUrl}`)
      }
    } catch (error) {
      errors.push(`${label}: ${error.message}`)
    }
  }
  if (
    asset.reviewStatus === 'approved' &&
    asset.purpose === 'canonical-chant' &&
    asset.source !== 'human'
  ) {
    errors.push(`${label}: approved canonical chanting must be human-recorded`)
  }
  if (asset.source === 'human' && asset.url.includes('/generated/')) {
    errors.push(`${label}: human audio cannot live in a generated directory`)
  }
  if (
    !['human', 'browser-fallback'].includes(asset.source) &&
    (!asset.providerMetadata || !asset.inputChecksum)
  ) {
    warnings.push(`${label}: generated asset is missing provider/cache metadata`)
  }
}

for (const path of await collectFiles(PUBLIC_ROOT)) {
  const name = path.toLowerCase()
  if (name.endsWith('.env') || name.includes('.env.')) {
    errors.push(`Environment file must not be public: ${path}`)
  }
}

const browserFiles = [
  ...(await collectFiles(resolve(PROJECT_ROOT, 'src'))),
  ...(await collectFiles(resolve(PROJECT_ROOT, 'dist'))),
].filter((path) => ['.ts', '.tsx', '.js', '.mjs', '.html'].includes(extname(path)))
for (const path of browserFiles) {
  const source = await readFile(path, 'utf8')
  if (/VITE_(?:SARVAM|GOOGLE|AZURE)[A-Z0-9_]*(?:KEY|SECRET|TOKEN)/.test(source)) {
    errors.push(`Client-exposed paid-provider secret variable found in ${path}`)
  }
  if (path.includes(`${resolve(PROJECT_ROOT, 'dist')}`) && source.includes('api-subscription-key')) {
    errors.push(`Provider authentication header found in browser bundle: ${path}`)
  }
}

for (const warning of warnings) console.warn(`[warning] ${warning}`)
for (const error of errors) console.error(`[error] ${error}`)
if (errors.length > 0) {
  console.error(`Audio verification failed with ${errors.length} error(s).`)
  process.exitCode = 1
} else {
  console.log(
    `Audio verification passed for ${manifest.assets.length} manifest asset(s) with ${warnings.length} warning(s).`,
  )
}
