# Cloudflare Worker for DRESS Website

This Cloudflare Worker handles:
- Printful API integration
- CORS handling
- Contact form processing
- Analytics collection
- Rate limiting
- Caching

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your Printful API key:
```bash
wrangler secret put PRINTFUL_API_KEY
# Enter your Printful API key when prompted
```

3. Update the configuration in `wrangler.toml`:
- Set your zone_id if using custom domains
- Configure routes if needed

4. Deploy to Cloudflare:
```bash
npm run deploy
```

## Development

Run locally:
```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

## API Endpoints

### Printful Integration
- `GET /api/printful/products?category={category}` - Get products by category
- `GET /api/printful/store` - Get store information
- All other Printful API endpoints are proxied through `/api/printful/*`

### Contact Form
- `POST /api/contact` - Submit contact form

### Analytics
- `POST /api/analytics` - Submit analytics events

## Configuration

Update the `CONFIG` object in `worker.js`:
- `ALLOWED_ORIGINS`: Add your domain(s)
- `CACHE_TTL`: Adjust cache duration
- `RATE_LIMIT`: Configure rate limiting

## Security

- CORS is configured for specific origins
- Rate limiting is enabled
- API keys are stored as secrets
- Input validation is performed

## Monitoring

Use Cloudflare Dashboard or:
```bash
npm run tail
```

## Environment Variables

Required secrets (set with `wrangler secret put`):
- `PRINTFUL_API_KEY`: Your Printful API key

Optional environment variables:
- `ENVIRONMENT`: production, staging, or development