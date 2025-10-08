export async function onRequest(context) {
  const workerBase = 'https://dress-printful-worker-production.liendoalejandro94.workers.dev';
  const reqUrl = new URL(context.request.url);
  const pathAndSearch = reqUrl.pathname + reqUrl.search;

  const workerUrl = workerBase + pathAndSearch;

  const init = {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
    redirect: 'follow',
  };

  const res = await fetch(workerUrl, init);
  const body = await res.arrayBuffer();

  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', 'https://newdress-cgz.pages.dev');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  return new Response(body, {
    status: res.status,
    headers,
  });
}