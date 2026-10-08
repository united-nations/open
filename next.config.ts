import type { NextConfig } from 'next'
import path from 'node:path'
import { realpathSync } from 'node:fs'

// Local shared UI edits are resolved from the sibling checkout during iteration.
const projectRoot = path.resolve(__dirname)
const workspaceRoot = path.dirname(projectRoot)
const sharedUiRoot = realpathSync(path.join(projectRoot, 'node_modules/@un-eosg/ui'))
const linkedSharedUi = !sharedUiRoot.startsWith(`${projectRoot}${path.sep}`)

// Set to your repository name for GitHub Pages, or '' for custom domain
const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// NOTE: use basePath variable for Image src
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images

const nextConfig: NextConfig = {
    transpilePackages: ['@un-eosg/ui'],
    turbopack: {
        root: linkedSharedUi ? workspaceRoot : projectRoot,
        resolveAlias: linkedSharedUi ? {
            react: path.join(projectRoot, 'node_modules/react'),
            'react-dom': path.join(projectRoot, 'node_modules/react-dom'),
        } : undefined,
    },
    output: 'export',
    trailingSlash: true,
    basePath: basePath,
    assetPrefix: basePath,
    reactStrictMode: true,
    poweredByHeader: false,
    images: {
        unoptimized: true
    },
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
}

export default nextConfig
