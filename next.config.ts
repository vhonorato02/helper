import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  webpack(config) {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /node_modules[\\/]jose[\\/]dist[\\/]webapi[\\/]lib[\\/]deflate\.js/,
        message:
          /A Node\.js API is used \((CompressionStream|DecompressionStream) at line: \d+\)/,
      },
    ];
    return config;
  },
};

export default nextConfig;
