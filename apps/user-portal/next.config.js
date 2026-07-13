/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
  allowedDevOrigins: ['127.0.0.1'],
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@interview-agent/auth-client', '@interview-agent/contracts'],
};

module.exports = nextConfig;
