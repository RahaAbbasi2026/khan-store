/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Private and transactional areas must never be indexed, even if a link to them leaks.
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    return ['/admin/:path*', '/account/:path*', '/cart', '/checkout/:path*'].map((source) => ({ source, headers: noindex }));
  },
};

module.exports = nextConfig;
