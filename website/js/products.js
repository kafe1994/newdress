/**
 * DRESS - Products Management JavaScript
 * Enhanced product functionality and UI interactions
 * Version: 2.0
 */

// ===== ADDITIONAL PRODUCT FUNCTIONALITY =====

// Theme management
function initializeTheme() {
    const savedTheme = localStorage.getItem('dress_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = document.querySelector('.theme-toggle i');
    if (themeIcon) {
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dress_theme', newTheme);
    
    const themeIcon = document.querySelector('.theme-toggle i');
    if (themeIcon) {
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    showNotification(`Switched to ${newTheme} theme`, 'info');
}

// Animation setup
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: DRESS_CONFIG.UI.INTERSECTION_THRESHOLD,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe elements for scroll animations
    document.querySelectorAll('.scroll-reveal, .category-card, .product-card').forEach(el => {
        observer.observe(el);
    });
}

function setupProductAnimations() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach((card, index) => {
        // Reset animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        // Trigger animation with delay
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Cart functionality
function updateCartDisplay() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = AppState.cart.length;
    }
}

function updateFavoritesDisplay() {
    // Update favorites count if you have a favorites indicator
    const favoritesCount = document.querySelector('.favorites-count');
    if (favoritesCount) {
        favoritesCount.textContent = AppState.favorites.length;
        favoritesCount.style.display = AppState.favorites.length > 0 ? 'flex' : 'none';
    }
}

function toggleCart() {
    const cartSidebar = document.querySelector('.cart-sidebar');
    if (cartSidebar) {
        cartSidebar.classList.toggle('active');
        document.body.style.overflow = cartSidebar.classList.contains('active') ? 'hidden' : '';
    }
}

// Product modal for quick view
function showProductModal(product) {
    const modal = createProductModal(product);
    document.body.appendChild(modal);
    
    // Show modal
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });
    
    // Close modal events
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
        document.body.style.overflow = '';
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    // ESC key to close
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    document.body.style.overflow = 'hidden';
}

function createProductModal(product) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const price = formatPrice(product.price, product.currency);
    const isFavorite = AppState.favorites.includes(String(product.id));
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Product Details</h3>
                <button class="modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px;">
                        <img src="${product.thumbnail}" 
                             alt="${escapeHtml(product.name)}" 
                             style="width: 100%; border-radius: 8px; margin-bottom: 1rem;"
                             onerror="handleImageError(this)">
                    </div>
                    <div style="flex: 1; min-width: 250px;">
                        <h4 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 1rem;">
                            ${escapeHtml(product.name)}
                        </h4>
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--primary-orange); margin-bottom: 1rem;">
                            ${price}
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <span style="display: inline-block; background: var(--light-gray); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem;">
                                ${DRESS_CONFIG.CATEGORIES[product.category] || formatCategoryName(product.category)}
                            </span>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                            <button onclick="toggleFavorite('${product.id}')" 
                                    class="cta-button secondary" 
                                    style="flex: 1;">
                                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                                ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            </button>
                        </div>
                        <button onclick="redirectToProduct('${product.store_url || '#'}')" 
                                class="cta-button primary" 
                                style="width: 100%;">
                            <span>View Full Product</span>
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; margin-left: 1rem; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });
    
    // Auto remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, DRESS_CONFIG.UI.NOTIFICATION_DURATION);
}

// Scroll functionality
function scrollToProducts() {
    const productsSection = document.getElementById('products');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

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
    // Handle responsive adjustments if needed
    if (window.innerWidth > 968) {
        closeMobileMenu();
    }
}

function handleKeyboard(e) {
    // ESC key handling
    if (e.key === 'Escape') {
        closeMobileMenu();
        
        // Close any open modals
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            const closeBtn = activeModal.querySelector('.modal-close');
            if (closeBtn) closeBtn.click();
        }
        
        // Close cart sidebar
        const cartSidebar = document.querySelector('.cart-sidebar.active');
        if (cartSidebar) {
            toggleCart();
        }
    }
    
    // Arrow key navigation for slider
    if (e.key === 'ArrowLeft') {
        changeSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(1);
    }
}

// Lookbook functionality
function openLookbook() {
    // This could open a modal with a gallery of products
    showNotification('Lookbook feature coming soon!', 'info');
    trackEvent('lookbook_click');
}

function openCart() {
    toggleCart();
    trackEvent('cart_open');
}

// Search functionality (if you want to add search)
function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.toLowerCase().trim();
            
            searchTimeout = setTimeout(() => {
                if (query.length >= 2) {
                    searchProducts(query);
                } else {
                    // Show all products if search is cleared
                    filterProducts(AppState.currentFilter);
                }
            }, 500);
        });
    }
}

function searchProducts(query) {
    const productCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;
    
    productCards.forEach(card => {
        const productName = card.querySelector('.product-name')?.textContent.toLowerCase() || '';
        const category = card.dataset.category || '';
        
        if (productName.includes(query) || category.includes(query)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide category sections based on visible products
    document.querySelectorAll('.category-section').forEach(section => {
        const visibleProducts = section.querySelectorAll('.product-card[style*="block"]');
        section.style.display = visibleProducts.length > 0 ? 'block' : 'none';
    });
    
    if (visibleCount === 0) {
        showNotification(`No products found for "${query}"`, 'info');
    }
    
    trackEvent('product_search', { query, results: visibleCount });
}

// Utility function for throttling
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

// Initialize additional features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup search if search input exists
    setupSearch();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Initialize scroll reveal elements
    document.querySelectorAll('.category-card, .product-card').forEach(el => {
        el.classList.add('scroll-reveal');
    });
});

// Performance optimization: Lazy load images
function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// Export functions for global access
window.toggleTheme = toggleTheme;
window.scrollToProducts = scrollToProducts;
window.openLookbook = openLookbook;
window.openCart = openCart;
window.toggleCart = toggleCart;
window.showNotification = showNotification;
window.showProductModal = showProductModal;