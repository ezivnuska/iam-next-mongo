import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        domains: ["iameric-bucket.s3.us-west-1.amazonaws.com"],
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
            };
        }
        return config;
    },
};

export default nextConfig;