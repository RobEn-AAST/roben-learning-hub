export function isDirectImageUrl(url?: string | null) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Known direct image hosts from imgbb/ibb
    if (/^(i\.ibb\.co|i\.imgbb\.com|imgbb\.com)$/.test(host) || host.endsWith('.i.ibb.co')) return true;
  } catch (e) {
    // ignore
  }

  // Fallback: check file extension
  return /\.(jpe?g|png|webp|gif|avif|svg|bmp)$/i.test(url);
}

export default isDirectImageUrl;
