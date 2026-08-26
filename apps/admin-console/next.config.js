const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/** @type {import('next').NextConfig} */
function nextConfig(phase) {
  return {
    // standalone 输出仅在显式要求时开启（容器构建设置 NEXT_OUTPUT_STANDALONE=true）；
    // 宿主机 next start 与 E2E 生产构建使用默认输出。
    ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' } : {}),
    allowedDevOrigins: ['127.0.0.1'],
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    poweredByHeader: false,
    reactStrictMode: true,
    transpilePackages: [
      '@interview-agent/api-client',
      '@interview-agent/auth-client',
      '@interview-agent/contracts',
      '@interview-agent/page-agent-client',
    ],
  };
}

module.exports = nextConfig;
