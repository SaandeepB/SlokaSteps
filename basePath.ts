const DEFAULT_BASE_PATH = '/'

/**
 * Vite and React Router must agree on one path-only deployment base.
 * Full URLs, traversal, query strings, and hash fragments are rejected.
 */
export function normalizeBasePath(value?: string): string {
  const candidate = value?.trim() || DEFAULT_BASE_PATH
  if (
    candidate.includes('\\') ||
    candidate.includes('?') ||
    candidate.includes('#') ||
    candidate.includes('://') ||
    candidate.startsWith('//')
  ) {
    throw new Error('VITE_BASE_PATH must be an internal URL path')
  }

  const withLeadingSlash = candidate.startsWith('/')
    ? candidate
    : `/${candidate}`
  const segments = withLeadingSlash.split('/')
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('VITE_BASE_PATH cannot contain path traversal')
  }

  const normalizedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/')
  const withoutTrailingSlash = normalizedSlashes.replace(/\/+$/, '')
  return withoutTrailingSlash ? `${withoutTrailingSlash}/` : DEFAULT_BASE_PATH
}

export function routerBasenameFromBasePath(basePath: string): string {
  const normalized = normalizeBasePath(basePath)
  return normalized === DEFAULT_BASE_PATH ? DEFAULT_BASE_PATH : normalized.slice(0, -1)
}

/** Prefixes a canonical root-relative public asset with the deployment base. */
export function publicAssetUrl(
  rootRelativePath: string,
  basePath: string,
): string {
  if (
    !rootRelativePath.startsWith('/') ||
    rootRelativePath.startsWith('//') ||
    rootRelativePath.includes('\\') ||
    rootRelativePath.split('/').some((segment) => segment === '..')
  ) {
    throw new Error('Public assets must use a safe root-relative path')
  }
  return `${normalizeBasePath(basePath)}${rootRelativePath.slice(1)}`
}
