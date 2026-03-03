import path from 'path';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  transpilePackages: ['@tradematch/types'],
};

export default nextConfig;
