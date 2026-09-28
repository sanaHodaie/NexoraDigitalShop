const configuredOrigin = process.env.NEXORA_API_ORIGIN?.trim();

function frontendOrigin(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    url.hostname = url.hostname.replace(/\.$/, '');
    return url.origin;
  } catch {
    return undefined;
  }
}

function validateApiOrigin(value) {
  const invalid = () => new Error('NEXORA_API_ORIGIN must be an external HTTPS origin without credentials, a path, a query, or a fragment.');
  // Accept an origin with an optional trailing slash, never an API path.
  if (!/^https:\/\/[^/?#\\@]+\/?$/i.test(value)) throw invalid();
  let url;
  try { url = new URL(value); }
  catch { throw invalid(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw invalid();

  const hostname = url.hostname.replace(/\.$/, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || /^127\./.test(hostname)
    || hostname === '0.0.0.0' || hostname === '[::]' || hostname === '[::1]'
    || /^\[::ffff:7f[\da-f]{2}:/.test(hostname)) {
    throw new Error('NEXORA_API_ORIGIN must not point to localhost or a loopback address.');
  }
  url.hostname = hostname;
  const frontendOrigins = [
    'https://nexora-digital-shop.vercel.app',
    frontendOrigin(process.env.VERCEL_URL),
    frontendOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ];
  if (frontendOrigins.includes(url.origin)) {
    throw new Error('NEXORA_API_ORIGIN must not point to this frontend; that would create a proxy loop.');
  }
  return url.origin;
}

const apiOrigin = configuredOrigin ? validateApiOrigin(configuredOrigin) : undefined;

// Read on Vercel at build time; this value is not a browser-side VITE_* setting.
export const config = {
  framework: 'vite',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [
    {
      source: '/api/:path*',
      destination: apiOrigin ? `${apiOrigin}/api/:path*` : '/api/backend-unavailable',
    },
    { source: '/(.*)', destination: '/index.html' },
  ],
};
