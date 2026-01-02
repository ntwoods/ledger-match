/**
 * JSONP helper (bypasses CORS for Google Apps Script web apps).
 * Usage: jsonp(url, { action: 'getUpcoming', token: '...' })
 */
export function jsonp(baseUrl, params = {}) {
  return new Promise((resolve, reject) => {
    const cbName = "__jsonp_cb_" + Math.random().toString(36).slice(2);
    const timeoutMs = 30000;

    const url = new URL(baseUrl);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
    url.searchParams.set("callback", cbName);

    const script = document.createElement("script");
    let t;

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };

    function cleanup() {
      if (t) clearTimeout(t);
      delete window[cbName];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error("Network/JSONP error"));
    };

    t = setTimeout(() => {
      cleanup();
      reject(new Error("Request timeout"));
    }, timeoutMs);

    script.src = url.toString();
    document.body.appendChild(script);
  });
}
