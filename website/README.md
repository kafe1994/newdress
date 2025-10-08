# DRESS - Premium Custom Apparel Website

## Descripción

Website frontend completamente reescrito y optimizado para consumir la API de Printful a través del Cloudflare Worker. Diseño moderno, responsivo y enfocado en mostrar productos con todas sus variantes, colores e imágenes de manera elegante.

## Características

### ✨ Funcionalidades Principales
- **Consumo de API**: Integración optimizada con `https://newdress-cgz.pages.dev/api/printful/products`
- **Variantes de Productos**: Visualización completa de colores, tallas y opciones disponibles
- **Diseño Responsivo**: Adaptable a todos los dispositivos (móvil, tablet, desktop)
- **Tema Oscuro/Claro**: Toggle para cambiar entre temas
- **Filtros por Categoría**: Navegación fácil por tipos de productos
- **Estados de Carga**: Loading, error y estados vacíos bien manejados
- **SEO Optimizado**: Metadatos y estructura semántica

### 🎨 Tecnologías Utilizadas
- **HTML5**: Estructura semántica y accesible
- **CSS3**: Variables CSS, Grid, Flexbox, animaciones fluidas
- **JavaScript ES6+**: Async/await, fetch API, manejo de errores robusto
- **Font Awesome**: Iconografía moderna
- **Google Fonts**: Tipografías Inter y Playfair Display

### 📱 Diseño Responsivo
- **Desktop**: Layout completo con grid de productos
- **Tablet**: Adaptación de columnas y navegación
- **Móvil**: Menú hamburguesa y layout optimizado

## Estructura de Archivos

```
website-modified/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos completos y responsivos
├── js/
│   └── app.js          # Lógica de aplicación y API
└── assets/             # Carpeta para assets adicionales
```

## Configuración de API

El website está configurado para consumir la API de Printful desde:
- **Endpoint**: `https://newdress-cgz.pages.dev/api/printful/products`
- **Método**: GET con headers JSON
- **Reintentos**: 3 intentos automáticos en caso de fallo
- **Timeout**: 15 segundos por petición

## Características del Código

### JavaScript Modular
- Configuración centralizada
- Manejo robusto de errores
- Reintentos automáticos para API
- Cache inteligente
- Notificaciones de usuario

### CSS Avanzado
- Variables CSS para temas
- Grid y Flexbox para layouts
- Animaciones y transiciones suaves
- Estados hover y focus
- Compatibilidad con reducción de movimiento

### HTML Semántico
- Estructura accesible
- Metadatos SEO
- Enlaces de navegación smooth scroll
- Formulario de contacto funcional

## Instalación y Uso

1. **Subir archivos**: Copiar toda la carpeta `website-modified` a tu servidor
2. **Configurar dominio**: Apuntar tu dominio a la carpeta raíz
3. **Verificar API**: Confirmar que la API de Printful responde correctamente
4. **Personalizar**: Modificar colores, textos y configuración según necesidades

## Personalización

### Colores y Branding
Editar variables CSS en `style.css`:
```css
:root {
    --primary-orange: #ff6b35;
    --accent-gold: #ffd700;
    --primary-black: #1a1a1a;
    /* ... más variables */
}
```

### Configuración de API
Modificar en `app.js`:
```javascript
const CONFIG = {
    API: {
        BASE_URL: 'https://newdress-cgz.pages.dev/api/printful',
        ENDPOINTS: {
            PRODUCTS: '/products'
        }
    }
};
```

## Compatibilidad

- **Navegadores**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Dispositivos**: Móviles, tablets, desktops
- **Resoluciones**: 320px - 2560px+
- **Accesibilidad**: WCAG 2.1 AA compatible

## Optimizaciones Incluidas

- **Performance**: Lazy loading de imágenes, código minificado
- **SEO**: Meta tags, estructura semántica, sitemap friendly
- **UX**: Estados de carga, animaciones suaves, feedback visual
- **Accesibilidad**: Contraste adecuado, navegación por teclado, screen readers

## Próximas Mejoras

- Integración con carrito de compras
- Sistema de wishlist persistente
- Búsqueda de productos
- Filtros avanzados por precio/color
- Integración con analytics

---

**Desarrollado para Dress - Premium Custom Apparel**  
*Website optimizado para Printful API y Cloudflare Worker*