import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.E2E_BUILD_DIR ? '.next-e2e' : '.next',
  output: process.env.VERCEL ? undefined : 'standalone',
  serverExternalPackages: ['pdfjs-dist'],
  outputFileTracingIncludes: {'/api/documents': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', './node_modules/pdfjs-dist/standard_fonts/**/*', './node_modules/pdfjs-dist/cmaps/**/*']},
  async redirects() {
    return [{ source: '/demo.webm', destination: '/demo.mp4', permanent: true }];
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default nextConfig;
