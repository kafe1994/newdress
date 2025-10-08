/**
 * DRESS - Enhanced Products Management JavaScript
 * Complete variant support and dynamic rendering
 * Version: 2.1 - Enhanced for Printful Variants
 */

// ===== ENHANCED PRODUCT FUNCTIONALITY =====

// Enhanced Configuration
const DRESS_CONFIG_ENHANCED = {
    ...DRESS_CONFIG,
    
    // Variant display settings
    VARIANTS: {
        MAX_COLOR_SWATCHES: 8,
        MAX_SIZE_OPTIONS: 12,
        DEFAULT_VARIANT_DISPLAY: 'grid',
        ENABLE_QUICK_VIEW: true,
        ENABLE_COLOR_PREVIEW: true
    },
    
    // Enhanced UI settings
    UI: {
        ...DRESS_CONFIG.UI,
        VARIANT_ANIMATION_DELAY: 50,
        COLOR_TRANSITION_SPEED: 300,
        LAZY_LOAD_VARIANTS: true
    }
};

// Enhanced App State
const EnhancedAppState = {
    ...AppState,
    selectedVariants: new Map(), // productId -> selectedVariantId
    variantCache: new Map(),     // cache for variant details
    colorPreviewCache: new Map() // cache for color preview images
};

// ===== ENHANCED PRODUCT LOADING =====

// Enhanced product loading with variant support
async function loadProductsEnhanced(forceRefresh = false) {
    if (AppState.isLoading) return;
    
    const cacheKey = 'products_enhanced_all';
    
    // Check cache first
    if (!forceRefresh && DRESS_CONFIG.CACHE.ENABLE_CACHE) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            AppState.products = cached;
            displayProductsEnhanced(cached);
            return;
        }
    }
    
    try {
        AppState.isLoading = true;
        showLoadingState();
        
        // Request products with variants enabled
        const params = new URLSearchParams({
            variants: 'true',
            include_mockups: 'true'
        });
        
        const products = await apiCall(`${DRESS_CONFIG.API.ENDPOINTS.PRODUCTS}?${params}`);
        
        // Cache the results
        if (DRESS_CONFIG.CACHE.ENABLE_CACHE) {
            setCachedData(cacheKey, products);
        }
        
        AppState.products = products;
        displayProductsEnhanced(products);
        
        // Track analytics
        trackEvent('products_loaded_enhanced', { 
            count: products?.products?.length || products?.length || 0,
            has_variants: products?.hasVariants || false
        });
        
    } catch (error) {
        console.error('❌ Error loading enhanced products:', error);
        showErrorState(error.message);
        trackEvent('products_error_enhanced', { error: error.message });
    } finally {
        AppState.isLoading = false;
        hideLoadingState();
    }
}

// Enhanced product display with variant support
function displayProductsEnhanced(data) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    hideLoadingState();
    hideErrorState();
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
        showEmptyState();
        return;
    }
    
    // Handle different response formats from enhanced worker
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
    
    // Generate enhanced HTML with variants
    let html = '';
    Object.entries(productsByCategory).forEach(([category, categoryProducts]) => {
        html += generateCategoryHTMLEnhanced(category, categoryProducts);
    });
    
    container.innerHTML = html;
    
    // Setup enhanced animations
    setupProductAnimationsEnhanced();
    
    // Initialize variant interactions
    initializeVariantInteractions();
    
    console.log('✅ Enhanced products displayed successfully:', products.length);
}

// Generate enhanced category HTML with variant support
function generateCategoryHTMLEnhanced(category, products) {
    const categoryTitle = DRESS_CONFIG.CATEGORIES[category] || formatCategoryName(category);
    
    const productsHTML = products.map((item, index) => {
        const product = item.product || item;
        return generateProductCardEnhanced(product, index);
    }).join('');
    
    return `
        <div class="category-section" data-category="${category}">
            <h3 class="category-title">
                <span class="category-name">${categoryTitle}</span>
                <span class="category-count">${products.length} items</span>
            </h3>
            <div class="products-grid enhanced">
                ${productsHTML}
            </div>
        </div>
    `;
}

// Generate enhanced product card with variant support
function generateProductCardEnhanced(product, index) {
    const price = formatPrice(product.price, product.currency);
    const isFavorite = AppState.favorites.includes(String(product.id));
    const hasVariants = product.has_variants && product.variants && product.variants.length > 0;
    
    // Get primary image (main_image or thumbnail)
    const primaryImage = product.main_image || product.thumbnail || '/images/placeholder.jpg';
    
    // Generate color swatches if available
    const colorSwatches = hasVariants ? generateColorSwatches(product) : '';
    
    // Generate size options if available
    const sizeOptions = hasVariants ? generateSizeOptions(product) : '';
    
    // Variant count display
    const variantInfo = hasVariants ? `
        <div class="variant-info">
            <span class="variant-count">${product.variant_count || product.variants.length} variants</span>
        </div>
    ` : '';
    
    return `
        <div class="product-card enhanced" data-product-id="${product.id}" data-category="${product.category}" style="animation-delay: ${index * DRESS_CONFIG_ENHANCED.UI.VARIANT_ANIMATION_DELAY}ms">
            <div class="product-image-container">
                <img src="${primaryImage}" 
                     alt="${escapeHtml(product.name)}" 
                     class="product-image main-image"
                     loading="lazy"
                     onerror="handleImageError(this)">
                
                ${hasVariants ? `
                    <div class="variant-preview-container" id="variant-preview-${product.id}">
                        <!-- Variant images will be loaded here dynamically -->
                    </div>
                ` : ''}
                
                <div class="product-actions">
                    <button onclick="toggleFavoriteEnhanced('${product.id}')" 
                            class="action-btn favorite-btn ${isFavorite ? 'active' : ''}" 
                            title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    
                    ${DRESS_CONFIG_ENHANCED.VARIANTS.ENABLE_QUICK_VIEW ? `
                        <button onclick="showProductModalEnhanced('${product.id}')" 
                                class="action-btn quick-view-btn" 
                                title="Quick view">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : ''}
                    
                    <button onclick="redirectToProduct('${product.store_url || '#'}')" 
                            class="action-btn external-btn" 
                            title="View on store">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                </div>
                
                ${variantInfo}
            </div>
            
            <div class="product-details">
                <h4 class="product-name">${escapeHtml(product.name)}</h4>
                
                <div class="product-price">
                    <span class="current-price">${price}</span>
                    ${product.compare_price ? `<span class="original-price">${formatPrice(product.compare_price, product.currency)}</span>` : ''}
                </div>
                
                <div class="product-category">
                    <span class="category-badge">${DRESS_CONFIG.CATEGORIES[product.category] || formatCategoryName(product.category)}</span>
                </div>
                
                ${hasVariants ? `
                    <div class="product-variants">
                        ${colorSwatches}
                        ${sizeOptions}
                    </div>
                ` : ''}
                
                <div class="product-cta">
                    <button onclick="redirectToProduct('${product.store_url || '#'}')" 
                            class="cta-button primary full-width">
                        <span>View Product</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Generate color swatches for variants
function generateColorSwatches(product) {
    if (!product.colors || product.colors.length === 0) return '';
    
    const colors = product.colors.slice(0, DRESS_CONFIG_ENHANCED.VARIANTS.MAX_COLOR_SWATCHES);
    const hasMore = product.colors.length > DRESS_CONFIG_ENHANCED.VARIANTS.MAX_COLOR_SWATCHES;
    
    const swatchesHTML = colors.map(color => {
        const colorValue = getColorValue(color.value || color.display_value);
        return `
            <button class="color-swatch" 
                    data-color="${escapeHtml(color.value)}" 
                    data-product-id="${product.id}"
                    style="background-color: ${colorValue}" 
                    title="${escapeHtml(color.display_value || color.value)}"
                    onclick="selectColorVariant('${product.id}', '${escapeHtml(color.value)}')">
                <span class="color-name">${escapeHtml(color.display_value || color.value)}</span>
            </button>
        `;
    }).join('');
    
    return `
        <div class="color-variants">
            <span class="variant-label">Colors:</span>
            <div class="color-swatches">
                ${swatchesHTML}
                ${hasMore ? `<span class="more-colors">+${product.colors.length - DRESS_CONFIG_ENHANCED.VARIANTS.MAX_COLOR_SWATCHES}</span>` : ''}
            </div>
        </div>
    `;
}

// Generate size options for variants
function generateSizeOptions(product) {
    if (!product.sizes || product.sizes.length === 0) return '';
    
    const sizes = product.sizes.slice(0, DRESS_CONFIG_ENHANCED.VARIANTS.MAX_SIZE_OPTIONS);
    const hasMore = product.sizes.length > DRESS_CONFIG_ENHANCED.VARIANTS.MAX_SIZE_OPTIONS;
    
    const sizesHTML = sizes.map(size => `
        <button class="size-option" 
                data-size="${escapeHtml(size.value)}" 
                data-product-id="${product.id}"
                title="${escapeHtml(size.display_value || size.value)}"
                onclick="selectSizeVariant('${product.id}', '${escapeHtml(size.value)}')">
            ${escapeHtml(size.display_value || size.value)}
        </button>
    `).join('');
    
    return `
        <div class="size-variants">
            <span class="variant-label">Sizes:</span>
            <div class="size-options">
                ${sizesHTML}
                ${hasMore ? `<span class="more-sizes">+${product.sizes.length - DRESS_CONFIG_ENHANCED.VARIANTS.MAX_SIZE_OPTIONS}</span>` : ''}
            </div>
        </div>
    `;
}

// ===== VARIANT INTERACTION FUNCTIONS =====

// Initialize variant interactions
function initializeVariantInteractions() {
    // Add hover effects for color swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('mouseenter', handleColorSwatchHover);
        swatch.addEventListener('mouseleave', handleColorSwatchLeave);
    });
    
    // Add click effects for size options
    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', handleSizeOptionClick);
    });
}

// Handle color swatch selection
function selectColorVariant(productId, colorValue) {
    const product = findProductById(productId);
    if (!product || !product.variants) return;
    
    // Find variant with this color
    const colorVariant = product.variants.find(variant => 
        variant.options.some(option => 
            option.id.toLowerCase().includes('color') && 
            option.value.toLowerCase() === colorValue.toLowerCase()
        )
    );
    
    if (colorVariant) {
        // Update selected variant
        EnhancedAppState.selectedVariants.set(productId, colorVariant.id);
        
        // Update product image if variant has image
        updateProductImage(productId, colorVariant);
        
        // Update UI state
        updateColorSwatchSelection(productId, colorValue);
        
        // Track analytics
        trackEvent('variant_color_selected', {
            product_id: productId,
            color: colorValue,
            variant_id: colorVariant.id
        });
    }
}

// Handle size variant selection
function selectSizeVariant(productId, sizeValue) {
    const product = findProductById(productId);
    if (!product || !product.variants) return;
    
    // Find variant with this size
    const sizeVariant = product.variants.find(variant => 
        variant.options.some(option => 
            option.id.toLowerCase().includes('size') && 
            option.value.toLowerCase() === sizeValue.toLowerCase()
        )
    );
    
    if (sizeVariant) {
        // Update selected variant
        EnhancedAppState.selectedVariants.set(productId, sizeVariant.id);
        
        // Update UI state
        updateSizeOptionSelection(productId, sizeValue);
        
        // Track analytics
        trackEvent('variant_size_selected', {
            product_id: productId,
            size: sizeValue,
            variant_id: sizeVariant.id
        });
    }
}

// Update product image based on selected variant
function updateProductImage(productId, variant) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;
    
    const mainImage = productCard.querySelector('.main-image');
    if (!mainImage) return;
    
    // Find best image from variant
    let newImageUrl = null;
    
    if (variant.files && variant.files.length > 0) {
        const defaultFile = variant.files.find(file => file.is_default && file.visible);
        newImageUrl = defaultFile ? defaultFile.url : variant.files[0].url;
    } else if (variant.product && variant.product.image) {
        newImageUrl = variant.product.image;
    }
    
    if (newImageUrl && newImageUrl !== mainImage.src) {
        // Create fade transition
        mainImage.style.opacity = '0.5';
        
        setTimeout(() => {
            mainImage.src = newImageUrl;
            mainImage.style.opacity = '1';
        }, DRESS_CONFIG_ENHANCED.UI.COLOR_TRANSITION_SPEED / 2);
    }
}

// Update color swatch selection state
function updateColorSwatchSelection(productId, selectedColor) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;
    
    // Remove previous selection
    productCard.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('selected');
    });
    
    // Add selection to current swatch
    const selectedSwatch = productCard.querySelector(`[data-color="${selectedColor}"]`);
    if (selectedSwatch) {
        selectedSwatch.classList.add('selected');
    }
}

// Update size option selection state
function updateSizeOptionSelection(productId, selectedSize) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;
    
    // Remove previous selection
    productCard.querySelectorAll('.size-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selection to current option
    const selectedOption = productCard.querySelector(`[data-size="${selectedSize}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

// Handle color swatch hover for preview
function handleColorSwatchHover(event) {
    if (!DRESS_CONFIG_ENHANCED.VARIANTS.ENABLE_COLOR_PREVIEW) return;
    
    const swatch = event.currentTarget;
    const productId = swatch.dataset.productId;
    const colorValue = swatch.dataset.color;
    
    // Implement color preview logic here
    // This could show a preview of the product in the selected color
}

function handleColorSwatchLeave(event) {
    // Reset to original image if needed
}

function handleSizeOptionClick(event) {
    const option = event.currentTarget;
    const productId = option.dataset.productId;
    const sizeValue = option.dataset.size;
    
    selectSizeVariant(productId, sizeValue);
}

// ===== ENHANCED MODAL FOR PRODUCT VARIANTS =====

// Show enhanced product modal with variant support
function showProductModalEnhanced(productId) {
    const product = findProductById(productId);
    if (!product) return;
    
    const modal = createProductModalEnhanced(product);
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
    
    // Track analytics
    trackEvent('product_modal_opened', {
        product_id: productId,
        has_variants: product.has_variants
    });
}

// Create enhanced product modal with variants
function createProductModalEnhanced(product) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay enhanced';
    
    const price = formatPrice(product.price, product.currency);
    const isFavorite = AppState.favorites.includes(String(product.id));
    const hasVariants = product.has_variants && product.variants && product.variants.length > 0;
    
    // Generate variant sections
    const variantSections = hasVariants ? generateModalVariantSections(product) : '';
    
    modal.innerHTML = `
        <div class="modal enhanced">
            <div class="modal-header">
                <h3 class="modal-title">Product Details</h3>
                <button class="modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                <div class="modal-layout">
                    <div class="modal-image-section">
                        <div class="modal-image-container">
                            <img id="modal-main-image-${product.id}" 
                                 src="${product.main_image || product.thumbnail}" 
                                 alt="${escapeHtml(product.name)}" 
                                 onerror="handleImageError(this)">
                        </div>
                        
                        ${hasVariants ? `
                            <div class="modal-image-gallery" id="modal-gallery-${product.id}">
                                <!-- Variant images will be populated here -->
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-details-section">
                        <div class="modal-product-info">
                            <h4 class="modal-product-name">${escapeHtml(product.name)}</h4>
                            
                            <div class="modal-price">
                                <span class="modal-current-price">${price}</span>
                                ${product.compare_price ? `<span class="modal-original-price">${formatPrice(product.compare_price, product.currency)}</span>` : ''}
                            </div>
                            
                            <div class="modal-category">
                                <span class="modal-category-badge">
                                    ${DRESS_CONFIG.CATEGORIES[product.category] || formatCategoryName(product.category)}
                                </span>
                            </div>
                            
                            ${hasVariants ? `
                                <div class="modal-variant-count">
                                    <i class="fas fa-palette"></i>
                                    ${product.variant_count || product.variants.length} variants available
                                </div>
                            ` : ''}
                        </div>
                        
                        ${variantSections}
                        
                        <div class="modal-actions">
                            <button onclick="toggleFavoriteEnhanced('${product.id}')" 
                                    class="modal-btn secondary" 
                                    id="modal-favorite-${product.id}">
                                <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                                <span>${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                            </button>
                            
                            <button onclick="redirectToProduct('${product.store_url || '#'}')" 
                                    class="modal-btn primary">
                                <span>View Full Product</span>
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Initialize modal variant interactions after creation
    setTimeout(() => {
        initializeModalVariantInteractions(product.id);
        populateModalImageGallery(product);
    }, 100);
    
    return modal;
}

// Generate variant sections for modal
function generateModalVariantSections(product) {
    let sections = '';
    
    // Color variants section
    if (product.colors && product.colors.length > 0) {
        const colorOptions = product.colors.map(color => {
            const colorValue = getColorValue(color.value || color.display_value);
            return `
                <button class="modal-color-option" 
                        data-color="${escapeHtml(color.value)}" 
                        data-product-id="${product.id}"
                        style="background-color: ${colorValue}" 
                        title="${escapeHtml(color.display_value || color.value)}"
                        onclick="selectModalColorVariant('${product.id}', '${escapeHtml(color.value)}')">
                    <span class="color-check"><i class="fas fa-check"></i></span>
                    <span class="color-label">${escapeHtml(color.display_value || color.value)}</span>
                </button>
            `;
        }).join('');
        
        sections += `
            <div class="modal-variant-section">
                <h5 class="variant-section-title">
                    <i class="fas fa-palette"></i>
                    Choose Color
                </h5>
                <div class="modal-color-options">
                    ${colorOptions}
                </div>
            </div>
        `;
    }
    
    // Size variants section
    if (product.sizes && product.sizes.length > 0) {
        const sizeOptions = product.sizes.map(size => `
            <button class="modal-size-option" 
                    data-size="${escapeHtml(size.value)}" 
                    data-product-id="${product.id}"
                    title="${escapeHtml(size.display_value || size.value)}"
                    onclick="selectModalSizeVariant('${product.id}', '${escapeHtml(size.value)}')">
                ${escapeHtml(size.display_value || size.value)}
            </button>
        `).join('');
        
        sections += `
            <div class="modal-variant-section">
                <h5 class="variant-section-title">
                    <i class="fas fa-ruler"></i>
                    Choose Size
                </h5>
                <div class="modal-size-options">
                    ${sizeOptions}
                </div>
            </div>
        `;
    }
    
    return sections;
}

// ===== UTILITY FUNCTIONS =====

// Find product by ID in current products
function findProductById(productId) {
    if (!AppState.products) return null;
    
    let products = [];
    if (Array.isArray(AppState.products)) {
        products = AppState.products;
    } else if (AppState.products.products) {
        products = AppState.products.products;
    }
    
    for (const item of products) {
        const product = item.product || item;
        if (String(product.id) === String(productId)) {
            return product;
        }
    }
    
    return null;
}

// Get color value for CSS (convert color names to hex/rgb if needed)
function getColorValue(colorName) {
    const colorMap = {
        'black': '#000000',
        'white': '#ffffff',
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#00ff00',
        'yellow': '#ffff00',
        'purple': '#800080',
        'orange': '#ffa500',
        'pink': '#ffc0cb',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#a52a2a',
        'navy': '#000080',
        'maroon': '#800000'
    };
    
    const normalizedColor = colorName.toLowerCase().trim();
    return colorMap[normalizedColor] || normalizedColor;
}

// Enhanced favorite toggle
function toggleFavoriteEnhanced(productId) {
    const index = AppState.favorites.indexOf(String(productId));
    
    if (index > -1) {
        AppState.favorites.splice(index, 1);
        showNotification('Removed from favorites', 'info');
    } else {
        AppState.favorites.push(String(productId));
        showNotification('Added to favorites', 'success');
    }
    
    // Save to localStorage
    localStorage.setItem('dress_favorites', JSON.stringify(AppState.favorites));
    
    // Update UI
    updateFavoritesDisplay();
    updateFavoriteButtons(productId);
    
    // Track analytics
    trackEvent('favorite_toggled', {
        product_id: productId,
        action: index > -1 ? 'removed' : 'added'
    });
}

// Update favorite buttons across the UI
function updateFavoriteButtons(productId) {
    const isFavorite = AppState.favorites.includes(String(productId));
    
    // Update product card button
    const cardBtn = document.querySelector(`[data-product-id="${productId}"] .favorite-btn`);
    if (cardBtn) {
        cardBtn.classList.toggle('active', isFavorite);
        const icon = cardBtn.querySelector('i');
        if (icon) {
            icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        }
    }
    
    // Update modal button if open
    const modalBtn = document.getElementById(`modal-favorite-${productId}`);
    if (modalBtn) {
        const icon = modalBtn.querySelector('i');
        const span = modalBtn.querySelector('span');
        if (icon) {
            icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        }
        if (span) {
            span.textContent = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
        }
    }
}

// Enhanced product animations
function setupProductAnimationsEnhanced() {
    const productCards = document.querySelectorAll('.product-card.enhanced');
    
    productCards.forEach((card, index) => {
        // Reset animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        // Trigger animation with delay
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * DRESS_CONFIG_ENHANCED.UI.VARIANT_ANIMATION_DELAY);
    });
}

// Initialize modal variant interactions
function initializeModalVariantInteractions(productId) {
    // Add click handlers for modal variant options
    const modal = document.querySelector('.modal-overlay.enhanced');
    if (!modal) return;
    
    // Color options
    modal.querySelectorAll('.modal-color-option').forEach(option => {
        option.addEventListener('click', () => {
            const color = option.dataset.color;
            selectModalColorVariant(productId, color);
        });
    });
    
    // Size options
    modal.querySelectorAll('.modal-size-option').forEach(option => {
        option.addEventListener('click', () => {
            const size = option.dataset.size;
            selectModalSizeVariant(productId, size);
        });
    });
}

// Modal variant selection functions
function selectModalColorVariant(productId, colorValue) {
    selectColorVariant(productId, colorValue);
    
    // Update modal UI
    const modal = document.querySelector('.modal-overlay.enhanced');
    if (modal) {
        // Remove previous selection
        modal.querySelectorAll('.modal-color-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selection to current option
        const selectedOption = modal.querySelector(`[data-color="${colorValue}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Update modal main image
        const product = findProductById(productId);
        if (product) {
            const variant = product.variants.find(v => 
                v.options.some(opt => 
                    opt.id.toLowerCase().includes('color') && 
                    opt.value.toLowerCase() === colorValue.toLowerCase()
                )
            );
            
            if (variant) {
                updateModalMainImage(productId, variant);
            }
        }
    }
}

function selectModalSizeVariant(productId, sizeValue) {
    selectSizeVariant(productId, sizeValue);
    
    // Update modal UI
    const modal = document.querySelector('.modal-overlay.enhanced');
    if (modal) {
        // Remove previous selection
        modal.querySelectorAll('.modal-size-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Add selection to current option
        const selectedOption = modal.querySelector(`[data-size="${sizeValue}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
}

// Update modal main image
function updateModalMainImage(productId, variant) {
    const mainImage = document.getElementById(`modal-main-image-${productId}`);
    if (!mainImage) return;
    
    // Find best image from variant
    let newImageUrl = null;
    
    if (variant.files && variant.files.length > 0) {
        const defaultFile = variant.files.find(file => file.is_default && file.visible);
        newImageUrl = defaultFile ? defaultFile.url : variant.files[0].url;
    } else if (variant.product && variant.product.image) {
        newImageUrl = variant.product.image;
    }
    
    if (newImageUrl && newImageUrl !== mainImage.src) {
        // Create fade transition
        mainImage.style.opacity = '0.5';
        
        setTimeout(() => {
            mainImage.src = newImageUrl;
            mainImage.style.opacity = '1';
        }, DRESS_CONFIG_ENHANCED.UI.COLOR_TRANSITION_SPEED / 2);
    }
}

// Populate modal image gallery
function populateModalImageGallery(product) {
    const gallery = document.getElementById(`modal-gallery-${product.id}`);
    if (!gallery || !product.variants) return;
    
    // Collect unique images from variants
    const uniqueImages = new Set();
    const imageData = [];
    
    product.variants.forEach(variant => {
        if (variant.files && variant.files.length > 0) {
            variant.files.forEach(file => {
                if (file.visible && !uniqueImages.has(file.url)) {
                    uniqueImages.add(file.url);
                    imageData.push({
                        url: file.url,
                        variant: variant,
                        file: file
                    });
                }
            });
        }
    });
    
    // Generate gallery thumbnails
    const thumbnailsHTML = imageData.slice(0, 6).map(data => `
        <img class="gallery-thumbnail" 
             src="${data.url}" 
             alt="Variant image"
             onclick="updateModalMainImage('${product.id}', ${JSON.stringify(data.variant).replace(/"/g, '&quot;')})">
    `).join('');
    
    gallery.innerHTML = thumbnailsHTML;
}

// Export enhanced functions for global access
window.loadProductsEnhanced = loadProductsEnhanced;
window.displayProductsEnhanced = displayProductsEnhanced;
window.selectColorVariant = selectColorVariant;
window.selectSizeVariant = selectSizeVariant;
window.showProductModalEnhanced = showProductModalEnhanced;
window.toggleFavoriteEnhanced = toggleFavoriteEnhanced;
window.selectModalColorVariant = selectModalColorVariant;
window.selectModalSizeVariant = selectModalSizeVariant;

// Override default product loading with enhanced version
window.loadProducts = loadProductsEnhanced;

// Initialize enhanced features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Enhanced Products functionality initialized');
    
    // Override the original filter function to use enhanced display
    const originalFilterProducts = window.filterProducts;
    window.filterProducts = function(category) {
        AppState.currentFilter = category;
        
        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === category);
        });
        
        // Show/hide category sections
        const categorySections = document.querySelectorAll('.category-section');
        categorySections.forEach(section => {
            const sectionCategory = section.dataset.category;
            if (category === 'all' || sectionCategory === category) {
                section.style.display = 'block';
                section.classList.add('fade-in');
            } else {
                section.style.display = 'none';
                section.classList.remove('fade-in');
            }
        });
        
        // Re-setup animations for visible products
        setTimeout(() => {
            setupProductAnimationsEnhanced();
        }, 100);
        
        // Track analytics
        trackEvent('products_filtered_enhanced', { category });
    };
});