export async function onRequest(context) {
  const { request, env } = context;

  // Fallback to the Ampere IP if not dynamically set in Pages Environment Variables yet
  const backendIp = env.BACKEND_IP || "92.4.92.195";

  const url = new URL(request.url);
  // Forward the request to port 8080 of the active backend VM
  const backendUrl = `http://${backendIp}:8080${url.pathname}${url.search}`;

  // Forward the request exactly as received (headers, body, method)
  return fetch(new Request(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual'
  }));
}
