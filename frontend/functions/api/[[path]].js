export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Resolve the target backend URL
  const backendUrl = env.VITE_API_URL || 'http://80.225.196.106:8080';
  
  // Log request proxying (viewable in Cloudflare Pages logs)
  console.log(`[Proxy] Routing ${request.method} ${url.pathname}${url.search} -> ${backendUrl}`);
  
  // Construct the destination URL
  const targetUrl = `${backendUrl}${url.pathname}${url.search}`;
  
  // Clone request headers and strip host to avoid host-routing issues on the target server
  const newHeaders = new Headers(request.headers);
  newHeaders.delete('host');
  
  const init = {
    method: request.method,
    headers: newHeaders,
    redirect: 'manual'
  };
  
  // Body is not allowed for GET and HEAD requests in fetch
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }
  
  const newRequest = new Request(targetUrl, init);
  
  try {
    const response = await fetch(newRequest);
    return response;
  } catch (error) {
    console.error(`[Proxy Error] Failed to fetch from backend: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: 'Backend Gateway Error', 
      details: error.message 
    }), { 
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
