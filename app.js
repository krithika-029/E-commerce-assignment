// TechMart E-commerce Application
// API Configuration - move to config file later
const API_BASE_URL = 'http://localhost:5000/api';

// Main application state manager
// NOTE: Consider using Redux or similar for larger apps
class AppState {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.cart = [];
        this.currentPage = 1;
        this.itemsPerPage = 12; // TODO: make this configurable
        this.pagination = null;
        this.filters = {
            search: '',
            categories: [],
            minPrice: 0,
            maxPrice: 3000, 
            sortBy: 'name-asc'
        };
        this.apiToken = localStorage.getItem('techmart_token');
        this.init();
    }

    init() {
        console.log('🚀 Starting TechMart...');
        this.loadUserSession();
        this.loadProducts();
        this.loadCart();
        this.setupEventListeners();
        this.setupRouting();
        this.renderCurrentPage();
        console.log('✅ App ready!');
    }

    // Helper function for API calls
    // TODO: Add retry logic for failed requests
    async apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.apiToken) {
            config.headers['Authorization'] = `Bearer ${this.apiToken}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Load products from API
    async loadProducts() {
        console.log('🔄 Starting loadProducts...');
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.filters.search,
                minPrice: this.filters.minPrice,
                maxPrice: this.filters.maxPrice
            });

            // Add category filter if selected
            if (this.filters.categories.length > 0) {
                params.append('category', this.filters.categories[0]);
            }

            // Parse sort option (format: "field-direction")
            const sortParts = this.filters.sortBy.split('-');
            params.append('sortBy', sortParts[0]);
            params.append('sortOrder', sortParts[1]);

            console.log('Loading products...');
            const data = await this.apiRequest(`/products?${params}`);

            // Map products and fix ID field for frontend
            this.products = data.products.map(product => ({
                ...product,
                id: product._id 
            }));
            console.log(`Loaded ${this.products.length} products`);
            this.pagination = data.pagination;

            this.renderProducts();
            this.renderCategoryFilters();
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showToast('Failed to load products', 'error');
            // Fallback to empty products array
            this.products = [];
            this.renderProducts();
        }
    }

    async loadUserSession() {
        if (this.apiToken) {
            try {
                const data = await this.apiRequest('/auth/me');
                this.currentUser = {
                    ...data.user,
                    firstName: data.user.firstName,
                    lastName: data.user.lastName
                };
                this.updateAuthUI();
            } catch (error) {
                console.error('Error loading user session:', error);
                localStorage.removeItem('techmart_token');
                this.apiToken = null;
                this.currentUser = null;
                this.updateAuthUI();
            }
        }
    }

    async loadCart() {
        if (this.apiToken && this.currentUser) {
            try {
                const data = await this.apiRequest('/cart');
                this.cart = this.convertCartFormat(data.items);
            } catch (error) {
                console.error('Error loading cart:', error);
                this.cart = [];
            }
        } else {
            // Load from localStorage for non-authenticated users
            const storedCart = localStorage.getItem('techmart_cart');
            this.cart = storedCart ? JSON.parse(storedCart) : [];
        }
        this.updateCartCount();
    }

    // Convert API cart format to frontend format
    convertCartFormat(apiItems) {
        return apiItems.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            addedAt: item.addedAt
        }));
    }

    saveCart() {
        if (!this.apiToken) {
            // Save to localStorage for non-authenticated users
            localStorage.setItem('techmart_cart', JSON.stringify(this.cart));
        }
        this.updateCartCount();
    }

    updateCartCount() {
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cartCount').textContent = count;
    }

    // Authentication Methods
    async login(email, password) {
        try {
            const data = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.apiToken = data.token;
            localStorage.setItem('techmart_token', data.token);
            this.currentUser = data.user;
            this.updateAuthUI();
            this.showToast('Login successful!', 'success');

            // Migrate localStorage cart to server
            if (this.cart.length > 0) {
                await this.migrateCartToServer();
            }

            await this.loadCart();
            this.navigateTo('/');
            return true;
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed', 'error');
            return false;
        }
    }

    async signup(userData) {
        try {
            const data = await this.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            this.apiToken = data.token;
            localStorage.setItem('techmart_token', data.token);
            this.currentUser = data.user;
            this.updateAuthUI();
            this.showToast('Account created successfully!', 'success');

            // Migrate localStorage cart to server
            if (this.cart.length > 0) {
                await this.migrateCartToServer();
            }

            await this.loadCart();
            this.navigateTo('/');
            return true;
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast(error.message || 'Registration failed', 'error');
            return false;
        }
    }

    async migrateCartToServer() {
        for (const item of this.cart) {
            try {
                await this.apiRequest('/cart/add', {
                    method: 'POST',
                    body: JSON.stringify({
                        productId: item.productId,
                        quantity: item.quantity
                    })
                });
            } catch (error) {
                console.error('Error migrating cart item:', error);
            }
        }
        // Clear localStorage cart after migration
        localStorage.removeItem('techmart_cart');
    }

    logout() {
        localStorage.removeItem('techmart_token');
        this.apiToken = null;
        this.currentUser = null;
        this.cart = [];
        this.updateAuthUI();
        this.updateCartCount();
        this.showToast('Logged out successfully', 'info');
        this.navigateTo('/');
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');
        const adminLink = document.getElementById('adminLink');

        if (this.currentUser) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            userMenu.style.display = 'flex';
            userName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;

            if (this.currentUser.role === 'admin') {
                adminLink.style.display = 'block';
            } else {
                adminLink.style.display = 'none';
            }
        } else {
            loginBtn.style.display = 'block';
            signupBtn.style.display = 'block';
            userMenu.style.display = 'none';
            adminLink.style.display = 'none';
        }
    }

    // Product Management
    getProducts() {
        return [...this.products];
    }

    getFilteredProducts() {
        let filtered = [...this.products];

        // Search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search.toLowerCase();
            filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
            );
        }

        // Category filter
        if (this.filters.categories.length > 0) {
            filtered = filtered.filter(product =>
                this.filters.categories.includes(product.category)
            );
        }

        // Price filter
        filtered = filtered.filter(product =>
            product.price >= this.filters.minPrice && product.price <= this.filters.maxPrice
        );

        // Sort
        const [sortBy, order] = this.filters.sortBy.split('-');
        filtered.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (order === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        return filtered;
    }

    async addProduct(productData) {
        try {
            const data = await this.apiRequest('/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            this.showToast('Product added successfully!', 'success');
            await this.loadProducts();
            return data;
        } catch (error) {
            console.error('Add product error:', error);
            this.showToast(error.message || 'Failed to add product', 'error');
            return null;
        }
    }

    async updateProduct(id, productData) {
        try {
            const data = await this.apiRequest(`/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });

            this.showToast('Product updated successfully!', 'success');
            await this.loadProducts();
            return data;
        } catch (error) {
            console.error('Update product error:', error);
            this.showToast(error.message || 'Failed to update product', 'error');
            return null;
        }
    }

    async deleteProduct(id) {
        try {
            await this.apiRequest(`/products/${id}`, {
                method: 'DELETE'
            });

            this.showToast('Product deleted successfully!', 'success');
            await this.loadProducts();
            return true;
        } catch (error) {
            console.error('Delete product error:', error);
            this.showToast(error.message || 'Failed to delete product', 'error');
            return false;
        }
    }

    // Cart Management
    async addToCart(productId, quantity = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return false;

        if (this.apiToken && this.currentUser) {
            try {
                await this.apiRequest('/cart/add', {
                    method: 'POST',
                    body: JSON.stringify({ productId, quantity })
                });

                await this.loadCart();
                this.showToast(`${product.name} added to cart!`, 'success');
                return true;
            } catch (error) {
                console.error('Add to cart error:', error);
                this.showToast(error.message || 'Failed to add to cart', 'error');
                return false;
            }
        } else {
            // For non-authenticated users, use localStorage
            const existingItem = this.cart.find(item => item.productId === productId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                this.cart.push({
                    productId,
                    quantity,
                    addedAt: Date.now()
                });
            }

            this.saveCart();
            this.showToast(`${product.name} added to cart!`, 'success');
            return true;
        }
    }

    async removeFromCart(productId) {
        if (this.apiToken && this.currentUser) {
            try {
                await this.apiRequest(`/cart/remove/${productId}`, {
                    method: 'DELETE'
                });

                await this.loadCart();
                const product = this.products.find(p => p.id === productId);
                this.showToast(`${product?.name} removed from cart`, 'info');
                return true;
            } catch (error) {
                console.error('Remove from cart error:', error);
                this.showToast(error.message || 'Failed to remove from cart', 'error');
                return false;
            }
        } else {
            // For non-authenticated users, use localStorage
            const index = this.cart.findIndex(item => item.productId === productId);
            if (index !== -1) {
                const product = this.products.find(p => p.id === productId);
                this.cart.splice(index, 1);
                this.saveCart();
                this.showToast(`${product?.name} removed from cart`, 'info');
                return true;
            }
            return false;
        }
    }

    async updateCartQuantity(productId, quantity) {
        if (this.apiToken && this.currentUser) {
            try {
                await this.apiRequest('/cart/update', {
                    method: 'PUT',
                    body: JSON.stringify({ productId, quantity })
                });

                await this.loadCart();
                return true;
            } catch (error) {
                console.error('Update cart quantity error:', error);
                this.showToast(error.message || 'Failed to update quantity', 'error');
                return false;
            }
        } else {
            // For non-authenticated users, use localStorage
            const item = this.cart.find(item => item.productId === productId);
            if (item) {
                if (quantity <= 0) {
                    return this.removeFromCart(productId);
                } else {
                    item.quantity = quantity;
                    this.saveCart();
                }
                return true;
            }
            return false;
        }
    }

    getCartItems() {
        return this.cart.map(item => {
            const product = this.products.find(p => p.id === item.productId);
            return {
                ...item,
                product
            };
        }).filter(item => item.product);
    }

    getCartTotal() {
        return this.getCartItems().reduce((total, item) => {
            return total + (item.product.price * item.quantity);
        }, 0);
    }

    async clearCart() {
        if (this.apiToken && this.currentUser) {
            try {
                await this.apiRequest('/cart/clear', {
                    method: 'DELETE'
                });

                await this.loadCart();
            } catch (error) {
                console.error('Clear cart error:', error);
            }
        } else {
            this.cart = [];
            this.saveCart();
        }
    }

    // UI Rendering Methods
    renderProducts() {
        console.log('🎨 Starting renderProducts...');
        const productsGrid = document.getElementById('productsGrid');
        console.log('📍 productsGrid element:', productsGrid);

        const filteredProducts = this.getFilteredProducts();
        console.log('🔍 Filtered products:', filteredProducts.length, 'products');

        if (filteredProducts.length === 0) {
            console.log('⚠️ No products found, showing empty state');
            productsGrid.innerHTML = `
                <div class="empty-products">
                    <h3>No products found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        console.log('✅ Rendering', filteredProducts.length, 'products');
        productsGrid.innerHTML = filteredProducts.map(product => this.createProductCard(product)).join('');

        if (this.pagination) {
            this.renderPagination(this.pagination.totalItems);
        }
        console.log('🎨 renderProducts completed');
    }

    createProductCard(product) {
        return `
            <div class="product-card">
                <div class="product-image">
                    <span class="icon-${product.image}"></span>
                    ${product.featured ? '<div class="product-badge">Featured</div>' : ''}
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-rating">
                        <span class="stars">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</span>
                        <span class="rating-value">(${product.rating})</span>
                    </div>
                    <div class="product-footer">
                        <span class="product-price">$${product.price.toFixed(2)}</span>
                        <button class="btn btn--primary add-to-cart-btn" data-product-id="${product.id}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderPagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!this.pagination) return;

        const { currentPage, totalPages } = this.pagination;

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination">';

        // Previous button
        paginationHTML += `
            <button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    data-page="${currentPage - 1}" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML += `
                    <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML += '<span class="page-ellipsis">...</span>';
            }
        }

        // Next button
        paginationHTML += `
            <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    data-page="${currentPage + 1}"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                Next
            </button>
        `;

        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;
    }

    async renderCategoryFilters() {
        try {
            const categories = await this.apiRequest('/products/categories');
            const categoryFilters = document.getElementById('categoryFilters');

            categoryFilters.innerHTML = categories.map(category => `
                <div class="checkbox-item">
                    <input type="checkbox" id="cat-${category}" value="${category}" 
                           ${this.filters.categories.includes(category) ? 'checked' : ''}>
                    <label for="cat-${category}">${category}</label>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCart() {
        const cartItems = document.getElementById('cartItems');
        const items = this.getCartItems();

        if (items.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <span class="material-icons">shopping_cart</span>
                    <h3>Your cart is empty</h3>
                    <p>Add some products to get started!</p>
                    <button class="btn btn--primary shop-now-btn">Shop Now</button>
                </div>
            `;
        } else {
            cartItems.innerHTML = items.map(item => `
                <div class="cart-item">
                    <div class="cart-item__image">
                        <span class="icon-${item.product.image}"></span>
                    </div>
                    <div class="cart-item__info">
                        <h4 class="cart-item__name">${item.product.name}</h4>
                        <p class="cart-item__category">${item.product.category}</p>
                        <div class="cart-item__controls">
                            <div class="quantity-controls">
                                <button class="quantity-btn" data-action="decrease" data-product-id="${item.productId}">-</button>
                                <span class="quantity-display">${item.quantity}</span>
                                <button class="quantity-btn" data-action="increase" data-product-id="${item.productId}">+</button>
                            </div>
                            <div class="cart-item__price">$${(item.product.price * item.quantity).toFixed(2)}</div>
                        </div>
                    </div>
                    <button class="remove-item-btn" data-product-id="${item.productId}">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            `).join('');
        }

        this.updateCartSummary();
    }

    updateCartSummary() {
        const subtotal = this.getCartTotal();
        const tax = subtotal * 0.085; // 8.5% tax
        const total = subtotal + tax;

        document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('cartTax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;

        const checkoutBtn = document.getElementById('checkoutBtn');
        checkoutBtn.disabled = this.cart.length === 0;
    }

    renderAdminDashboard() {
        if (!this.currentUser || this.currentUser.role !== 'admin') {
            this.navigateTo('/');
            return;
        }

        // Stats
        const totalProducts = this.products.length;
        const categories = [...new Set(this.products.map(p => p.category))];
        const totalValue = this.products.reduce((sum, p) => sum + (p.price * p.stock), 0);

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalCategories').textContent = categories.length;
        document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;

        // Products table
        const tbody = document.getElementById('adminProductsBody');
        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td class="admin-actions">
                    <button class="btn btn--sm btn--outline edit-product-btn" data-product-id="${product.id}">Edit</button>
                    <button class="btn btn--sm btn--outline delete-product-btn" data-product-id="${product.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // Modal Management
    showProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('modalTitle');

        if (product) {
            title.textContent = 'Edit Product';
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productRating').value = product.rating;
        } else {
            title.textContent = 'Add Product';
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
        }

        modal.classList.remove('hidden');
    }

    hideProductModal() {
        document.getElementById('productModal').classList.add('hidden');
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation - Updated to handle clicks properly
        document.addEventListener('click', (e) => {
            // Handle navigation buttons
            if (e.target.hasAttribute('data-route') || e.target.closest('[data-route]')) {
                e.preventDefault();
                e.stopPropagation();
                const element = e.target.hasAttribute('data-route') ? e.target : e.target.closest('[data-route]');
                const route = element.getAttribute('data-route');
                this.navigateTo(route);
                return;
            }

            // Handle shop now button
            if (e.target.classList.contains('shop-now-btn')) {
                e.preventDefault();
                this.navigateTo('/');
                return;
            }
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await this.login(email, password);
        });

        // Signup form
        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;

            if (password !== confirmPassword) {
                document.getElementById('signupError').textContent = 'Passwords do not match';
                return;
            }

            const userData = {
                firstName: document.getElementById('signupFirstName').value,
                lastName: document.getElementById('signupLastName').value,
                email: document.getElementById('signupEmail').value,
                password: password
            };

            await this.signup(userData);
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.logout();
        });

        // Search - Fixed to work properly
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Category filters
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.id.startsWith('cat-')) {
                const category = e.target.value;
                if (e.target.checked) {
                    this.filters.categories.push(category);
                } else {
                    this.filters.categories = this.filters.categories.filter(c => c !== category);
                }
                this.currentPage = 1;
                this.loadProducts();
            }
        });

        // Price filters
        document.getElementById('minPrice').addEventListener('input', (e) => {
            this.filters.minPrice = parseInt(e.target.value);
            document.getElementById('minPriceDisplay').textContent = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        document.getElementById('maxPrice').addEventListener('input', (e) => {
            this.filters.maxPrice = parseInt(e.target.value);
            document.getElementById('maxPriceDisplay').textContent = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Sort
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', (e) => {
            e.preventDefault();
            this.filters = {
                search: '',
                categories: [],
                minPrice: 0,
                maxPrice: 3000,
                sortBy: 'name-asc'
            };
            document.getElementById('searchInput').value = '';
            document.getElementById('minPrice').value = '0';
            document.getElementById('maxPrice').value = '3000';
            document.getElementById('minPriceDisplay').textContent = '0';
            document.getElementById('maxPriceDisplay').textContent = '3000';
            document.getElementById('sortSelect').value = 'name-asc';
            this.currentPage = 1;
            this.renderCategoryFilters();
            this.loadProducts();
        });

        // Add to cart
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                e.preventDefault();
                const productId = e.target.getAttribute('data-product-id');
                this.addToCart(productId);
            }
        });

        // Cart quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                e.preventDefault();
                const productId = e.target.getAttribute('data-product-id');
                const action = e.target.getAttribute('data-action');
                const currentItem = this.cart.find(item => item.productId === productId);

                if (currentItem) {
                    const newQuantity = action === 'increase' ?
                        currentItem.quantity + 1 :
                        currentItem.quantity - 1;
                    this.updateCartQuantity(productId, newQuantity);
                    this.renderCart();
                }
            }
        });

        // Remove from cart
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
                e.preventDefault();
                const btn = e.target.classList.contains('remove-item-btn') ? e.target : e.target.closest('.remove-item-btn');
                const productId = btn.getAttribute('data-product-id');
                this.removeFromCart(productId);
                this.renderCart();
            }
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn') && e.target.hasAttribute('data-page')) {
                e.preventDefault();
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page > 0) {
                    this.currentPage = page;
                    this.loadProducts();
                }
            }
        });

        // Admin product management
        document.getElementById('addProductBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showProductModal();
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-product-btn')) {
                e.preventDefault();
                const productId = e.target.getAttribute('data-product-id');
                const product = this.products.find(p => p.id === productId);
                this.showProductModal(product);
            }

            if (e.target.classList.contains('delete-product-btn')) {
                e.preventDefault();
                const productId = e.target.getAttribute('data-product-id');
                if (confirm('Are you sure you want to delete this product?')) {
                    this.deleteProduct(productId);
                }
            }
        });

        // Product form
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const productData = {
                name: document.getElementById('productName').value,
                category: document.getElementById('productCategory').value,
                price: parseFloat(document.getElementById('productPrice').value),
                description: document.getElementById('productDescription').value,
                stock: parseInt(document.getElementById('productStock').value),
                rating: parseFloat(document.getElementById('productRating').value),
                image: 'book' // Default image
            };

            const productId = document.getElementById('productId').value;
            if (productId) {
                this.updateProduct(productId, productData);
            } else {
                this.addProduct(productData);
            }

            this.hideProductModal();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideProductModal();
        });

        document.getElementById('cancelProduct').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideProductModal();
        });

        document.querySelector('.modal__backdrop').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideProductModal();
        });

        // Checkout button
        document.getElementById('checkoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (this.currentUser) {
                this.showToast('Checkout functionality would be implemented here!', 'info');
            } else {
                this.showToast('Please login to proceed with checkout', 'info');
                this.navigateTo('/login');
            }
        });
    }

    // Routing
    setupRouting() {
        this.currentRoute = '/';
    }

    navigateTo(route) {
        this.currentRoute = route;
        this.renderCurrentPage();
    }

    renderCurrentPage() {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
        });

        // Show current page
        switch (this.currentRoute) {
            case '/':
                document.getElementById('homePage').classList.remove('hidden');
                this.loadProducts();
                break;
            case '/login':
                document.getElementById('loginPage').classList.remove('hidden');
                break;
            case '/signup':
                document.getElementById('signupPage').classList.remove('hidden');
                break;
            case '/cart':
                document.getElementById('cartPage').classList.remove('hidden');
                this.renderCart();
                break;
            case '/admin':
                if (this.currentUser && this.currentUser.role === 'admin') {
                    document.getElementById('adminPage').classList.remove('hidden');
                    this.renderAdminDashboard();
                } else {
                    this.navigateTo('/');
                }
                break;
            default:
                this.navigateTo('/');
        }
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize the application
const app = new AppState();
