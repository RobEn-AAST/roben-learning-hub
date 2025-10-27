 'use client';

import React, { useState } from 'react';

export default function ImgbbTestPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setError(null);
    setResult(null);
    if (!url.trim()) {
      setError('Please provide an image or page URL');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/imgbb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url.trim() }),
      });
      const json = await res.json();
      setResult(json);
      if (!json.ok) setError(json.error || 'Upload failed');
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">imgbb upload test</h1>
      <p className="text-sm text-gray-600 mb-4">Paste an image URL or an ibb.co page URL and click Upload.</p>

      <div className="flex gap-2 mb-4">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.jpg or https://ibb.co/xxxxx"
          className="flex-1 p-2 border rounded"
        />
        <button onClick={handleUpload} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {error && <div className="mb-4 text-red-600">Error: {error}</div>}

      {result && (
        <div className="space-y-4">
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-72">{JSON.stringify(result, null, 2)}</pre>
          {result.ok && result.url && (
            <div>
              <p className="text-sm text-gray-700 mb-2">Preview:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="uploaded" className="max-w-full rounded border" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
