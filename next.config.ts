import type { NextConfig } from 'next';
import { execSync } from 'child_process';
import { version } from './package.json';

const sha = execSync('git rev-parse --short HEAD').toString().trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: 'flagcdn.com' }],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: `${version}-${sha}`,
  },
};

export default nextConfig;
