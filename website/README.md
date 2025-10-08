# Dress - Premium Custom Apparel Website

A modern, responsive website for custom apparel built to work seamlessly with Printful API through Cloudflare Worker.

## 🎯 Features

### ✨ Core Functionality
- **Full English Interface** - Complete translation from Spanish
- **Printful Integration** - Works perfectly with your Cloudflare Worker
- **Category Filtering** - T-shirts, Hoodies, Caps, Accessories, Other
- **Dynamic Product Loading** - Real-time product data from Printful API
- **Responsive Design** - Mobile-first, modern UI/UX
- **Contact Form** - Integrated with your contact API endpoint

### 🛍️ E-commerce Features
- **Product Categories** - Visual category browsing with hover effects
- **Product Cards** - Rich product display with pricing and images
- **Quick View** - Modal popup for product details
- **Favorites System** - Save products to favorites (localStorage)
- **Direct Store Links** - Seamless redirect to Printful store pages

### 🎨 UI/UX Enhancements
- **Dark/Light Theme** - Toggle between themes
- **Smooth Animations** - CSS transitions and scroll reveals
- **Loading States** - Skeleton loading and error handling
- **Notifications** - Toast notifications for user feedback
- **Mobile Menu** - Hamburger navigation for mobile devices

### 📱 Technical Features
- **Performance Optimized** - Lazy loading, caching, throttling
- **SEO Friendly** - Proper meta tags and semantic HTML
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- **Analytics Ready** - Event tracking integration
- **Cache Management** - Smart caching for API responses

## 🏗️ Architecture

### File Structure
```
dress-website-new/
├── index.html                 # Main homepage
├── terms.html                 # Terms & conditions page
├── css/
│   ├── style.css             # Main stylesheet
│   └── enhanced-style.css    # Additional UI enhancements
├── js/
│   ├── app.js                # Core application logic
│   └── products.js           # Product-specific functionality
└── images/
    ├── t-shirts/             # T-shirt category images
    ├── hoodies/              # Hoodie category images
    ├── caps/                 # Cap category images
    ├── accessories/          # Accessory category images
    └── other/                # Other product images
```

### API Integration

The website is designed to work with your existing Cloudflare Worker endpoints:

#### Product Loading
```javascript
// GET /api/printful/products
// Loads all products and displays them by category
```

#### Category Filtering
```javascript
// GET /api/printful/products?category=t-shirts
// Filters products by specific category
```

#### Contact Form
```javascript
// POST /api/contact
// Submits contact form data
```

#### Analytics
```javascript
// POST /api/analytics
// Tracks user interactions and events
```

## 🚀 Setup Instructions

### 1. Deploy Files
Upload all files to your web hosting or Cloudflare Pages:
- Maintain the folder structure
- Ensure all CSS and JS files are accessible
- Upload category images to respective folders

### 2. Configure API Endpoints
The website is pre-configured to work with your existing worker endpoints:
- `/api/printful/products` - Product data
- `/api/contact` - Contact form submission
- `/api/analytics` - Event tracking

### 3. Update Configuration (Optional)
In `js/app.js`, you can modify the configuration:

```javascript
const DRESS_CONFIG = {
    API: {
        BASE_URL: '/api/printful',    // Your worker base URL
        TIMEOUT: 15000,               // API timeout
        RETRY_ATTEMPTS: 3             // Retry attempts
    },
    // ... other settings
};
```

### 4. Customize Content
- **Logo/Branding**: Update the logo text in navigation
- **Contact Info**: Modify contact details in footer and contact section
- **Social Links**: Add your social media URLs
- **Images**: Replace category images with your own

## 🔧 Customization

### Theme Colors
Modify CSS variables in `css/style.css`:

```css
:root {
    --primary-orange: #ff6b35;    /* Brand color */
    --accent-gold: #d4af37;       /* Accent color */
    --primary-black: #1a1a1a;     /* Text color */
    /* ... other variables */
}
```

### Category Configuration
Add or modify categories in `js/app.js`:

```javascript
CATEGORIES: {
    'all': 'All Products',
    't-shirts': 'T-Shirts',
    'hoodies': 'Hoodies',
    'caps': 'Caps',
    'accessories': 'Accessories',
    'custom-category': 'Custom Category'  // Add new categories
}
```

## 📊 Analytics & Tracking

The website includes built-in analytics tracking for:
- Page views
- Product clicks
- Category filtering
- Contact form submissions
- Search queries
- Favorite actions

Events are automatically sent to your `/api/analytics` endpoint.

## 🎨 Design Features

### Responsive Breakpoints
- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: 320px - 767px

### Animation System
- CSS-based animations with fallbacks
- Intersection Observer for scroll reveals
- Reduced motion support for accessibility

### Loading States
- Skeleton loading for products
- Spinner animations
- Error state handling
- Empty state messaging

## 🔒 Security Features

- **XSS Protection**: HTML escaping for user content
- **CSRF Protection**: Form validation and sanitization
- **Rate Limiting**: Relies on your worker's rate limiting
- **Secure Headers**: Recommend adding security headers

## 🌟 Performance Optimizations

- **Lazy Loading**: Images and content load on demand
- **Caching**: Smart API response caching
- **Minification**: Optimized CSS and JS (recommended for production)
- **CDN Integration**: Works seamlessly with Cloudflare CDN

## 🛠️ Troubleshooting

### Common Issues

1. **Products not loading**
   - Check worker endpoint configuration
   - Verify API key is set in worker environment
   - Check browser console for errors

2. **Images not displaying**
   - Ensure image files are uploaded to correct folders
   - Check image paths in product data
   - Verify image URLs are accessible

3. **Contact form not working**
   - Verify `/api/contact` endpoint is functional
   - Check form validation in browser console

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('dress_debug', 'true');
```

## 📱 Mobile Optimization

- Touch-friendly interface
- Optimized tap targets
- Swipe gestures support
- Mobile-specific layouts
- Performance optimized for mobile

## 🔄 Future Enhancements

Planned features for future versions:
- Shopping cart functionality
- User accounts and authentication
- Advanced search and filtering
- Product reviews and ratings
- Wishlist management
- Multi-language support

## 📞 Support

For technical support or customization requests:
- Create detailed bug reports with console logs
- Include browser and device information
- Test on multiple devices before reporting issues

---

**Made with ❤️ for Dress Custom Apparel**

*This website is optimized for modern browsers and follows web accessibility guidelines.*