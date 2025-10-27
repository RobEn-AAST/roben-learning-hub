// Client helper to call the server-side imgbb upload route
export async function uploadImageUrlToImgbb(imageUrl: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!imageUrl) return { ok: false, error: 'imageUrl is required' };

  try {
    const res = await fetch('/api/imgbb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });

    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.error || 'Upload failed' };
    return { ok: true, url: json.url };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
