// JavaScript para Productos Dinámicos - Dress
// Manejo de productos desde API de Printful

// Configuración global
const DRESS_CONFIG = {
    API_ENDPOINT: '/api/printful/products', // Ajusta según tu worker
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
};

// Cache de productos
let productsCache = {
    data: null,
    timestamp: null,
    isValid() {
        return this.data && this.timestamp && 
               (Date.now() - this.timestamp) < DRESS_CONFIG.CACHE_DURATION;
    },
    set(data) {
        this.data = data;
        this.timestamp = Date.now();
    },
    clear() {
        this.data = null;
        this.timestamp = null;
    }
};

// Estado de favoritos
let favorites = JSON.parse(localStorage.getItem('dress_favorites')) || [];

// Función principal para generar HTML de productos
function generateProductsHTML(products) {
    if (!products || products.length === 0) {
        showEmptyState();
        return '';
    }

    // Agrupar productos por categoría
    const productsByCategory = groupProductsByCategory(products);
    
    // Generar HTML
    let html = '';
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
        html += generateCategoryHTML(category, categoryProducts);
    });

    return html;
}

// Agrupar productos por categoría
function groupProductsByCategory(products) {
    return products.reduce((acc, item) => {
        const category = normalizeCategory(item.product.category);
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});
}

// Normalizar nombre de categoría
function normalizeCategory(category) {
    if (!category) return 'other';
    return category.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Obtener nombre de categoría en español
function getCategoryDisplayName(category) {
    const categoryNames = {
        't-shirts': 'Camisetas',
        'camisetas': 'Camisetas',
        'hoodies': 'Sudaderas',
        'sudaderas': 'Sudaderas',
        'caps': 'Gorras',
        'gorras': 'Gorras',
        'hats': 'Gorras',
        'accessories': 'Accesorios',
        'accesorios': 'Accesorios',
        'mugs': 'Tazas',
        'tazas': 'Tazas',
        'bags': 'Bolsas',
        'bolsas': 'Bolsas',
        'other': 'Otros Productos',
        'otros': 'Otros Productos'
    };
    
    return categoryNames[category] || 
           category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}

// Generar HTML de una categoría
function generateCategoryHTML(category, products) {
    const categoryDisplayName = getCategoryDisplayName(category);
    
    let html = `
        <section class="category-section" data-category="${category}">
            <div class="category-header">
                <h2 class="category-title">${categoryDisplayName}</h2>
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

// Generar HTML de una card de producto
function generateProductCardHTML(item, index) {
    const product = item.product;
    const redirectUrl = item.redirectUrl || product.store_url;
    const price = formatPrice(product.price, product.currency);
    const hasPrice = product.price !== null && product.price !== undefined;
    const isFavorite = favorites.includes(product.id.toString());
    
    return `
        <div class="product-card" 
             data-product-id="${product.id}" 
             style="animation-delay: ${index * 0.1}s">
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
                                title="Vista rápida"
                                aria-label="Vista rápida de ${escapeHtml(product.name)}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
                                onclick="toggleFavorite('${product.id}')" 
                                title="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                                aria-label="${isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
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
                        aria-label="Ver producto ${escapeHtml(product.name)}">
                    <span>Ver Producto</span>
                    <i class="fas fa-external-link-alt"></i>
                </button>
            </div>
        </div>
    `;
}

// Formatear precio
function formatPrice(price, currency = 'USD') {
    if (price === null || price === undefined) {
        return 'Consultar precio';
    }
    
    const currencySymbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'MXN': '$',
        'CAD': 'C$'
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${parseFloat(price).toFixed(2)}`;
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Manejar error de imagen
function handleImageError(img) {
    img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f8f9fa"/><text x="50%" y="50%" font-family="Arial" font-size="16" fill="%236c757d" text-anchor="middle" dy=".3em">Imagen no disponible</text></svg>';
    img.onerror = null; // Prevenir bucle infinito
}

// Cargar productos desde la API
async function loadProducts(forceRefresh = false) {
    const loadingEl = document.getElementById('products-loading');
    const errorEl = document.getElementById('products-error');
    const emptyEl = document.getElementById('products-empty');
    const container = document.getElementById('products-container');
    
    // Verificar cache
    if (!forceRefresh && productsCache.isValid()) {
        const productsHTML = generateProductsHTML(productsCache.data);
        container.innerHTML = productsHTML;
        setupProductAnimations();
        return;
    }
    
    // Mostrar loading
    showLoadingState();
    
    let attempts = 0;
    while (attempts < DRESS_CONFIG.RETRY_ATTEMPTS) {
        try {
            const response = await fetchWithTimeout(DRESS_CONFIG.API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }, 10000);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const products = await response.json();
            
            // Validar estructura de datos
            if (!Array.isArray(products)) {
                throw new Error('Invalid data format received');
            }
            
            // Guardar en cache
            productsCache.set(products);
            
            // Ocultar loading
            hideLoadingState();
            
            // Generar y mostrar productos
            const productsHTML = generateProductsHTML(products);
            container.innerHTML = productsHTML;
            
            // Configurar animaciones
            setupProductAnimations();
            
            console.log('✅ Productos cargados exitosamente:', products.length);
            
            // Disparar evento personalizado
            document.dispatchEvent(new CustomEvent('productsLoaded', {
                detail: { products, count: products.length }
            }));
            
            return;
            
        } catch (error) {
            attempts++;
            console.error(`❌ Intento ${attempts} fallido:`, error);
            
            if (attempts < DRESS_CONFIG.RETRY_ATTEMPTS) {
                console.log(`⏳ Reintentando en ${DRESS_CONFIG.RETRY_DELAY}ms...`);
                await new Promise(resolve => setTimeout(resolve, DRESS_CONFIG.RETRY_DELAY));
            } else {
                hideLoadingState();
                showErrorState();
                console.error('❌ Error final al cargar productos:', error);
            }
        }
    }
}

// Fetch con timeout
function fetchWithTimeout(url, options, timeout) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Estados de UI
function showLoadingState() {
    document.getElementById('products-loading').style.display = 'block';
    document.getElementById('products-error').style.display = 'none';
    document.getElementById('products-empty').style.display = 'none';
}

function hideLoadingState() {
    document.getElementById('products-loading').style.display = 'none';
}

function showErrorState() {
    document.getElementById('products-error').style.display = 'block';
    document.getElementById('products-empty').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('products-empty').style.display = 'block';
    document.getElementById('products-error').style.display = 'none';
}

// Configurar animaciones de productos
function setupProductAnimations() {
    const cards = document.querySelectorAll('.product-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

// Funciones de interacción
function redirectToProduct(url) {
    if (url) {
        // Tracking opcional
        gtag && gtag('event', 'product_click', {
            'event_category': 'engagement',
            'event_label': url
        });
        
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

function quickViewProduct(productId) {
    console.log('👁️ Vista rápida del producto:', productId);
    
    // Buscar producto en cache
    if (productsCache.data) {
        const product = productsCache.data.find(item => 
            item.product.id.toString() === productId.toString()
        );
        
        if (product) {
            showQuickViewModal(product);
        }
    }
}

function toggleFavorite(productId) {
    const id = productId.toString();
    const index = favorites.indexOf(id);
    const button = document.querySelector(`[data-product-id="${productId}"] .favorite-btn`);
    
    if (index > -1) {
        // Quitar de favoritos
        favorites.splice(index, 1);
        button.classList.remove('active');
        button.querySelector('i').className = 'far fa-heart';
        button.title = 'Agregar a favoritos';
        showNotification('Producto quitado de favoritos', 'info');
    } else {
        // Agregar a favoritos
        favorites.push(id);
        button.classList.add('active');
        button.querySelector('i').className = 'fas fa-heart';
        button.title = 'Quitar de favoritos';
        showNotification('Producto agregado a favoritos', 'success');
    }
    
    // Guardar en localStorage
    localStorage.setItem('dress_favorites', JSON.stringify(favorites));
    
    // Tracking opcional
    gtag && gtag('event', 'favorite_toggle', {
        'event_category': 'engagement',
        'event_label': productId,
        'value': index > -1 ? 0 : 1
    });
}

// Modal de vista rápida (placeholder)
function showQuickViewModal(product) {
    // Implementar modal aquí
    console.log('Modal de vista rápida para:', product.product.name);
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
        <span>${message}</span>
    `;
    
    // Añadir al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Quitar después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Filtros de productos
function setupProductFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            
            // Actualizar botones activos
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Filtrar productos
            filterProducts(filter);
        });
    });
}

function filterProducts(filter) {
    const categories = document.querySelectorAll('.category-section');
    
    categories.forEach(category => {
        if (filter === 'all') {
            category.style.display = 'block';
        } else {
            const categoryName = category.dataset.category;
            category.style.display = categoryName === filter ? 'block' : 'none';
        }
    });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Inicializando sistema de productos dinámicos...');
    
    // Configurar filtros
    setupProductFilters();
    
    // Cargar productos con delay para mostrar loading
    setTimeout(() => {
        loadProducts();
    }, 500);
    
    // Listener para recargar productos
    window.reloadProducts = () => loadProducts(true);
    
    console.log('✅ Sistema de productos dinámicos inicializado');
});

// Exportar funciones globales
window.loadProducts = loadProducts;
window.redirectToProduct = redirectToProduct;
window.quickViewProduct = quickViewProduct;
window.toggleFavorite = toggleFavorite;