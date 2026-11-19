import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Album art comes straight from JioSaavn / Apple Music CDNs; we use plain <img> so nothing is proxied.
  images: { unoptimized: true },
  // GramJS (Telegram storage for uploads) runs on the server only and must not be bundled
  serverExternalPackages: ['sharp', 'telegram'],
};

export default nextConfig;
