 'use client';

import React, { useState, useEffect } from 'react';

export default function ImgbbTestPage() {
  const [url, setUrl] = useState<string | null>(null);

  // Read `url` from query string so this page becomes view-only: /imgbb-test?url=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('url');
      setUrl(q);
    } catch (e) {
      setUrl(null);
    }
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">imgbb - View Image</h1>
      <p className="text-sm text-gray-600 mb-4">View-only mode: provide a direct image URL via the <code>?url=</code> query parameter.</p>

      {!url && (
        <div className="p-4 border rounded bg-yellow-50 text-yellow-800">
          No image URL provided. Example: <code>/imgbb-test?url=https://i.ibb.co/your-image.jpg</code>
        </div>
      )}

      {url && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">Preview:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="max-w-full rounded border" />
        </div>
      )}
    </div>
  );
}
