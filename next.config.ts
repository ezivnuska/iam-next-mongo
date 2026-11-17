import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    transpilePackages: ['@iam/shared-types', '@iam/db', '@iam/ui'],
    serverExternalPackages: ['mongoose', 'bcrypt'],
    // Add headers to force cache revalidation
    async headers() {
        return [
            {
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/_next/data/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                ],
            },
        ];
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'iameric-bucket.s3.us-west-1.amazonaws.com',
                pathname: '/**',
            },
        ],
    },
    webpack: (config, { isServer }) => {
        // Resolve @iam/* directly to source so webpack watches packages/* at their
        // real path — pnpm hardlinks cause filesystem events to fire on the source
        // path, not the node_modules symlink chain, so the alias is required for HMR.
        config.resolve.alias = {
            ...config.resolve.alias,
            '@iam/ui':          path.resolve(__dirname, 'packages/ui'),
            '@iam/db':          path.resolve(__dirname, 'packages/db'),
            '@iam/shared-types': path.resolve(__dirname, 'packages/shared-types'),
        };

        // Exclude server-only packages from client bundle
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                // Stub out mongoose and models for client builds
                '@/app/lib/mongoose': false,
                '@/app/lib/models/user': false,
                '@/app/lib/models/image': false,
                '@/app/lib/models/post': false,
                '@/app/lib/models/memory': false,
                '@/app/lib/models/comment': false,
                '@/app/lib/models/activity': false,
                '@/app/lib/models/friendship': false,
                '@/app/lib/models/like': false,
            };

            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                child_process: false,
                mongoose: false,
                'aws-sdk': false,
                nock: false,
                'mock-aws-s3': false,
                npm: false,
                'node-gyp': false,
            };

            // Ignore HTML files from node-pre-gyp
            config.module.rules.push({
                test: /\.html$/,
                loader: 'ignore-loader',
            });
        }
        return config;
    },
};

export default nextConfig;