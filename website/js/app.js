/**
 * DRESS - Premium Custom Apparel Website
 * Main Application JavaScript
 * Version: 2.0 - Optimized for Printful Worker Integration
 */

// ===== GLOBAL CONFIGURATION =====
const DRESS_CONFIG = {
    // API Configuration - Works with your Cloudflare Worker
    API: {
        BASE_URL: '/api/printful',
        ENDPOINTS: {
            PRODUCTS: '/products',
            STORE: '/store',
            CONTACT: '/api/contact',
            ANALYTICS: '/api/analytics'
        },
        TIMEOUT: 15000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    // Product Categories (matches your worker's category mapping)
    CATEGORIES: {
        'all': 'All Products',
        't-shirts': 'T-Shirts',
        'hoodies': 'Hoodies', 
        'caps': 'Caps',
        'accessories': 'Accessories',
        'other': 'Other Products'
    },
    
    // UI Configuration
    UI: {
        SLIDE_INTERVAL: 6000,
        ANIMATION_DELAY: 100,
        NOTIFICATION_DURATION: 4000,
        INTERSECTION_THRESHOLD: 0.1
    },
    
    // Cache settings
    CACHE: {
        PRODUCTS_TTL: 5 * 60 * 1000, // 5 minutes
        ENABLE_CACHE: true
    }
};

// ===== GLOBAL STATE =====
const AppState = {
    currentFilter: 'all',
    products: null,
    favorites: JSON.parse(localStorage.getItem('dress_favorites')) || [],
    cart: JSON.parse(localStorage.getItem('dress_cart')) || [],
    currentSlide: 0,
    isLoading: false,
    cache: new Map()
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 DRESS Website - Enhanced Version Initializing...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Initialize core components
        setupEventListeners();
        initializeSlider();
        initializeTheme();
        initializeAnimations();
        
        // Load initial data
        await loadProducts();
        
        // Setup UI state
        updateCartDisplay();
        updateFavoritesDisplay();
        
        // Analytics
        trackEvent('page_view', { page: 'home' });
        
        console.log('✅ DRESS Website - Initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Failed to initialize website. Please refresh the page.', 'error');
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navigation
    setupNavigationEvents();
    
    // Contact form
    setupContactForm();
    
    // Window events
    window.addEventListener('scroll', throttle(handleScroll, 16));
    window.addEventListener('resize', throttle(handleResize, 250));
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);
    
    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Cart button
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', toggleCart);
    }
}

function setupNavigationEvents() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', toggleMobileMenu);
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
        
        // Close mobile menu when clicking nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(link.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                closeMobileMenu();
            });
        });
    }
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
}

function closeMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== SLIDER FUNCTIONALITY =====
function initializeSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length === 0) return;
    
    showSlide(0);
    startSlideAutoplay();
}

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (!slides.length) return;
    
    // Remove active classes
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Add active class to current slide
    if (slides[index]) {
        slides[index].classList.add('active');
    }
    
    if (dots[index]) {
        dots[index].classList.add('active');
    }
    
    // Move slider
    const slider = document.querySelector('.slider');
    if (slider) {
        slider.style.transform = `translateX(-${index * 100}%)`;
    }
    
    AppState.currentSlide = index;
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    
    if (!totalSlides) return;
    
    let newIndex = AppState.currentSlide + direction;
    if (newIndex >= totalSlides) newIndex = 0;
    else if (newIndex < 0) newIndex = totalSlides - 1;
    
    showSlide(newIndex);
}

function currentSlide(index) {
    showSlide(index - 1);
}

function startSlideAutoplay() {
    setInterval(() => {
        if (!document.hidden) {
            changeSlide(1);
        }
    }, DRESS_CONFIG.UI.SLIDE_INTERVAL);
}

// ===== PRODUCTS FUNCTIONALITY =====
async function loadProducts(forceRefresh = false) {
    if (AppState.isLoading) return;
    
    const cacheKey = 'products_all';
    
    // Check cache first
    if (!forceRefresh && DRESS_CONFIG.CACHE.ENABLE_CACHE) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            AppState.products = cached;
            displayProducts(cached);
            return;
        }
    }
    
    try {
        AppState.isLoading = true;
        showLoadingState();
        
        const products = await apiCall(DRESS_CONFIG.API.ENDPOINTS.PRODUCTS);
        
        // Cache the results
        if (DRESS_CONFIG.CACHE.ENABLE_CACHE) {
            setCachedData(cacheKey, products);
        }
        
        AppState.products = products;
        displayProducts(products);
        
        // Track analytics
        trackEvent('products_loaded', { count: products?.length || 0 });
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showErrorState(error.message);
        trackEvent('products_error', { error: error.message });
    } finally {
        AppState.isLoading = false;
        hideLoadingState();
    }
}

function displayProducts(data) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    hideLoadingState();
    hideErrorState();
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
        showEmptyState();
        return;
    }
    
    // Handle different response formats from your worker
    let products = [];
    
    if (Array.isArray(data)) {
        products = data;
    } else if (data.products && Array.isArray(data.products)) {
        products = data.products;
    } else if (data.result && Array.isArray(data.result)) {
        products = data.result;
    }
    
    if (products.length === 0) {
        showEmptyState();
        return;
    }
    
    // Group products by category
    const productsByCategory = groupProductsByCategory(products);
    
    // Generate HTML
    let html = '';
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
        html += generateCategoryHTML(category, categoryProducts);
    });
    
    container.innerHTML = html;
    
    // Setup animations
    setupProductAnimations();
    
    console.log('✅ Products displayed successfully:', products.length);
}

function groupProductsByCategory(products) {
    const grouped = {};
    
    products.forEach((item, index) => {
        // Handle different data structures from your worker
        const product = item.product || item;
        const category = normalizeCategory(product.category || inferCategoryFromName(product.name));
        
        if (!grouped[category]) {
            grouped[category] = [];
        }
        
        // Ensure consistent product structure
        const normalizedItem = {
            product: {
                id: product.id,
                name: product.name || 'Unnamed Product',
                thumbnail: product.thumbnail || product.thumbnail_url || product.image_url || getPlaceholderImage(),
                store_url: product.store_url || product.product_url || '#',
                price: product.price || product.retail_price,
                currency: product.currency || 'USD',
                category: category,
                status: product.status || 'active'
            },
            redirectUrl: item.redirectUrl || product.store_url || product.product_url
        };
        
        grouped[category].push(normalizedItem);
    });
    
    return grouped;
}

function normalizeCategory(category) {
    if (!category) return 'other';
    
    const normalized = category.toLowerCase().trim();
    
    // Map variations to standard categories
    const categoryMap = {
        'tshirt': 't-shirts',
        'tshirts': 't-shirts',
        't-shirt': 't-shirts',
        'tee': 't-shirts',
        'tees': 't-shirts',
        'hoodie': 'hoodies',
        'sweatshirt': 'hoodies',
        'sweatshirts': 'hoodies',
        'cap': 'caps',
        'hat': 'caps',
        'hats': 'caps',
        'beanie': 'caps',
        'accessory': 'accessories',
        'mug': 'other',
        'mugs': 'other',
        'bottle': 'other',
        'bag': 'accessories',
        'bags': 'accessories'
    };
    
    return categoryMap[normalized] || normalized;
}

function inferCategoryFromName(name = '') {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('t-shirt') || lowerName.includes('tee')) return 't-shirts';
    if (lowerName.includes('hoodie') || lowerName.includes('sweatshirt')) return 'hoodies';
    if (lowerName.includes('cap') || lowerName.includes('hat') || lowerName.includes('beanie')) return 'caps';
    if (lowerName.includes('mug') || lowerName.includes('bottle')) return 'other';
    if (lowerName.includes('bag') || lowerName.includes('tote')) return 'accessories';
    
    return 'other';
}

function generateCategoryHTML(category, products) {
    const categoryName = DRESS_CONFIG.CATEGORIES[category] || formatCategoryName(category);
    
    let html = `
        <section class="category-section" data-category="${category}">
            <div class="category-header">
                <h2 class="category-title">${categoryName}</h2>
                <div class="category-divider"></div>
            </div>
            <div class="products-grid">
    `;
    
    products.forEach((item, index) => {
        html += generateProductCardHTML(item, index);
    });
    
    html += `
            </div>
        </section>
    `;
    
    return html;
}

function generateProductCardHTML(item, index) {
    const product = item.product;
    const redirectUrl = item.redirectUrl || product.store_url || '#';
    const price = formatPrice(product.price, product.currency);
    const hasPrice = product.price !== null && product.price !== undefined;
    const isFavorite = AppState.favorites.includes(String(product.id));
    
    return `
        <div class="product-card" 
             data-product-id="${product.id}" 
             data-category="${product.category}"
             style="animation-delay: ${index * DRESS_CONFIG.UI.ANIMATION_DELAY}ms">
            <div class="product-image-container">
                <img src="${product.thumbnail}" 
                     alt="${escapeHtml(product.name)}" 
                     class="product-image" 
                     loading="lazy"
                     onerror="handleImageError(this)">
                <div class="product-overlay">
                    <div class="overlay-buttons">
                        <button class="quick-view-btn" 
                                onclick="quickViewProduct('${product.id}')" 
                                title="Quick view"
                                aria-label="Quick view ${escapeHtml(product.name)}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                                onclick="toggleFavorite('${product.id}')" 
                                title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                                aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
                ${hasPrice ? `<div class="price-badge">${price}</div>` : ''}
            </div>
            
            <div class="product-info">
                <h3 class="product-name" title="${escapeHtml(product.name)}">
                    ${escapeHtml(product.name)}
                </h3>
                <div class="product-price-section">
                    <span class="product-price ${hasPrice ? 'available' : 'unavailable'}">
                        ${price}
                    </span>
                </div>
                <button class="buy-button" 
                        onclick="redirectToProduct('${redirectUrl}')"
                        aria-label="View product ${escapeHtml(product.name)}">
                    <span>Shop Now</span>
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        </div>
    `;
}

// ===== PRODUCT FILTERING =====
function filterProducts(category) {
    AppState.currentFilter = category;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        }
    });
    
    // Filter product cards
    const productCards = document.querySelectorAll('.product-card');
    const categorySections = document.querySelectorAll('.category-section');
    
    if (category === 'all') {
        // Show all products
        categorySections.forEach(section => {
            section.style.display = 'block';
        });
        productCards.forEach(card => {
            card.style.display = 'block';
        });
    } else {
        // Show only selected category
        categorySections.forEach(section => {
            if (section.dataset.category === category) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }
    
    // Smooth scroll to products section
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Track analytics
    trackEvent('category_filter', { category });
}

// ===== PRODUCT INTERACTIONS =====
function redirectToProduct(url) {
    if (!url || url === '#') {
        showNotification('Product link not available', 'warning');
        return;
    }
    
    // Track click
    trackEvent('product_click', { url });
    
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
    showNotification('Opening product page...', 'success');
}

function quickViewProduct(productId) {
    // Find product in current data
    if (!AppState.products) return;
    
    let foundProduct = null;
    
    // Search through products array
    const searchProducts = Array.isArray(AppState.products) ? AppState.products : 
                          AppState.products.products || AppState.products.result || [];
    
    for (const item of searchProducts) {
        const product = item.product || item;
        if (String(product.id) === String(productId)) {
            foundProduct = product;
            break;
        }
    }
    
    if (foundProduct) {
        showProductModal(foundProduct);
        trackEvent('quick_view', { product_id: productId });
    }
}

function toggleFavorite(productId) {
    const productIdStr = String(productId);
    const index = AppState.favorites.indexOf(productIdStr);
    
    if (index > -1) {
        AppState.favorites.splice(index, 1);
        showNotification('Removed from favorites', 'info');
    } else {
        AppState.favorites.push(productIdStr);
        showNotification('Added to favorites', 'success');
    }
    
    // Update localStorage
    localStorage.setItem('dress_favorites', JSON.stringify(AppState.favorites));
    
    // Update UI
    updateFavoritesDisplay();
    updateProductCardFavorites();
    
    // Track analytics
    trackEvent('favorite_toggle', { 
        product_id: productId, 
        action: index > -1 ? 'remove' : 'add' 
    });
}

function updateProductCardFavorites() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const card = btn.closest('.product-card');
        const productId = card?.dataset.productId;
        
        if (productId) {
            const isFavorite = AppState.favorites.includes(productId);
            const icon = btn.querySelector('i');
            
            if (isFavorite) {
                btn.classList.add('active');
                icon.className = 'fas fa-heart';
                btn.title = 'Remove from favorites';
            } else {
                btn.classList.remove('active');
                icon.className = 'far fa-heart';
                btn.title = 'Add to favorites';
            }
        }
    });
}

// ===== CONTACT FORM =====
async function handleContactSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Get form data
    const formData = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        subject: form.subject?.value.trim() || '',
        message: form.message.value.trim()
    };
    
    // Validate
    if (!formData.name || !formData.email || !formData.message) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (!isValidEmail(formData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
        
        // Submit to your contact API
        await apiCall('/api/contact', 'POST', formData);
        
        // Success
        showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
        form.reset();
        
        // Track analytics
        trackEvent('contact_submit', { success: true });
        
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Failed to send message. Please try again.', 'error');
        trackEvent('contact_submit', { success: false, error: error.message });
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ===== API FUNCTIONS =====
async function apiCall(endpoint, method = 'GET', body = null, retries = 0) {
    const url = `${DRESS_CONFIG.API.BASE_URL}${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(DRESS_CONFIG.API.TIMEOUT)
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
        
    } catch (error) {
        console.error(`❌ API call failed: ${method} ${endpoint}`, error);
        
        // Retry logic
        if (retries < DRESS_CONFIG.API.RETRY_ATTEMPTS && error.name !== 'AbortError') {
            console.log(`🔄 Retrying API call... Attempt ${retries + 1}`);
            await new Promise(resolve => setTimeout(resolve, DRESS_CONFIG.API.RETRY_DELAY * (retries + 1)));
            return apiCall(endpoint, method, body, retries + 1);
        }
        
        throw error;
    }
}

// ===== UTILITY FUNCTIONS =====
function formatPrice(price, currency = 'USD') {
    if (price === null || price === undefined) {
        return 'Contact for price';
    }
    
    const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$'
    };
    
    const symbol = currencySymbols[currency] || currency;
    const numPrice = parseFloat(price);
    
    if (isNaN(numPrice)) return 'Contact for price';
    
    return `${symbol}${numPrice.toFixed(2)}`;
}

function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getPlaceholderImage() {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f8f9fa"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="%236c757d" text-anchor="middle" dy=".3em">No Image Available</text></svg>';
}

function handleImageError(img) {
    img.src = getPlaceholderImage();
    img.onerror = null; // Prevent infinite loop
}

// ===== CACHE FUNCTIONS =====
function getCachedData(key) {
    if (!DRESS_CONFIG.CACHE.ENABLE_CACHE) return null;
    
    const item = AppState.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
        AppState.cache.delete(key);
        return null;
    }
    
    return item.data;
}

function setCachedData(key, data) {
    if (!DRESS_CONFIG.CACHE.ENABLE_CACHE) return;
    
    AppState.cache.set(key, {
        data,
        expires: Date.now() + DRESS_CONFIG.CACHE.PRODUCTS_TTL
    });
}

// ===== UI STATE FUNCTIONS =====
function showLoadingState() {
    const loading = document.getElementById('products-loading');
    const error = document.getElementById('products-error');
    const empty = document.getElementById('products-empty');
    
    if (loading) loading.style.display = 'block';
    if (error) error.style.display = 'none';
    if (empty) empty.style.display = 'none';
}

function hideLoadingState() {
    const loading = document.getElementById('products-loading');
    if (loading) loading.style.display = 'none';
}

function showErrorState(message = 'Error loading products') {
    const error = document.getElementById('products-error');
    const loading = document.getElementById('products-loading');
    const empty = document.getElementById('products-empty');
    
    if (error) {
        error.style.display = 'block';
        const errorText = error.querySelector('p');
        if (errorText) {
            errorText.innerHTML = `${message}. <button onclick="loadProducts(true)" style="color: var(--primary-orange); background: none; border: none; text-decoration: underline; cursor: pointer;">Retry</button>`;
        }
    }
    if (loading) loading.style.display = 'none';
    if (empty) empty.style.display = 'none';
}

function showEmptyState() {
    const empty = document.getElementById('products-empty');
    const loading = document.getElementById('products-loading');
    const error = document.getElementById('products-error');
    
    if (empty) empty.style.display = 'block';
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
}

function hideErrorState() {
    const error = document.getElementById('products-error');
    if (error) error.style.display = 'none';
}

// ===== ANALYTICS =====
async function trackEvent(eventType, data = {}) {
    try {
        await apiCall(DRESS_CONFIG.API.ENDPOINTS.ANALYTICS, 'POST', {
            type: eventType,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            ...data
        });
    } catch (error) {
        // Silent fail for analytics
        console.warn('Analytics tracking failed:', error);
    }
}

// ===== GLOBAL FUNCTIONS (for HTML onclick handlers) =====
window.changeSlide = changeSlide;
window.currentSlide = currentSlide;
window.filterProducts = filterProducts;
window.redirectToProduct = redirectToProduct;
window.quickViewProduct = quickViewProduct;
window.toggleFavorite = toggleFavorite;
window.handleImageError = handleImageError;
window.loadProducts = loadProducts;

// Export main functions for other scripts
window.DRESS = {
    loadProducts,
    filterProducts,
    trackEvent,
    showNotification: showNotification,
    AppState
};