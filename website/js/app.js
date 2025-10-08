/**
 * DRESS - Premium Custom Apparel Website
 * Main Application JavaScript - Optimized for Printful API
 */

// ===== CONFIGURATION =====
const CONFIG = {
    API: {
        BASE_URL: 'https://newdress-cgz.pages.dev/api/printful',
        ENDPOINTS: {
            PRODUCTS: '/products'
        },
        TIMEOUT: 15000,
        RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000
    },
    
    CATEGORIES: {
        'all': 'Todos los Productos',
        't-shirts': 'Camisetas',
        'hoodies': 'Sudaderas',
        'caps': 'Gorras',
        'accessories': 'Accesorios',
        'other': 'Otros'
    },
    
    UI: {
        ANIMATION_DELAY: 100,
        NOTIFICATION_DURATION: 4000,
        DEBOUNCE_DELAY: 300
    }
};

// ===== GLOBAL STATE =====
const state = {
    products: null,
    currentFilter: 'all',
    isLoading: false,
    retryCount: 0
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 DRESS Website - Initializing...');
    initializeApp();
});

async function initializeApp() {
    try {
        setupEventListeners();
        initializeTheme();
        await loadProducts();
        console.log('✅ DRESS Website - Initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showNotification('Error al inicializar el sitio web', 'error');
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Navigation
    setupNavigation();
    
    // Contact form
    setupContactForm();
    
    // Theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Scroll events
    window.addEventListener('scroll', handleScroll);
    
    // Resize events
    window.addEventListener('resize', handleResize);
}

function setupNavigation() {
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
        
        // Smooth scroll for nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                        closeMobileMenu();
                    }
                }
            });
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
    
    if (hamburger && navMenu) {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    }
}

function closeMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ===== THEME FUNCTIONALITY =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('dress_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dress_theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'success');
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-toggle i');
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ===== SCROLL HANDLERS =====
function handleScroll() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
}

function handleResize() {
    // Handle any resize-specific logic here
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
}

// ===== SCROLL FUNCTIONS =====
function scrollToProducts() {
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== API FUNCTIONS =====
async function loadProducts(forceRefresh = false) {
    if (state.isLoading) return;
    
    try {
        state.isLoading = true;
        state.retryCount = 0;
        showLoadingState();
        
        console.log('📡 Loading products from API...');
        const products = await fetchWithRetry(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.PRODUCTS}`);
        
        state.products = products;
        displayProducts(products);
        
        console.log('✅ Products loaded successfully:', products?.length || 0);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        showErrorState(error.message);
    } finally {
        state.isLoading = false;
    }
}

async function fetchWithRetry(url, options = {}) {
    const maxRetries = CONFIG.API.RETRY_ATTEMPTS;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Fetch attempt ${attempt}/${maxRetries}: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('La respuesta no es JSON válido');
            }
            
            const data = await response.json();
            console.log('📦 API Response:', data);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Fetch attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`Error al cargar productos después de ${maxRetries} intentos: ${error.message}`);
            }
            
            if (attempt < maxRetries) {
                console.log(`⏳ Retrying in ${CONFIG.API.RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.API.RETRY_DELAY * attempt));
            }
        }
    }
}

// ===== PRODUCT DISPLAY =====
function displayProducts(data) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    hideLoadingState();
    hideErrorState();
    hideEmptyState();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
        showEmptyState();
        return;
    }
    
    console.log('🎨 Displaying products:', data.length);
    
    // Group products by category
    const productsByCategory = groupProductsByCategory(data);
    
    // Generate HTML
    let html = '';
    Object.entries(productsByCategory).forEach(([category, products]) => {
        if (products.length > 0) {
            html += generateCategoryHTML(category, products);
        }
    });
    
    container.innerHTML = html;
    
    // Setup animations
    setupProductAnimations();
    
    // Show all products initially
    filterProducts('all');
}

function groupProductsByCategory(products) {
    const grouped = {};
    
    products.forEach((item, index) => {
        // Handle different data structures
        const product = item.product || item;
        const category = normalizeCategory(product.category) || 'other';
        
        if (!grouped[category]) {
            grouped[category] = [];
        }
        
        // Normalize product structure
        const normalizedProduct = {
            id: product.id || `product_${index}`,
            name: product.name || 'Producto sin nombre',
            thumbnail: product.thumbnail || product.thumbnail_url || product.image_url || getPlaceholderImage(),
            store_url: product.store_url || product.product_url || '#',
            price: product.price || product.retail_price,
            currency: product.currency || 'USD',
            category: category,
            variants: product.variants || [],
            colors: extractColors(product.variants || []),
            sizes: extractSizes(product.variants || [])
        };
        
        grouped[category].push(normalizedProduct);
    });
    
    return grouped;
}

function normalizeCategory(category) {
    if (!category) return 'other';
    
    const normalized = category.toLowerCase().trim();
    
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
        'mug': 'accessories',
        'mugs': 'accessories',
        'bottle': 'accessories',
        'bag': 'accessories',
        'bags': 'accessories'
    };
    
    return categoryMap[normalized] || 'other';
}

function extractColors(variants) {
    const colors = new Set();
    
    variants.forEach(variant => {
        if (variant.color) {
            colors.add(variant.color);
        }
        if (variant.color_code) {
            colors.add(variant.color_code);
        }
    });
    
    return Array.from(colors);
}

function extractSizes(variants) {
    const sizes = new Set();
    
    variants.forEach(variant => {
        if (variant.size) {
            sizes.add(variant.size);
        }
    });
    
    return Array.from(sizes);
}

function generateCategoryHTML(category, products) {
    const categoryName = CONFIG.CATEGORIES[category] || formatCategoryName(category);
    
    let html = `
        <div class="category-section" data-category="${category}">
            <h3 class="category-title">${categoryName}</h3>
            <div class="category-products">
    `;
    
    products.forEach((product, index) => {
        html += generateProductCardHTML(product, index);
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function generateProductCardHTML(product, index) {
    const price = formatPrice(product.price, product.currency);
    const hasVariants = product.colors.length > 0 || product.sizes.length > 0;
    
    return `
        <div class="product-card" 
             data-product-id="${product.id}" 
             data-category="${product.category}"
             style="animation-delay: ${index * CONFIG.UI.ANIMATION_DELAY}ms">
            
            <div class="product-image-container">
                <img src="${product.thumbnail}" 
                     alt="${escapeHtml(product.name)}" 
                     class="product-image" 
                     loading="lazy"
                     onerror="handleImageError(this)">
                
                <div class="product-overlay">
                    <div class="overlay-buttons">
                        <button class="overlay-btn" 
                                onclick="quickViewProduct('${product.id}')" 
                                title="Vista rápida">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="product-info">
                <h3 class="product-name">${escapeHtml(product.name)}</h3>
                
                <div class="product-price">${price}</div>
                
                ${hasVariants ? generateVariantsHTML(product) : ''}
                
                <button class="buy-button" 
                        onclick="redirectToProduct('${product.store_url}', '${escapeHtml(product.name)}')"
                        title="Ver producto ${escapeHtml(product.name)}">
                    <span>Ver Producto</span>
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        </div>
    `;
}

function generateVariantsHTML(product) {
    let html = '<div class="product-variants">';
    
    if (product.colors.length > 0) {
        html += `
            <div class="variant-title">Colores disponibles:</div>
            <div class="variant-colors">
        `;
        
        product.colors.slice(0, 6).forEach(color => {
            const colorStyle = getColorStyle(color);
            html += `
                <div class="color-option" 
                     style="${colorStyle}" 
                     title="${color}"
                     onclick="selectVariant('color', '${color}', '${product.id}')">
                </div>
            `;
        });
        
        if (product.colors.length > 6) {
            html += `<span class="more-colors">+${product.colors.length - 6} más</span>`;
        }
        
        html += '</div>';
    }
    
    if (product.sizes.length > 0) {
        html += `
            <div class="variant-title">Tallas disponibles:</div>
            <div class="variant-sizes">
        `;
        
        product.sizes.forEach(size => {
            html += `
                <span class="size-option" 
                      onclick="selectVariant('size', '${size}', '${product.id}')"
                      title="Talla ${size}">
                    ${size}
                </span>
            `;
        });
        
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

function getColorStyle(color) {
    // Map color names to CSS colors
    const colorMap = {
        'black': '#000000',
        'white': '#ffffff',
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'pink': '#ffc0cb',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#a52a2a',
        'navy': '#000080',
        'maroon': '#800000'
    };
    
    // Check if it's a hex color
    if (color.startsWith('#')) {
        return `background-color: ${color};`;
    }
    
    // Check if it's in our color map
    const lowerColor = color.toLowerCase();
    if (colorMap[lowerColor]) {
        return `background-color: ${colorMap[lowerColor]};`;
    }
    
    // Default to gradient
    return `background: linear-gradient(45deg, var(--primary-orange), var(--accent-gold));`;
}

// ===== PRODUCT FILTERING =====
function filterProducts(category) {
    state.currentFilter = category;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        }
    });
    
    // Filter category sections
    const categorySections = document.querySelectorAll('.category-section');
    
    if (category === 'all') {
        categorySections.forEach(section => {
            section.style.display = 'block';
        });
    } else {
        categorySections.forEach(section => {
            if (section.dataset.category === category) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    }
    
    console.log(`🔍 Filtered products by category: ${category}`);
}

// ===== PRODUCT INTERACTIONS =====
function redirectToProduct(url, productName) {
    if (!url || url === '#') {
        showNotification('Enlace del producto no disponible', 'warning');
        return;
    }
    
    try {
        window.open(url, '_blank', 'noopener,noreferrer');
        showNotification(`Abriendo ${productName}...`, 'success');
    } catch (error) {
        console.error('Error opening product:', error);
        showNotification('Error al abrir el producto', 'error');
    }
}

function quickViewProduct(productId) {
    showNotification('Vista rápida próximamente disponible', 'info');
}

function selectVariant(type, value, productId) {
    showNotification(`${type === 'color' ? 'Color' : 'Talla'} seleccionada: ${value}`, 'success');
}

function loadMoreProducts() {
    showNotification('Carga de más productos próximamente disponible', 'info');
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
        showNotification('Por favor completa todos los campos requeridos', 'warning');
        return;
    }
    
    if (!isValidEmail(formData.email)) {
        showNotification('Por favor ingresa un email válido', 'warning');
        return;
    }
    
    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        submitBtn.disabled = true;
        
        // Simulate form submission (replace with actual endpoint)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Success
        showNotification('¡Mensaje enviado exitosamente!', 'success');
        form.reset();
        
    } catch (error) {
        console.error('Contact form error:', error);
        showNotification('Error al enviar el mensaje. Inténtalo de nuevo.', 'error');
    } finally {
        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// ===== STATE MANAGEMENT =====
function showLoadingState() {
    const loadingEl = document.getElementById('products-loading');
    const errorEl = document.getElementById('products-error');
    const emptyEl = document.getElementById('products-empty');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
}

function hideLoadingState() {
    const loadingEl = document.getElementById('products-loading');
    if (loadingEl) loadingEl.style.display = 'none';
}

function showErrorState(message) {
    const errorEl = document.getElementById('products-error');
    const loadingEl = document.getElementById('products-loading');
    const emptyEl = document.getElementById('products-empty');
    
    if (errorEl) {
        errorEl.style.display = 'block';
        const errorMessage = errorEl.querySelector('p');
        if (errorMessage) {
            errorMessage.textContent = message || 'Error al cargar productos';
        }
    }
    if (loadingEl) loadingEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
}

function hideErrorState() {
    const errorEl = document.getElementById('products-error');
    if (errorEl) errorEl.style.display = 'none';
}

function showEmptyState() {
    const emptyEl = document.getElementById('products-empty');
    const loadingEl = document.getElementById('products-loading');
    const errorEl = document.getElementById('products-error');
    
    if (emptyEl) emptyEl.style.display = 'block';
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
}

function hideEmptyState() {
    const emptyEl = document.getElementById('products-empty');
    if (emptyEl) emptyEl.style.display = 'none';
}

// ===== ANIMATIONS =====
function setupProductAnimations() {
    const productCards = document.querySelectorAll('.product-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    productCards.forEach(card => {
        observer.observe(card);
    });
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide and remove notification
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, CONFIG.UI.NOTIFICATION_DURATION);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatPrice(price, currency = 'USD') {
    if (price === null || price === undefined) {
        return 'Precio no disponible';
    }
    
    try {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(price);
    } catch (error) {
        return `$${price}`;
    }
}

function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getPlaceholderImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMTUwQzE4Ny44NSAxNTAgMTc4IDE1OS44NSAxNzggMTcyUzE4Ny44NSAxOTQgMjAwIDE5NFMyMjIgMTg0LjE1IDIyMiAxNzJTMjEyLjE1IDE1MCAyMDAgMTUwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMzAwIDI1MEgxMDBWMjcwSDMwMFYyNTBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjcyODAiPlByb2R1Y3RvPC90ZXh0Pgo8L3N2Zz4K';
}

function handleImageError(img) {
    img.src = getPlaceholderImage();
    img.alt = 'Imagen no disponible';
}

// ===== EXPOSE GLOBAL FUNCTIONS =====
window.scrollToProducts = scrollToProducts;
window.filterProducts = filterProducts;
window.redirectToProduct = redirectToProduct;
window.quickViewProduct = quickViewProduct;
window.selectVariant = selectVariant;
window.loadMoreProducts = loadMoreProducts;
window.loadProducts = loadProducts;
window.toggleTheme = toggleTheme;
window.handleImageError = handleImageError;

console.log('📱 DRESS Website JavaScript loaded successfully');