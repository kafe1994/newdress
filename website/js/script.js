// Enhanced DRESS Website JavaScript
// Version: 2.0 - Enhanced with better Printful integration

// Global Variables
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
let isLoading = false;
let cartItems = [];
let favorites = JSON.parse(localStorage.getItem('dress_favorites')) || [];

// Configuration
const CONFIG = {
    // Cloudflare Worker endpoint - update this with your worker URL
    WORKER_BASE: '/api/printful',
    
    // Local store mapping for fallback
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

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 DRESS Website - Enhanced Version Initializing...');
    initializeApp();
    setupEventListeners();
    setupIntersectionObserver();
    initializeAnimations();
    loadUserPreferences();
});

// Initialize Application
function initializeApp() {
    try {
        // Initialize slider
        if (slides.length > 0) {
            showSlide(0);
            startSlideAutoplay();
        }

        // Initialize smooth scrolling
        initializeSmoothScrolling();
        
        // Initialize product filters
        initializeProductFilters();
        
        // Initialize theme
        initializeTheme();
        
        // Update cart display
        updateCartDisplay();
        
        // Load favorites
        updateFavoritesDisplay();
        
        console.log('✅ DRESS Website - Initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Website initialization failed. Please refresh the page.', 'error');
    }
}

// Enhanced Event Listeners Setup
function setupEventListeners() {
    try {
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

            // Close mobile menu when clicking on a link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', closeMobileMenu);
            });
        }

        // Contact form submission
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', handleContactForm);
        }

        // Navbar scroll effect
        window.addEventListener('scroll', throttle(handleNavbarScroll, 16));

        // Window resize handler
        window.addEventListener('resize', throttle(handleWindowResize, 250));

        // Product filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', handleProductFilter);
        });

        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);

        // Scroll indicator click
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            scrollIndicator.addEventListener('click', () => scrollToProducts());
        }

        console.log('✅ Event listeners setup complete');
    } catch (error) {
        console.error('❌ Event listeners setup error:', error);
    }
}

// Mobile Menu Functions
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

// Enhanced Slider Functions
function showSlide(index) {
    if (!slides.length) return;

    // Remove active classes
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Add active class to current slide
    if (slides[index]) {
        slides[index].classList.add('active');
        slides[index].style.opacity = '0';
        setTimeout(() => {
            slides[index].style.opacity = '1';
        }, 50);
    }
    
    if (dots[index]) {
        dots[index].classList.add('active');
    }

    // Move slider
    const slider = document.querySelector('.slider');
    if (slider) {
        slider.style.transform = `translateX(-${index * 100}%)`;
    }

    currentSlide = index;
}

function changeSlide(direction) {
    const totalSlides = slides.length;
    if (!totalSlides) return;
    
    let newIndex = currentSlide + direction;
    if (newIndex >= totalSlides) newIndex = 0;
    else if (newIndex < 0) newIndex = totalSlides - 1;
    
    showSlide(newIndex);
}

function currentSlideHandler(index) {
    showSlide(index - 1);
}

// Global functions for HTML onclick handlers
window.changeSlide = changeSlide;
window.currentSlide = currentSlideHandler;

function startSlideAutoplay() {
    setInterval(() => {
        if (!document.hidden) {
            changeSlide(1);
        }
    }, CONFIG.SLIDE_INTERVAL);
}

// Enhanced Printful API Integration
async function printfulApiCall(endpoint = '/', method = 'GET', body = null, retries = 0) {
    const url = `${CONFIG.WORKER_BASE}${endpoint}`;
    
    const fetchOptions = {
        method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT)
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
    }

    try {
        showLoading(true);
        
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') 
            ? await response.json() 
            : await response.text();

        console.log('✅ Printful API Success:', { endpoint, method, data });
        return data;

    } catch (error) {
        console.error('❌ Printful API Error:', { endpoint, method, error: error.message });
        
        // Retry logic
        if (retries < CONFIG.RETRY_ATTEMPTS && !error.name === 'AbortError') {
            console.log(`🔄 Retrying API call... Attempt ${retries + 1}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
            return printfulApiCall(endpoint, method, body, retries + 1);
        }
        
        throw error;
    } finally {
        showLoading(false);
    }
}

// Enhanced Product Store Redirection
async function redirectToStore(category) {
    console.log(`🛍️ Redirecting to ${category} store...`);
    
    try {
        trackProductClick(category);
        showLoading(true);

        // Try to get products from Printful API
        const data = await printfulApiCall(`/products?category=${encodeURIComponent(category)}`);

        // Handle different response formats
        if (data && typeof data === 'object') {
            let redirectUrl = null;

            // Check for direct redirect URL
            if (data.redirectUrl) {
                redirectUrl = data.redirectUrl;
            }
            // Check for store URL in response
            else if (data.store_url) {
                redirectUrl = data.store_url;
            }
            // Check if it's an array of products
            else if (Array.isArray(data) && data.length > 0) {
                const firstProduct = data[0];
                redirectUrl = firstProduct.product_url || firstProduct.url || firstProduct.store_url;
            }
            // Check for result property (Printful API structure)
            else if (data.result) {
                if (Array.isArray(data.result) && data.result.length > 0) {
                    redirectUrl = data.result[0].store_url || data.result[0].product_url;
                } else if (data.result.store_url) {
                    redirectUrl = data.result.store_url;
                }
            }

            if (redirectUrl) {
                console.log('🔗 Opening Printful store:', redirectUrl);
                window.open(redirectUrl, '_blank', 'noopener,noreferrer');
                showNotification(`Opening ${category} collection...`, 'success');
                return;
            }
        }

        // Fallback to local path
        console.log('⚠️ No Printful URL found, using fallback');
        const localPath = CONFIG.STORE_PATHS[category] || '/';
        showNotification(`Browse our ${category} collection`, 'info');
        window.location.href = localPath;

    } catch (error) {
        console.error('❌ Store redirect error:', error);
        
        // Always provide fallback
        const localPath = CONFIG.STORE_PATHS[category] || '/';
        showNotification('Opening product catalog...', 'info');
        window.location.href = localPath;
    } finally {
        showLoading(false);
    }
}

// Make redirectToStore globally available
window.redirectToStore = redirectToStore;

// Analytics and Tracking
function trackProductClick(category) {
    console.log(`📊 Product category clicked: ${category}`);
    
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'product_click', {
            'event_category': 'engagement',
            'event_label': category,
            'value': 1
        });
    }
    
    // Custom tracking
    const event = {
        type: 'product_click',
        category: category,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer
    };
    
    // Store in localStorage for analytics
    const analytics = JSON.parse(localStorage.getItem('dress_analytics')) || [];
    analytics.push(event);
    if (analytics.length > 100) analytics.shift(); // Keep only last 100 events
    localStorage.setItem('dress_analytics', JSON.stringify(analytics));
}

// Product Filter Functions
function initializeProductFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');
    
    if (!filterButtons.length || !productCards.length) return;
    
    console.log('🎛️ Initializing product filters');
}

function handleProductFilter(e) {
    const filterValue = e.target.dataset.filter;
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');
    
    // Update active filter button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // Filter products with animation
    productCards.forEach((card, index) => {
        const cardFilter = card.dataset.filter;
        const shouldShow = filterValue === 'all' || cardFilter === filterValue;
        
        setTimeout(() => {
            if (shouldShow) {
                card.style.display = 'block';
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        }, index * 50);
    });
    
    console.log(`🎯 Filtered products by: ${filterValue}`);
}

// Quick View Function
function quickView(category) {
    console.log(`👁️ Quick view for: ${category}`);
    showNotification(`Quick view for ${category} - Coming soon!`, 'info');
    
    // TODO: Implement modal with product preview
    // This would show a modal with product images and basic info
}

// Make quickView globally available
window.quickView = quickView;

// Favorites Functions
function toggleFavorite(category) {
    const index = favorites.indexOf(category);
    
    if (index > -1) {
        favorites.splice(index, 1);
        showNotification(`Removed ${category} from favorites`, 'info');
    } else {
        favorites.push(category);
        showNotification(`Added ${category} to favorites`, 'success');
    }
    
    localStorage.setItem('dress_favorites', JSON.stringify(favorites));
    updateFavoritesDisplay();
    
    console.log('❤️ Favorites updated:', favorites);
}

// Make toggleFavorite globally available
window.toggleFavorite = toggleFavorite;

function updateFavoritesDisplay() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const category = btn.onclick.toString().match(/'([^']+)'/)?.[1];
        if (category && favorites.includes(category)) {
            btn.innerHTML = '<i class="fas fa-heart"></i>';
            btn.style.color = 'var(--danger)';
        } else {
            btn.innerHTML = '<i class="far fa-heart"></i>';
            btn.style.color = '';
        }
    });
}

// Cart Functions
function openCart() {
    console.log('🛒 Opening cart');
    showNotification('Cart functionality coming soon!', 'info');
    
    // TODO: Implement cart modal/page
}

// Make openCart globally available
window.openCart = openCart;

function updateCartDisplay() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cartItems.length;
        cartCount.style.display = cartItems.length > 0 ? 'flex' : 'none';
    }
}

// Theme Functions
function initializeTheme() {
    const savedTheme = localStorage.getItem('dress_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dress_theme', newTheme);
    
    showNotification(`Switched to ${newTheme} theme`, 'success');
    console.log(`🌙 Theme changed to: ${newTheme}`);
}

// Make toggleTheme globally available
window.toggleTheme = toggleTheme;

// Lookbook Function
function openLookbook() {
    console.log('📸 Opening lookbook');
    showNotification('Lookbook coming soon!', 'info');
    
    // TODO: Implement lookbook modal/page
}

// Make openLookbook globally available
window.openLookbook = openLookbook;

// Enhanced Smooth Scrolling
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 100;
                window.scrollTo({ 
                    top: offsetTop, 
                    behavior: 'smooth' 
                });
                
                // Update URL without triggering scroll
                history.pushState(null, null, this.getAttribute('href'));
            }
        });
    });
}

function scrollToProducts() {
    const productsSection = document.getElementById('products');
    if (productsSection) {
        const offsetTop = productsSection.offsetTop - 100;
        window.scrollTo({ 
            top: offsetTop, 
            behavior: 'smooth' 
        });
    }
}

// Make scrollToProducts globally available
window.scrollToProducts = scrollToProducts;

// Enhanced Contact Form Handler
async function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name')?.trim(),
        email: formData.get('email')?.trim(),
        subject: formData.get('subject')?.trim(),
        message: formData.get('message')?.trim()
    };

    // Validation
    if (!data.name || !data.email || !data.message) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    if (!isValidEmail(data.email)) {
        showNotification('Please enter a valid email address.', 'error');
        return;
    }
    
    if (data.message.length < 10) {
        showNotification('Please provide a more detailed message.', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn?.textContent || 'Send Message';
    
    try {
        if (submitBtn) {
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
        }

        // Try to send via API
        try {
            await printfulApiCall('/contact', 'POST', data);
            showNotification('Thank you! We\'ll get back to you within 24 hours.', 'success');
        } catch (apiError) {
            // Fallback to mailto
            const mailtoLink = `mailto:liendoalejandro94@gmail.com?subject=${encodeURIComponent(data.subject || 'Contact from DRESS website')}&body=${encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`)}`;
            window.location.href = mailtoLink;
            showNotification('Opening email client...', 'info');
        }
        
        e.target.reset();
        
    } catch (error) {
        console.error('❌ Contact form error:', error);
        showNotification('Failed to send message. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

// Utility Functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Enhanced Notification System
function showNotification(message, type = 'info', duration = 5000) {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle', 
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    const colors = {
        success: '#4CAF50',
        error: '#f44336', 
        warning: '#ff9800',
        info: '#2196F3'
    };

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        transform: translateX(400px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 400px;
        word-wrap: break-word;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        backdrop-filter: blur(10px);
    `;

    notification.querySelector('.notification-close').style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        margin-left: auto;
        padding: 0.2rem;
        border-radius: 50%;
        transition: background 0.3s ease;
    `;

    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    
    // Auto remove
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Enhanced Loading System
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (show) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Navbar Scroll Effect
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    const scrolled = window.scrollY > 50;
    navbar.classList.toggle('scrolled', scrolled);
}

// Window Resize Handler
function handleWindowResize() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
    
    // Recalculate slider position
    if (slides.length > 0) {
        const slider = document.querySelector('.slider');
        if (slider) {
            slider.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
    }
}

// Keyboard Navigation
function handleKeyboardNavigation(e) {
    // ESC key - close modals/menus
    if (e.key === 'Escape') {
        closeMobileMenu();
        // TODO: Close any open modals
    }
    
    // Arrow keys for slider
    if (e.key === 'ArrowLeft') {
        changeSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(1);
    }
}

// Enhanced Intersection Observer
function setupIntersectionObserver() {
    const observerOptions = { 
        threshold: CONFIG.INTERSECTION_THRESHOLD, 
        rootMargin: '0px 0px -50px 0px' 
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animations
    document.querySelectorAll('.product-card, .slide, .section-title, .contact-card, .terms-item').forEach(el => {
        observer.observe(el);
    });
}

// Animation Initialization
function initializeAnimations() {
    // Add staggered animations to product cards
    document.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Add scroll-triggered animations
    const scrollElements = document.querySelectorAll('.hero-stats .stat-item');
    scrollElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.2}s`;
    });
}

// Load User Preferences
function loadUserPreferences() {
    // Load favorites
    const savedFavorites = localStorage.getItem('dress_favorites');
    if (savedFavorites) {
        favorites = JSON.parse(savedFavorites);
        updateFavoritesDisplay();
    }
    
    // Load cart items
    const savedCart = localStorage.getItem('dress_cart');
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
        updateCartDisplay();
    }
    
    console.log('✅ User preferences loaded');
}

// Page Visibility API
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('🔒 Page hidden - pausing animations');
    } else {
        console.log('👁️ Page visible - resuming animations');
    }
});

// Error Handling
window.addEventListener('error', (e) => {
    console.error('❌ Global error:', e.error);
    
    // Don't show error notifications for network errors
    if (!e.error?.message?.includes('fetch')) {
        showNotification('Something went wrong. Please refresh the page.', 'error');
    }
});

// Performance Monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('📊 Page Performance:', {
                loadTime: Math.round(perfData.loadEventEnd - perfData.fetchStart),
                domReady: Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
                firstPaint: Math.round(performance.getEntriesByType('paint')[0]?.startTime || 0)
            });
        }, 0);
    });
}

// Export for testing environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showSlide,
        changeSlide,
        redirectToStore,
        printfulApiCall,
        showNotification,
        toggleFavorite,
        CONFIG
    };
}

// Debug information
console.log('🎨 DRESS Website - Enhanced Script loaded successfully');
console.log('🔧 Configuration:', CONFIG);
console.log('🌐 Environment:', { 
    userAgent: navigator.userAgent, 
    viewport: { width: window.innerWidth, height: window.innerHeight }, 
    timestamp: new Date().toISOString(),
    localStorage: typeof(Storage) !== "undefined",
    serviceWorker: 'serviceWorker' in navigator
});
