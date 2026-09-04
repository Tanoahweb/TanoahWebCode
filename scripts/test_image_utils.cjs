function isR2Asset(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return false;
  const trimmed = urlOrKey.trim();

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) return false;
  if (lower.startsWith('/assets/') || lower.startsWith('assets/')) return false;
  if (lower.startsWith('http://localhost') || lower.startsWith('https://localhost')) return false;
  if (lower.startsWith('http://127.0.0.1') || lower.startsWith('https://127.0.0.1')) return false;
  if (lower.startsWith('http://192.168.') || lower.startsWith('https://192.168.')) return false;

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    const cdnDomain = 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev';
    const cleanCdn = cdnDomain.replace(/^https?:\/\//, '').toLowerCase().replace(/\/.*$/, '');
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      return host === cleanCdn || host.endsWith('.r2.dev') || host.includes('r2.cloudflarestorage.com');
    } catch {
      return false;
    }
  }

  return true;
}

function extractR2Key(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return '';
  const trimmed = urlOrKey.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed.replace(/^\/+/, '');
  }

  try {
    const parsed = new URL(trimmed);
    const cdnCgiIndex = parsed.pathname.indexOf('/cdn-cgi/image/');
    if (cdnCgiIndex !== -1) {
      const parts = parsed.pathname.slice(cdnCgiIndex + 15).split('/');
      parts.shift();
      return parts.join('/');
    }
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return trimmed;
  }
}

function getTransformedImageUrl(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string' || !urlOrKey.trim()) {
    return '/Assets/hero/hero-mobile.jpg';
  }

  if (!isR2Asset(urlOrKey)) {
    return urlOrKey;
  }

  const cdnDomain = 'https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev';
  const key = extractR2Key(urlOrKey);

  if (cdnDomain.includes('r2.dev') || cdnDomain.includes('r2.cloudflarestorage.com')) {
    return `${cdnDomain.replace(/\/+$/, '')}/${key}`;
  }

  return `${cdnDomain}/${key}`;
}

console.log('1. Local /assets/hero/hero-landscape.jpg ->', getTransformedImageUrl('/assets/hero/hero-landscape.jpg'));
console.log('2. Local /Assets/hero/hero-mobile.jpg ->', getTransformedImageUrl('/Assets/hero/hero-mobile.jpg'));
console.log('3. Direct R2 ->', getTransformedImageUrl('https://pub-b84a76f2249d43fa80197c7320ff268e.r2.dev/products/abc.webp'));
console.log('4. Pure key products/abc.webp ->', getTransformedImageUrl('products/abc.webp'));
console.log('5. Data URL data:image/png;base64,... ->', getTransformedImageUrl('data:image/png;base64,1234'));
