import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  compress: true,

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|ico|woff2|css|js)',
        locale: false,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
