const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/** @type {import('next').NextConfig} */
function nextConfig(phase) {
  return {
    ...(process.platform === 'win32' ? {} : { output: 'standalone' }),
    allowedDevOrigins: ['127.0.0.1'],
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    poweredByHeader: false,
    reactStrictMode: true,
    transpilePackages: ['@interview-agent/auth-client', '@interview-agent/contracts'],
  };
}

module.exports = nextConfig;
