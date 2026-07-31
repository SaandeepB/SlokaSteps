import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const distributionDirectory = resolve(process.cwd(), 'dist')
const indexPath = resolve(distributionDirectory, 'index.html')
const fallbackPath = resolve(distributionDirectory, '404.html')

await copyFile(indexPath, fallbackPath)
console.log('Created dist/404.html from dist/index.html for static SPA fallback.')
