/** @type {import('next').NextConfig} */

// Sent with every page. They stop the site being framed by another site
// (clickjacking), stop browsers guessing file types, keep full URLs out of
// the Referer header sent to other sites, and only let this site use the
// microphone (voice notes in chat).
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self' https://accounts.google.com https://*.supabase.co" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      // Google profile pictures (Google sign-in).
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Supabase Storage public bucket URLs (banners, avatars, etc).
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Old addresses from the original starter kit.
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: true },
      { source: '/verify-email', destination: '/users', permanent: true },
      { source: '/password-reset/:token', destination: '/forgot-password', permanent: false },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
