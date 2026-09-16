import {
  normalizeBasePath,
  publicAssetUrl,
  routerBasenameFromBasePath,
} from '../../basePath'

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL)
export const APP_ROUTER_BASENAME =
  routerBasenameFromBasePath(APP_BASE_PATH)

export function appPublicAssetUrl(rootRelativePath: string): string {
  return publicAssetUrl(rootRelativePath, APP_BASE_PATH)
}
