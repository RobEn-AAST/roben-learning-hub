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

// Upload a raw base64 image (no data: prefix) to server-side imgbb route
export async function uploadImageFileToImgbb(base64Image: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!base64Image) return { ok: false, error: 'base64Image is required' };

  try {
    const res = await fetch('/api/imgbb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Image }),
    });

    const json = await res.json();
    if (!res.ok) return { ok: false, error: json?.error || 'Upload failed' };
    return { ok: true, url: json.url };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
