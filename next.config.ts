import type { NextConfig } from "next";

// The proxy (src/proxy.ts) buffers request bodies before route handlers see them,
// capped by `proxyClientMaxBodySize` (default 10MB). If that cap is at or below our
// own upload size limit, oversized uploads get silently truncated by the proxy and
// crash formData() parsing in src/app/api/upload/route.ts with a 500 instead of the
// clean 413 that route is supposed to return. Keep this above MAX_UPLOAD_BYTES (plus
// multipart overhead) so the full body always reaches the route handler.
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 10_485_760);

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: maxUploadBytes + 5_242_880,
  },
};

export default nextConfig;
