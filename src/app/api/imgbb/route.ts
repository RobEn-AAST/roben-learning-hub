import { NextResponse } from 'next/server';

// Server-side API route to upload an external image URL to imgbb.
// Expects POST JSON: { imageUrl: string }
// Requires IMGBB_API_KEY in environment (do NOT commit your key).

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body?.imageUrl;

    if (!imageUrl) {
      return NextResponse.json({ ok: false, error: 'imageUrl is required' }, { status: 400 });
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'IMGBB_API_KEY not configured on server' }, { status: 500 });
    }

    // Fetch the remote URL
    let res = await fetch(imageUrl);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Failed to fetch image URL: ${res.status}` }, { status: 400 });
    }

    const contentType = res.headers.get('content-type') || '';

    // If the resource is HTML (e.g. an ibb.co page), try to extract a direct image URL from the page
    if (!contentType.startsWith('image/')) {
      const text = await res.text();

      // Try common places: og:image, link rel=image_src, and any <img src="..."> pointing to i.ibb.co or i.imgbb.com
      const ogMatch = text.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const linkMatch = text.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      const imgMatch = text.match(/<img[^>]*src=["']([^"']*(?:i\.ibb\.co|i\.imgbb\.com)[^"']*)["'][^>]*>/i);

      const extracted = ogMatch?.[1] || linkMatch?.[1] || imgMatch?.[1] || null;

      if (!extracted) {
        return NextResponse.json({ ok: false, error: `Provided URL is not an image and no direct image could be found on the page` }, { status: 400 });
      }

      // Resolve relative URLs if necessary
      let directUrl = extracted;
      try {
        directUrl = new URL(extracted, imageUrl).toString();
      } catch (e) {
        // fallback - use extracted as-is
      }

      // Fetch the direct image URL
      res = await fetch(directUrl);
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Failed to fetch extracted image: ${res.status}` }, { status: 400 });
      }
    }

    // Now res should point to an image resource
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Upload to imgbb using form data
    const formData = new FormData();
    formData.append('image', base64);

    const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok || !uploadJson || !uploadJson.data) {
      return NextResponse.json({ ok: false, error: uploadJson?.error?.message || 'imgbb upload failed', details: uploadJson }, { status: 502 });
    }

  // Prefer the direct image URL if available (display_url usually points to the image file)
  const directImage = uploadJson.data.display_url || uploadJson.data.url || uploadJson.data.image?.url || null;

  // Also include the raw response so the client can inspect other fields if needed
  return NextResponse.json({ ok: true, url: directImage, raw: uploadJson });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
