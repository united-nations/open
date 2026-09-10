import type { NextConfig } from 'next'
import path from 'node:path'

// The UI package is versioned inside node_modules; keep resolution in this app.
const projectRoot = path.resolve(__dirname)

// Set to your repository name for GitHub Pages, or '' for custom domain
const basePath = process.env.NODE_ENV === 'production' ? (process.env.BASE_PATH || '') : ''

// NOTE: use basePath variable for Image src
// https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images

const nextConfig: NextConfig = {
    transpilePackages: ['@un-eosg/ui'],
    turbopack: {
        root: projectRoot,
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
