// Enhanced Cloudflare Worker for DRESS Website
// Handles Printful API integration, CORS, and other backend services

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Configuration
const CONFIG = {
  PRINTFUL_API_BASE: 'https://api.printful.com',
  ALLOWED_ORIGINS: [
    'https://dress-custom-apparel.pages.dev', // Replace with your Pages domain
    'https://dress.example.com', // Replace with your custom domain
    'http://localhost:3000', // For local development
    'http://127.0.0.1:3000'
  ],
  CACHE_TTL: 300, // 5 minutes cache for product data
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW: 60000 // 1 minute
  }
};

// In-memory rate limiting (resets on worker restart)
const rateLimitStore = new Map();

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }

  // Check rate limiting
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return new Response('Rate limit exceeded', { 
      status: 429,
      headers: getCORSHeaders(request)
    });
  }

  // Route API requests
  if (url.pathname.startsWith('/api/')) {
    return handleAPI(request, url);
  }

  // Default: serve static files (handled by Pages)
  return fetch(request);
}

async function handleAPI(request, url) {
  try {
    if (url.pathname.startsWith('/api/printful')) {
      return await handlePrintfulAPI(request, url);
    } else if (url.pathname.startsWith('/api/contact')) {
      return await handleContactForm(request);
    } else if (url.pathname.startsWith('/api/analytics')) {
      return await handleAnalytics(request);
    } else {
      return new Response('API endpoint not found', { 
        status: 404,
        headers: getCORSHeaders(request)
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }
}

// Enhanced Printful API Handler
async function handlePrintfulAPI(request, url) {
  // Check for API key
  const printfulApiKey = PRINTFUL_API_KEY;
  if (!printfulApiKey) {
    return new Response(JSON.stringify({
      error: 'Printful API key not configured',
      code: 'MISSING_API_KEY'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }

  // Parse the endpoint
  let endpoint = url.pathname.replace('/api/printful', '') || '/';
  const queryString = url.search;

  // Map frontend-friendly endpoints to Printful API endpoints
  endpoint = mapPrintfulEndpoint(endpoint, url.searchParams);

  // Build target URL
  const targetUrl = `${CONFIG.PRINTFUL_API_BASE}${endpoint}${queryString}`;

  // Prepare headers for Printful API
  const headers = {
    'Authorization': `Bearer ${printfulApiKey}`,
    'Accept': 'application/json',
    'User-Agent': 'DRESS-Website/1.0'
  };

  // Handle request body for POST/PUT requests
  let body = null;
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.text();
      headers['Content-Type'] = 'application/json';
    }
  }

  try {
    // Check cache for GET requests
    const cacheKey = `printful:${request.method}:${targetUrl}`;
    if (request.method === 'GET') {
      const cached = await getCache(cacheKey);
      if (cached) {
        console.log('Cache hit for:', targetUrl);
        return new Response(cached, {
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            ...getCORSHeaders(request)
          }
        });
      }
    }

    // Make request to Printful API
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { data: responseText };
    }

    // Handle Printful API errors
    if (!response.ok) {
      console.error('Printful API Error:', {
        status: response.status,
        url: targetUrl,
        response: responseData
      });

      return new Response(JSON.stringify({
        error: 'Printful API error',
        status: response.status,
        message: responseData.error || responseData.result || 'Unknown error',
        details: responseData
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders(request)
        }
      });
    }

    // Process successful response
    const processedData = processPrintfulResponse(responseData, endpoint, url.searchParams);

    // Cache successful GET responses
    if (request.method === 'GET' && response.ok) {
      await setCache(cacheKey, JSON.stringify(processedData), CONFIG.CACHE_TTL);
    }

    return new Response(JSON.stringify(processedData), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        ...getCORSHeaders(request)
      }
    });

  } catch (error) {
    console.error('Printful request failed:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to connect to Printful',
      message: error.message,
      code: 'CONNECTION_ERROR'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }
}

// Map frontend endpoints to Printful API endpoints
function mapPrintfulEndpoint(endpoint, searchParams) {
  const category = searchParams.get('category');
  
  // Map product categories to Printful sync products
  if (endpoint === '/products' && category) {
    return '/sync/products';
  }
  
  // Map specific product endpoints
  const endpointMap = {
    '/products': '/sync/products',
    '/store': '/store',
    '/store/products': '/sync/products',
    '/categories': '/categories',
    '/mockups': '/mockup-generator/templates',
    '/orders': '/orders',
    '/shipping': '/shipping/rates'
  };

  return endpointMap[endpoint] || endpoint;
}

// Process Printful API responses for frontend consumption
function processPrintfulResponse(data, endpoint, searchParams) {
  const category = searchParams.get('category');

  // Handle sync products response
  if (endpoint.includes('/sync/products') && data.result) {
    const products = Array.isArray(data.result) ? data.result : [data.result];
    
    // Filter by category if specified
    let filteredProducts = products;
    if (category) {
      filteredProducts = products.filter(product => {
        const productName = product.name?.toLowerCase() || '';
        const productTags = product.tags?.join(' ').toLowerCase() || '';
        return productName.includes(category.toLowerCase()) || 
               productTags.includes(category.toLowerCase());
      });
    }

    // Transform products for frontend
    const transformedProducts = filteredProducts.map(product => ({
      id: product.id,
      name: product.name,
      thumbnail: product.thumbnail_url,
      store_url: product.store_url || generateStoreUrl(product, category),
      product_url: product.store_url,
      price: product.retail_price || product.price,
      currency: product.currency || 'USD',
      tags: product.tags || [],
      category: inferCategory(product.name),
      status: product.status
    }));

    // Return first product URL for direct redirects, or all products for listing
    if (transformedProducts.length === 1) {
      return {
        redirectUrl: transformedProducts[0].store_url,
        product: transformedProducts[0]
      };
    }

    return {
      products: transformedProducts,
      total: transformedProducts.length,
      category: category
    };
  }

  // Handle store info response
  if (endpoint.includes('/store') && data.result) {
    return {
      store_url: data.result.website || data.result.store_url,
      name: data.result.name,
      currency: data.result.currency,
      products_url: `${data.result.website || data.result.store_url}/products`
    };
  }

  // Return raw data for other endpoints
  return data;
}

// Generate store URL if not provided by Printful
function generateStoreUrl(product, category) {
  // This would typically be your Printful store URL
  // Replace with your actual store domain
  const storeBase = 'https://dress-custom-apparel.printful.me';
  const productSlug = product.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product';
  return `${storeBase}/products/${productSlug}`;
}

// Infer category from product name
function inferCategory(productName) {
  const name = productName?.toLowerCase() || '';
  
  if (name.includes('t-shirt') || name.includes('tee')) return 't-shirts';
  if (name.includes('hoodie') || name.includes('sweatshirt')) return 'hoodies';
  if (name.includes('cap') || name.includes('hat') || name.includes('beanie')) return 'caps';
  if (name.includes('mug') || name.includes('bottle') || name.includes('tumbler')) return 'other';
  if (name.includes('bag') || name.includes('tote') || name.includes('backpack')) return 'accessories';
  
  return 'other';
}

// Contact Form Handler
async function handleContactForm(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: getCORSHeaders(request)
    });
  }

  try {
    const formData = await request.json();
    
    // Validate required fields
    const required = ['name', 'email', 'message'];
    for (const field of required) {
      if (!formData[field] || !formData[field].trim()) {
        return new Response(JSON.stringify({
          error: 'Missing required field',
          field: field
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCORSHeaders(request)
          }
        });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCORSHeaders(request)
        }
      });
    }

    // Log the contact form submission
    console.log('Contact form submission:', {
      name: formData.name,
      email: formData.email,
      subject: formData.subject || 'Contact from DRESS website',
      timestamp: new Date().toISOString()
    });

    // Here you could integrate with email services like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Or store in a database

    // For now, just return success
    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to process contact form',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }
}

// Analytics Handler
async function handleAnalytics(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: getCORSHeaders(request)
    });
  }

  try {
    const analyticsData = await request.json();
    
    // Log analytics event
    console.log('Analytics event:', {
      type: analyticsData.type,
      category: analyticsData.category,
      timestamp: analyticsData.timestamp,
      userAgent: request.headers.get('User-Agent'),
      ip: request.headers.get('CF-Connecting-IP'),
      country: request.headers.get('CF-IPCountry')
    });

    // Here you could store analytics data in:
    // - Cloudflare Analytics Engine
    // - Google Analytics
    // - Custom database
    // - Third-party analytics service

    return new Response(JSON.stringify({
      success: true,
      message: 'Analytics event recorded'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to record analytics',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders(request)
      }
    });
  }
}

// CORS Handler
function handleCORS(request) {
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders(request)
  });
}

// Get CORS headers
function getCORSHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : CONFIG.ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true'
  };
}

// Rate Limiting
function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT.WINDOW;

  // Clean old entries
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const filtered = timestamps.filter(t => t > windowStart);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filtered);
    }
  }

  // Check current IP
  const requests = rateLimitStore.get(ip) || [];
  const recentRequests = requests.filter(t => t > windowStart);

  if (recentRequests.length >= CONFIG.RATE_LIMIT.MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(ip, recentRequests);

  return { 
    allowed: true, 
    remaining: CONFIG.RATE_LIMIT.MAX_REQUESTS - recentRequests.length 
  };
}

// Simple in-memory cache (resets on worker restart)
const cache = new Map();

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
  cache.set(key, {
    data,
    expires: Date.now() + (ttl * 1000)
  });
}

// Health Check Endpoint
function handleHealthCheck() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    services: {
      printful: !!PRINTFUL_API_KEY,
      cache: cache.size,
      rateLimit: rateLimitStore.size
    }
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Error Handler
function handleError(error, request) {
  console.error('Worker Error:', error);
  
  return new Response(JSON.stringify({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      ...getCORSHeaders(request)
    }
  });
}