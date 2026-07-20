const basePath = "/pokejo";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // basePath配下でのローカル画像最適化(/_next/image)は内部fetchがbasePathを
    // 正しく解決できず404になるため、最適化自体を無効化してそのまま配信する。
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
