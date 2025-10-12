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