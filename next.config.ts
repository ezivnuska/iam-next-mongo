import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Generate unique build ID to force cache invalidation on each deployment
    generateBuildId: async () => {
        return `build-${Date.now()}`;
    },
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
            // Allow server actions to handle missing action IDs gracefully
            allowedOrigins: ['*'],
        },
        // Enable instrumentation for error filtering
        instrumentationHook: true,
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
        // Exclude server-only packages from client bundle
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                crypto: false,
                child_process: false,
            };

            // Completely exclude bcrypt and node-pre-gyp from client bundle
            config.externals = config.externals || [];
            config.externals.push({
                bcrypt: 'bcrypt',
                '@mapbox/node-pre-gyp': '@mapbox/node-pre-gyp',
            });

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