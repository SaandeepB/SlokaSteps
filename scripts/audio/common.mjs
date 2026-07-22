import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = resolve(scriptDirectory, '..', '..')
export const PUBLIC_ROOT = resolve(PROJECT_ROOT, 'public')
export const MANIFEST_PATH = resolve(PUBLIC_ROOT, 'audio', 'manifest.json')
export const DEFAULT_CATALOG_PATH = resolve(scriptDirectory, 'content-catalog.json')

export const NARRATION_LANGUAGES = ['en-IN', 'hi-IN', 'te-IN', 'kn-IN', 'ta-IN', 'mr-IN']

export const SARVAM_V3_VOICES = [
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
  'ratan',
  'varun',
  'manan',
  'sumit',
  'roopa',
  'kabir',
  'aayan',
  'ashutosh',
  'advait',
  'anand',
  'tanya',
  'tarun',
  'sunny',
  'mani',
  'gokul',
  'vijay',
  'shruti',
  'suhani',
  'mohit',
  'kavitha',
  'rehan',
  'soham',
  'rupali',
]

export function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const equalsAt = token.indexOf('=')
    if (equalsAt >= 0) {
      result[token.slice(2, equalsAt)] = token.slice(equalsAt + 1)
      continue
    }
    const key = token.slice(2)
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      result[key] = next
      index += 1
    } else {
      result[key] = true
    }
  }
  return result
}

function parseEnvText(text) {
  const values = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

/** Loads local server-side variables without adding a runtime dependency. */
export async function loadLocalEnvironment() {
  const merged = {}
  for (const filename of ['.env', '.env.local']) {
    try {
      Object.assign(merged, parseEnvText(await readFile(resolve(PROJECT_ROOT, filename), 'utf8')))
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export async function sha256File(path) {
  return sha256(await readFile(path))
}

export async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

export function publicUrlToPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/audio/') || url.includes('..')) {
    throw new Error(`Unsafe public audio URL: ${String(url)}`)
  }
  const target = resolve(PUBLIC_ROOT, url.slice(1))
  const fromPublic = relative(PUBLIC_ROOT, target)
  if (fromPublic.startsWith('..') || isAbsolute(fromPublic)) {
    throw new Error(`Audio URL escapes public directory: ${url}`)
  }
  return target
}

export async function writeBinary(path, buffer) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, buffer)
}

export async function loadManifest() {
  try {
    const value = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
    if (value?.schemaVersion !== 1 || !Array.isArray(value.assets)) {
      throw new Error('Audio manifest must contain schemaVersion 1 and an assets array.')
    }
    return value
  } catch (error) {
    if (error?.code === 'ENOENT') return { schemaVersion: 1, generatedAt: null, assets: [] }
    throw error
  }
}

export async function saveManifest(manifest) {
  const sorted = [...manifest.assets].sort((left, right) => left.id.localeCompare(right.id))
  await mkdir(dirname(MANIFEST_PATH), { recursive: true })
  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      { schemaVersion: 1, generatedAt: new Date().toISOString(), assets: sorted },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

export async function loadCatalog(path = DEFAULT_CATALOG_PATH) {
  const catalog = JSON.parse(await readFile(resolve(PROJECT_ROOT, path), 'utf8'))
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.segments)) {
    throw new Error('Audio catalog must contain schemaVersion 1 and a segments array.')
  }
  return catalog
}

export function speakerForLanguage(language) {
  const variable = {
    'en-IN': 'SARVAM_DEFAULT_ENGLISH_SPEAKER',
    'hi-IN': 'SARVAM_DEFAULT_HINDI_SPEAKER',
    'te-IN': 'SARVAM_DEFAULT_TELUGU_SPEAKER',
    'kn-IN': 'SARVAM_DEFAULT_KANNADA_SPEAKER',
    'ta-IN': 'SARVAM_DEFAULT_TAMIL_SPEAKER',
    'mr-IN': 'SARVAM_DEFAULT_MARATHI_SPEAKER',
  }[language]
  return (variable && process.env[variable]) || 'shubh'
}

export function generatedAssetId(provider, segment) {
  return [provider, segment.contentId, segment.segmentId, segment.purpose, segment.language]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
}

export function contentMatches(catalog, segmentContentId, requestedContentId) {
  if (!requestedContentId || segmentContentId === requestedContentId) return true
  const aliases = catalog.aliases ?? {}
  return (
    aliases[requestedContentId] === segmentContentId ||
    aliases[segmentContentId] === requestedContentId
  )
}
