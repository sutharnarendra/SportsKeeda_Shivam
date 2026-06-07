export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Check if the request is destined for the backend API or actuator
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/actuator/')) {
      const backendUrl = new URL(request.url);
      backendUrl.protocol = 'http:';
      backendUrl.hostname = '80.225.196.106.nip.io';
      backendUrl.port = '8080';
      
      // Clone the request to preserve headers/body (crucial for POST/PUT)
      const newRequest = new Request(backendUrl.toString(), request.clone());
      
      try {
        return await fetch(newRequest);
      } catch (err) {
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch from VM backend', 
          details: err.message 
        }), {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // Serve static frontend assets for all other paths
    return env.ASSETS.fetch(request);
  }
}
