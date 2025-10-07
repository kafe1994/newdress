# DRESS Website - Complete Setup and Deployment Guide

This guide will help you deploy the DRESS website with Printful integration using Cloudflare Pages and Workers.

## 📋 Project Structure

```
dress-printful-project/
├── website/                 # Frontend website files
│   ├── index.html          # Main page
│   ├── terms.html          # Terms & conditions
│   ├── css/
│   │   └── style.css       # Enhanced styles
│   ├── js/
│   │   └── script.js       # Enhanced JavaScript
│   └── images/             # Product images
│       ├── t-shirts/
│       ├── hoodies/
│       ├── caps/
│       ├── accessories/
│       └── other/
└── cloudflare-worker/      # Backend API worker
    ├── worker.js           # Main worker code
    ├── wrangler.toml       # Worker configuration
    ├── package.json        # Dependencies
    └── README.md           # Worker documentation
```

## 🚀 Step-by-Step Deployment

### 1. Prerequisites

- Cloudflare account (free tier works)
- Printful account and API access
- Git repository (GitHub, GitLab, etc.)
- Node.js 16+ installed locally

### 2. Printful Setup

1. **Create Printful Store:**
   - Go to [Printful Dashboard](https://www.printful.com/dashboard)
   - Create a new store or use existing
   - Choose "Manual Order/API" as platform

2. **Get API Access:**
   - Go to Settings → API
   - Generate a new API token
   - Copy the token (you'll need it later)
   - Note your store ID

3. **Add Products:**
   - Create products in your Printful store
   - Organize them by categories (t-shirts, hoodies, caps, etc.)
   - Make sure products are published and available

### 3. Cloudflare Pages Setup (Frontend)

1. **Prepare Repository:**
   ```bash
   # Create a new repository and push the website folder
   git init
   git add website/*
   git commit -m "Initial website setup"
   git remote add origin YOUR_REPOSITORY_URL
   git push -u origin main
   ```

2. **Deploy to Cloudflare Pages:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "Pages"
   - Click "Create a project"
   - Connect your Git provider
   - Select your repository
   - Configure build settings:
     - **Framework preset:** None
     - **Build command:** Leave empty
     - **Build output directory:** `website`
     - **Root directory:** `website`
   - Click "Save and Deploy"

3. **Custom Domain (Optional):**
   - In Pages project settings, go to "Custom domains"
   - Add your domain (e.g., `dress.yourdomain.com`)
   - Follow DNS configuration instructions

### 4. Cloudflare Worker Setup (Backend)

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   wrangler auth login
   ```

2. **Configure Worker:**
   ```bash
   cd cloudflare-worker
   npm install
   
   # Edit wrangler.toml to update:
   # - Worker name (if desired)
   # - Zone ID (if using custom domain)
   # - Routes (if needed)
   ```

3. **Set Secrets:**
   ```bash
   # Set your Printful API key
   wrangler secret put PRINTFUL_API_KEY
   # Enter your Printful API token when prompted
   ```

4. **Deploy Worker:**
   ```bash
   # Deploy to production
   npm run deploy
   
   # Or deploy to staging first
   npm run deploy:staging
   ```

5. **Note Worker URL:**
   - After deployment, note the worker URL (e.g., `https://dress-printful-worker.your-subdomain.workers.dev`)

### 5. Connect Frontend to Backend

1. **Update Website Configuration:**
   - Edit `website/js/script.js`
   - Update the `CONFIG.WORKER_BASE` with your worker URL:
   ```javascript
   const CONFIG = {
     WORKER_BASE: 'https://your-worker-url.workers.dev/api/printful',
     // ... other config
   };
   ```

2. **Update Worker CORS:**
   - Edit `cloudflare-worker/worker.js`
   - Update `CONFIG.ALLOWED_ORIGINS` with your Pages URL:
   ```javascript
   const CONFIG = {
     ALLOWED_ORIGINS: [
       'https://your-pages-project.pages.dev',
       'https://your-custom-domain.com',
       // ... other origins
     ],
     // ... other config
   };
   ```

3. **Redeploy:**
   ```bash
   # Redeploy worker with updated CORS
   cd cloudflare-worker
   npm run deploy
   
   # Commit and push website changes
   cd ../website
   git add .
   git commit -m "Update API configuration"
   git push
   ```

### 6. Pages Custom Routing (Optional)

To route API calls from Pages to Worker:

1. **Create `_routes.json` in website root:**
   ```json
   {
     "version": 1,
     "include": ["/*"],
     "exclude": ["/api/*"]
   }
   ```

2. **Set up Route in Worker:**
   - In Cloudflare Dashboard, go to Workers
   - Click on your worker
   - Go to "Triggers" → "Routes"
   - Add route: `your-domain.com/api/*`
   - Select your zone

## 🧪 Testing the Integration

### 1. Test Website Loading
- Visit your Pages URL
- Check that all styles and scripts load
- Verify mobile menu works
- Test smooth scrolling

### 2. Test Printful Integration
- Click on product category buttons
- Check browser console for API calls
- Verify redirects to Printful store
- Test fallback behavior

### 3. Test Contact Form
- Fill out and submit contact form
- Check for success message
- Verify email format validation

### 4. Test API Endpoints

```bash
# Test direct API calls
curl "https://your-worker-url.workers.dev/api/printful/products"
curl "https://your-worker-url.workers.dev/api/printful/store"

# Test with category filter
curl "https://your-worker-url.workers.dev/api/printful/products?category=t-shirts"
```

## 🔧 Configuration Options

### Website Configuration (js/script.js)

```javascript
const CONFIG = {
  // Worker endpoint
  WORKER_BASE: 'https://your-worker.workers.dev/api/printful',
  
  // Fallback store paths
  STORE_PATHS: {
    't-shirts': '/products/t-shirts',
    'hoodies': '/products/hoodies',
    'caps': '/products/caps',
    'accessories': '/products/accessories',
    'other': '/products/custom-mugs'
  },
  
  // Animation settings
  SLIDE_INTERVAL: 6000,
  INTERSECTION_THRESHOLD: 0.1,
  
  // API settings
  REQUEST_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};
```

### Worker Configuration (worker.js)

```javascript
const CONFIG = {
  PRINTFUL_API_BASE: 'https://api.printful.com',
  ALLOWED_ORIGINS: [
    'https://your-site.pages.dev',
    'https://your-domain.com'
  ],
  CACHE_TTL: 300,
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW: 60000
  }
};
```

## 🎨 Customization

### 1. Styling
- Edit `css/style.css` for visual changes
- Modify CSS variables for color scheme:
```css
:root {
  --primary-orange: #ff6b35;  /* Your brand color */
  --primary-black: #1a1a1a;   /* Text color */
  /* ... other variables */
}
```

### 2. Content
- Update `index.html` for content changes
- Modify contact information
- Update product descriptions
- Add/remove sections as needed

### 3. Product Images
- Replace placeholder images in `images/*/mockup.jpg`
- Use high-quality product mockups
- Optimize images for web (WebP format recommended)

### 4. Functionality
- Modify `js/script.js` for behavior changes
- Add new product categories
- Implement additional features

## 📊 Analytics & Monitoring

### 1. Cloudflare Analytics
- Available in Cloudflare Dashboard
- Pages analytics under "Analytics & Logs"
- Worker analytics under "Workers" → "Analytics"

### 2. Google Analytics (Optional)
- Add Google Analytics tracking code to `index.html`
- Events are already tracked in JavaScript

### 3. Error Monitoring
- Check Cloudflare Dashboard for errors
- Use `wrangler tail` for real-time worker logs:
```bash
cd cloudflare-worker
npm run tail
```

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Verify ALLOWED_ORIGINS in worker.js
   - Check that your domain is included
   - Redeploy worker after changes

2. **API Not Working:**
   - Verify PRINTFUL_API_KEY is set correctly
   - Check API key permissions in Printful
   - Test API endpoints directly

3. **Redirects Not Working:**
   - Verify Printful store is published
   - Check product availability
   - Test fallback URLs

4. **Styles Not Loading:**
   - Check file paths in HTML
   - Verify Pages deployment completed
   - Clear browser cache

### Debug Commands

```bash
# Check worker deployment
wrangler status

# View worker logs
wrangler tail

# Test worker locally
wrangler dev

# Check Pages deployment
# (Use Cloudflare Dashboard)
```

## 🔐 Security Best Practices

1. **API Keys:**
   - Never commit API keys to Git
   - Use Cloudflare secrets for sensitive data
   - Rotate keys regularly

2. **CORS:**
   - Only allow necessary origins
   - Don't use wildcard (*) in production

3. **Rate Limiting:**
   - Monitor API usage
   - Adjust limits as needed
   - Implement user-based limiting if needed

4. **Input Validation:**
   - Validate all user inputs
   - Sanitize data before processing
   - Use HTTPS everywhere

## 📈 Performance Optimization

1. **Caching:**
   - Worker caches API responses for 5 minutes
   - Adjust CACHE_TTL as needed
   - Use Cloudflare Page Rules for static assets

2. **Images:**
   - Use Cloudflare Image Optimization
   - Implement lazy loading
   - Use appropriate image formats (WebP)

3. **Code:**
   - Minify CSS and JavaScript for production
   - Use Cloudflare Auto Minify
   - Enable compression

## 🆘 Support

If you encounter issues:

1. Check this documentation first
2. Review Cloudflare logs and analytics
3. Test individual components
4. Verify API credentials and permissions
5. Contact Alejandro Liendo at liendoalejandro94@gmail.com

## 📝 Maintenance

### Regular Tasks

1. **Monitor API Usage:**
   - Check Printful API limits
   - Monitor Cloudflare metrics

2. **Update Dependencies:**
   ```bash
   cd cloudflare-worker
   npm update
   npm audit
   ```

3. **Backup Configuration:**
   - Keep wrangler.toml in version control
   - Document any manual configurations

4. **Security Updates:**
   - Monitor Cloudflare security advisories
   - Update worker runtime when available

Now your DRESS website should be fully operational with Printful integration! 🎉