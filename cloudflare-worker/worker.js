// worker-enhanced.js — DRESS Cloudflare Worker (Enhanced for Complete Product Variants)
// Expects PRINTFUL_API_KEY as a secret (env.PRINTFUL_API_KEY)

const CONFIG = {
  PRINTFUL_API_BASE: 'https://api.printful.com',
  ALLOWED_ORIGINS: [
    'https://newdress-cgz.pages.dev',    // your Pages domain
    'https://dress-custom-apparel.pages.dev',
    'https://dress.example.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  CACHE_TTL: 600, // 10 minutes for product data
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW: 60_000 // 1 minute in ms
  },
  // Enhanced product fetching settings
  PRODUCT_SETTINGS: {
    INCLUDE_VARIANTS: true,
    INCLUDE_MOCKUPS: true,
    MAX_CONCURRENT_REQUESTS: 5,
    VARIANT_TIMEOUT: 10000
  }
};

// In-memory stores (per-worker-instance)
const rateLimitStore = new Map();
const cache = new Map();

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Preflight CORS
      if (request.method === 'OPTIONS') {
        return handleCORS(request);
      }

      // Health check
      if (url.pathname === '/api/health' || url.pathname === '/health') {
        return handleHealthCheck(request, env);
      }

      // Rate limiting
      const rateLimitResult = checkRateLimit(request);
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: jsonCORSHeaders(request)
        });
      }

      // API routing
      if (url.pathname.startsWith('/api/')) {
        return await handleAPI(request, url, env);
      }

      // Default: let Pages/static origin handle it
      return fetch(request);
    } catch (err) {
      return handleError(err, request);
    }
  }
};

// ---------- Routing & handlers ----------
async function handleAPI(request, url, env) {
  try {
    if (url.pathname.startsWith('/api/printful')) {
      return await handlePrintfulAPI(request, url, env);
    } else if (url.pathname.startsWith('/api/contact')) {
      return await handleContactForm(request);
    } else if (url.pathname.startsWith('/api/analytics')) {
      return await handleAnalytics(request);
    } else {
      return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
        status: 404,
        headers: jsonCORSHeaders(request)
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error?.message || String(error)
    }), {
      status: 500,
      headers: jsonCORSHeaders(request)
    });
  }
}

// ---------- Enhanced Printful proxy & processing ----------
async function handlePrintfulAPI(request, url, env) {
  const printfulApiKey = env?.PRINTFUL_API_KEY;
  if (!printfulApiKey) {
    return new Response(JSON.stringify({
      error: 'Printful API key not configured',
      code: 'MISSING_API_KEY'
    }), {
      status: 500,
      headers: jsonCORSHeaders(request)
    });
  }

  // Build target endpoint and query
  let endpoint = url.pathname.replace('/api/printful', '') || '/';
  endpoint = mapPrintfulEndpoint(endpoint, url.searchParams);
  const queryString = url.search || '';
  const targetUrl = `${CONFIG.PRINTFUL_API_BASE}${endpoint}${queryString}`;

  // Cache logic for GET
  const cacheKey = `printful:${request.method}:${targetUrl}`;
  if (request.method === 'GET') {
    const cached = await getCache(cacheKey);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          ...corsHeadersForRequest(request)
        }
      });
    }
  }

  // Prepare headers
  const headers = {
    'Authorization': `Bearer ${printfulApiKey}`,
    'Accept': 'application/json'
  };

  // Attach body for non-GET
  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.text();
      headers['Content-Type'] = 'application/json';
    } else {
      body = await request.arrayBuffer();
    }
  }

  // Fetch from Printful
  try {
    const resp = await fetch(targetUrl, {
      method: request.method,
      headers,
      body
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      return new Response(JSON.stringify({
        error: 'Printful API error',
        status: resp.status,
        details: data
      }), {
        status: resp.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeadersForRequest(request)
        }
      });
    }

    // Enhanced processing with variants
    const processed = await processPrintfulResponseEnhanced(data, endpoint, url.searchParams, headers, printfulApiKey);

    // cache GET successful responses
    if (request.method === 'GET') {
      await setCache(cacheKey, JSON.stringify(processed), CONFIG.CACHE_TTL);
    }

    return new Response(JSON.stringify(processed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        ...corsHeadersForRequest(request)
      }
    });
  } catch (err) {
    console.error('Printful request failed:', err);
    return new Response(JSON.stringify({
      error: 'Failed to connect to Printful',
      message: err?.message || String(err)
    }), {
      status: 503,
      headers: jsonCORSHeaders(request)
    });
  }
}

// ---------- Enhanced Processing with Complete Variant Information ----------
async function processPrintfulResponseEnhanced(data, endpoint, searchParams, headers, apiKey) {
  const category = searchParams.get('category');
  const includeVariants = searchParams.get('variants') !== 'false';

  // Enhanced sync products format with complete variant data
  if ((endpoint.includes('/sync/products') || endpoint.includes('/sync/products/')) && data.result) {
    const productsArray = Array.isArray(data.result) ? data.result : data.result.resources ? data.result.resources : data.result;
    const products = Array.isArray(productsArray) ? productsArray : [productsArray];

    let filtered = products;
    if (category) {
      filtered = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const tags = (p.tags || []).join(' ').toLowerCase();
        return name.includes(category.toLowerCase()) || tags.includes(category.toLowerCase());
      });
    }

    // Enhanced transformation with variants
    const transformedProducts = [];
    
    if (includeVariants && CONFIG.PRODUCT_SETTINGS.INCLUDE_VARIANTS) {
      // Fetch detailed variant information for each product
      const productPromises = filtered.slice(0, 20).map(async (product) => { // Limit to 20 products to avoid timeout
        try {
          const productDetails = await fetchProductVariants(product.id, headers, apiKey);
          return await transformProductWithVariants(product, productDetails);
        } catch (error) {
          console.warn(`Failed to fetch variants for product ${product.id}:`, error);
          return transformBasicProduct(product);
        }
      });
      
      const results = await Promise.allSettled(productPromises);
      
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          transformedProducts.push(result.value);
        }
      });
    } else {
      // Basic transformation without variants
      transformedProducts.push(...filtered.map(transformBasicProduct));
    }

    if (transformedProducts.length === 1) {
      return { 
        redirectUrl: transformedProducts[0].store_url, 
        product: transformedProducts[0],
        hasVariants: transformedProducts[0].variants?.length > 0
      };
    }

    return { 
      products: transformedProducts, 
      total: transformedProducts.length, 
      category,
      hasVariants: transformedProducts.some(p => p.variants?.length > 0)
    };
  }

  // store info
  if (endpoint.includes('/store') && data.result) {
    return {
      store_url: data.result.website || data.result.store_url,
      name: data.result.name,
      currency: data.result.currency,
      products_url: `${data.result.website || data.result.store_url}/products`
    };
  }

  // fallback: return raw data
  return data;
}

// Fetch detailed product variants from Printful API
async function fetchProductVariants(productId, headers, apiKey) {
  try {
    const variantResponse = await fetch(`${CONFIG.PRINTFUL_API_BASE}/sync/products/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      timeout: CONFIG.PRODUCT_SETTINGS.VARIANT_TIMEOUT
    });
    
    if (!variantResponse.ok) {
      throw new Error(`Failed to fetch variants for product ${productId}`);
    }
    
    const variantData = await variantResponse.json();
    return variantData.result || {};
  } catch (error) {
    console.warn(`Error fetching variants for product ${productId}:`, error);
    return null;
  }
}

// Transform product with complete variant information
async function transformProductWithVariants(product, productDetails) {
  const baseProduct = transformBasicProduct(product);
  
  if (!productDetails || !productDetails.sync_variants) {
    return baseProduct;
  }
  
  // Process variants with complete information
  const variants = productDetails.sync_variants.map(variant => ({
    id: variant.id,
    external_id: variant.external_id,
    sync_product_id: variant.sync_product_id,
    name: variant.name,
    synced: variant.synced,
    variant_id: variant.variant_id,
    retail_price: variant.retail_price,
    currency: variant.currency,
    is_ignored: variant.is_ignored,
    sku: variant.sku,
    
    // Product variant details
    product: variant.product ? {
      variant_id: variant.product.variant_id,
      product_id: variant.product.product_id,
      image: variant.product.image,
      name: variant.product.name
    } : null,
    
    // Files (mockup images)
    files: variant.files ? variant.files.map(file => ({
      id: file.id,
      type: file.type,
      hash: file.hash,
      url: file.url,
      filename: file.filename,
      mime_type: file.mime_type,
      size: file.size,
      width: file.width,
      height: file.height,
      x: file.x,
      y: file.y,
      scale: file.scale,
      visible: file.visible,
      is_default: file.is_default
    })) : [],
    
    // Options (size, color, etc.)
    options: variant.options || []
  }));
  
  // Extract unique colors and sizes
  const colors = extractUniqueOptions(variants, 'color');
  const sizes = extractUniqueOptions(variants, 'size');
  
  // Find main product image
  const mainImage = findMainProductImage(variants);
  
  return {
    ...baseProduct,
    variants,
    variant_count: variants.length,
    colors,
    sizes,
    main_image: mainImage,
    has_variants: variants.length > 0,
    sync_product: productDetails.sync_product || null
  };
}

// Transform basic product without variants
function transformBasicProduct(product) {
  return {
    id: product.id,
    name: product.name,
    thumbnail: product.thumbnail_url || product.image_url || null,
    store_url: product.store_url || generateStoreUrl(product),
    product_url: product.store_url || null,
    price: product.retail_price || product.price || null,
    currency: product.currency || 'USD',
    tags: product.tags || [],
    category: inferCategory(product.name),
    status: product.status,
    variants: [],
    has_variants: false
  };
}

// Extract unique color/size options from variants
function extractUniqueOptions(variants, optionType) {
  const options = new Set();
  
  variants.forEach(variant => {
    if (variant.options) {
      variant.options.forEach(option => {
        if (option.id?.toLowerCase().includes(optionType)) {
          options.add({
            id: option.id,
            value: option.value,
            display_value: option.display_value || option.value
          });
        }
      });
    }
  });
  
  return Array.from(options);
}

// Find the main/default product image from variants
function findMainProductImage(variants) {
  for (const variant of variants) {
    if (variant.files && variant.files.length > 0) {
      const defaultFile = variant.files.find(file => file.is_default);
      if (defaultFile) {
        return defaultFile.url;
      }
      // Fallback to first file
      return variant.files[0].url;
    }
    
    if (variant.product?.image) {
      return variant.product.image;
    }
  }
  
  return null;
}

// ---------- Helper functions (same as before) ----------
function mapPrintfulEndpoint(endpoint, searchParams) {
  const category = searchParams.get('category');

  const endpointMap = {
    '/products': '/sync/products',
    '/store': '/store',
    '/store/products': '/sync/products',
    '/categories': '/categories',
    '/mockups': '/mockup-generator/templates',
    '/orders': '/orders',
    '/shipping': '/shipping/rates'
  };

  // If /products + category, map to sync/products
  if (endpoint === '/products' && category) return '/sync/products';
  return endpointMap[endpoint] || endpoint;
}

function generateStoreUrl(product) {
  const storeBase = 'https://dress-custom-apparel.printful.me';
  const productSlug = (product.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${storeBase}/products/${productSlug}`;
}

function inferCategory(productName = '') {
  const name = productName.toLowerCase();
  if (name.includes('t-shirt') || name.includes('tee')) return 't-shirts';
  if (name.includes('hoodie') || name.includes('sweatshirt')) return 'hoodies';
  if (name.includes('cap') || name.includes('hat') || name.includes('beanie')) return 'caps';
  if (name.includes('mug') || name.includes('bottle') || name.includes('tumbler')) return 'other';
  if (name.includes('bag') || name.includes('tote') || name.includes('backpack')) return 'accessories';
  return 'other';
}

// ---------- Contact & Analytics (same as before) ----------
async function handleContactForm(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonCORSHeaders(request) });
  }

  try {
    const body = await request.json();
    const required = ['name', 'email', 'message'];
    for (const f of required) {
      if (!body[f] || !String(body[f]).trim()) {
        return new Response(JSON.stringify({ error: 'Missing required field', field: f }), { status: 400, headers: jsonCORSHeaders(request) });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: jsonCORSHeaders(request) });
    }

    console.log('Contact submission:', { name: body.name, email: body.email, subject: body.subject || '', ts: new Date().toISOString() });

    return new Response(JSON.stringify({ success: true, message: "Thank you! We'll get back to you soon." }), { headers: jsonCORSHeaders(request) });
  } catch (err) {
    console.error('Contact error:', err);
    return new Response(JSON.stringify({ error: 'Failed to process contact form', message: err?.message || String(err) }), { status: 500, headers: jsonCORSHeaders(request) });
  }
}

async function handleAnalytics(request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonCORSHeaders(request) });
  }

  try {
    const data = await request.json();
    console.log('Analytics event:', { type: data.type, category: data.category, ts: data.timestamp || Date.now(), ua: request.headers.get('User-Agent') });
    return new Response(JSON.stringify({ success: true, message: 'Recorded' }), { headers: jsonCORSHeaders(request) });
  } catch (err) {
    console.error('Analytics error:', err);
    return new Response(JSON.stringify({ error: 'Failed to record analytics', message: err?.message || String(err) }), { status: 500, headers: jsonCORSHeaders(request) });
  }
}

// ---------- CORS (same as before) ----------
function handleCORS(request) {
  return new Response(null, { status: 204, headers: corsHeadersForRequest(request) });
}

function corsHeadersForRequest(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : CONFIG.ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

function jsonCORSHeaders(request) {
  return { 'Content-Type': 'application/json', ...corsHeadersForRequest(request) };
}

// ---------- Rate limiting (same as before) ----------
function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT.WINDOW;

  // clean up old timestamps
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const filtered = timestamps.filter(t => t > windowStart);
    if (filtered.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, filtered);
  }

  const requests = rateLimitStore.get(ip) || [];
  const recent = requests.filter(t => t > windowStart);

  if (recent.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS) return { allowed: false, remaining: 0 };

  recent.push(now);
  rateLimitStore.set(ip, recent);

  return { allowed: true, remaining: CONFIG.RATE_LIMIT.MAX_REQUESTS - recent.length };
}

// ---------- Simple in-memory cache (same as before) ----------
async function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

async function setCache(key, data, ttl) {
  cache.set(key, { data, expires: Date.now() + ttl * 1000 });
}

// ---------- Health & errors (same as before) ----------
function handleHealthCheck(request, env) {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.1.0-enhanced',
    services: {
      printful_configured: !!env?.PRINTFUL_API_KEY,
      cache_items: cache.size,
      rate_limit_keys: rateLimitStore.size,
      variant_support: CONFIG.PRODUCT_SETTINGS.INCLUDE_VARIANTS
    }
  }), {
    headers: jsonCORSHeaders(request)
  });
}

function handleError(error, request) {
  console.error('Worker Error:', error);
  return new Response(JSON.stringify({
    error: 'Internal Server Error',
    message: error?.message || String(error),
    timestamp: new Date().toISOString()
  }), {
    status: 500,
    headers: jsonCORSHeaders(request)
  });
}