// TechMart Backend Server
// Simple test server with in-memory data storage
// TODO: Replace with actual MongoDB when ready for production

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Basic security setup
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false  // disabled for development
}));

// Rate limiting - maybe too strict for dev?
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // increased limit for testing
    message: 'Too many requests, please slow down!'
});
app.use('/api/', limiter);

// CORS setup - allowing everything for now
app.use(cors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory data storage for testing (replace with MongoDB in production)
let users = [];
let products = [];
let carts = [];
let nextUserId = 1;
let nextProductId = 1;
let nextCartId = 1;

// Initialize sample data
const initializeSampleData = () => {
    // Sample users
    users = [
        {
            id: nextUserId++,
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@ecommerce.com',
            password: bcrypt.hashSync('admin123', 12),
            role: 'admin'
        },
        {
            id: nextUserId++,
            firstName: 'John',
            lastName: 'Doe',
            email: 'user@example.com',
            password: bcrypt.hashSync('password123', 12),
            role: 'customer'
        }
    ];

    // Sample products
    products = [
        {
            id: nextProductId++,
            _id: 'product1',
            name: "MacBook Pro 16-inch",
            category: "Electronics",
            price: 2499,
            description: "Powerful laptop with M2 chip, perfect for professionals and creators.",
            image: "laptop",
            stock: 15,
            rating: 4.8,
            featured: true
        },
        {
            id: nextProductId++,
            _id: 'product2',
            name: "Wireless Bluetooth Headphones",
            category: "Electronics",
            price: 199,
            description: "High-quality noise-cancelling headphones with 30-hour battery life.",
            image: "headphones",
            stock: 25,
            rating: 4.5,
            featured: false
        },
        {
            id: nextProductId++,
            _id: 'product3',
            name: "Designer Cotton T-Shirt",
            category: "Clothing",
            price: 35,
            description: "Premium cotton t-shirt with modern fit and sustainable materials.",
            image: "tshirt",
            stock: 50,
            rating: 4.2,
            featured: false
        },
        {
            id: nextProductId++,
            _id: 'product4',
            name: "JavaScript: The Complete Guide",
            category: "Books",
            price: 45,
            description: "Comprehensive guide to modern JavaScript programming techniques.",
            image: "book",
            stock: 30,
            rating: 4.7,
            featured: true
        },
        {
            id: nextProductId++,
            _id: 'product5',
            name: "Smart Home Security Camera",
            category: "Home",
            price: 129,
            description: "4K resolution security camera with motion detection and night vision.",
            image: "camera",
            stock: 20,
            rating: 4.4,
            featured: false
        },
        {
            id: nextProductId++,
            _id: 'product6',
            name: "Running Shoes - Ultra Boost",
            category: "Sports",
            price: 180,
            description: "Premium running shoes with responsive cushioning and breathable design.",
            image: "shoes",
            stock: 40,
            rating: 4.6,
            featured: true
        }
    ];

    console.log('Sample data initialized');
    console.log(`${users.length} users created`);
    console.log(`${products.length} products created`);
};

// JWT middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = users.find(u => u.id === decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Initialize sample data
initializeSampleData();

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'TechMart API is running' });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = {
            id: nextUserId++,
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: 'customer'
        };

        users.push(user);

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search = '',
            category = '',
            minPrice = 0,
            maxPrice = 10000,
            sortBy = 'name',
            sortOrder = 'asc'
        } = req.query;

        // Filter products
        let filteredProducts = [...products];

        if (search) {
            const searchTerm = search.toLowerCase();
            filteredProducts = filteredProducts.filter(product =>
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        }

        if (category) {
            filteredProducts = filteredProducts.filter(product => product.category === category);
        }

        filteredProducts = filteredProducts.filter(product =>
            product.price >= Number(minPrice) && product.price <= Number(maxPrice)
        );

        // Sort products
        filteredProducts.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            } else {
                return aVal > bVal ? 1 : -1;
            }
        });

        // Paginate
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

        // Add cache control headers for development
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json({
            products: paginatedProducts,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(filteredProducts.length / Number(limit)),
                totalItems: filteredProducts.length,
                itemsPerPage: Number(limit)
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/products/categories', async (req, res) => {
    try {
        const categories = [...new Set(products.map(p => p.category))];

        // Add cache control headers for development
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = products.find(p => p.id === Number(req.params.id) || p._id === req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const product = {
            id: nextProductId++,
            _id: `product${nextProductId}`,
            ...req.body,
            rating: parseFloat(req.body.rating) || 4.0,
            featured: false
        };

        products.push(product);
        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productIndex = products.findIndex(p => p.id === Number(req.params.id) || p._id === req.params.id);

        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }

        products[productIndex] = { ...products[productIndex], ...req.body };
        res.json(products[productIndex]);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productIndex = products.findIndex(p => p.id === Number(req.params.id) || p._id === req.params.id);
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }

        products.splice(productIndex, 1);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Cart Routes
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        let cart = carts.find(c => c.userId === req.user.id);

        if (!cart) {
            cart = { userId: req.user.id, items: [] };
            carts.push(cart);
        }

        // Populate product details
        const populatedItems = cart.items.map(item => ({
            ...item,
            productId: {
                ...products.find(p => p.id === item.productId || p._id === item.productId),
                _id: item.productId
            }
        }));

        res.json({ ...cart, items: populatedItems });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/cart/add', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        // Validate product exists
        const product = products.find(p => p.id === productId || p._id === productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let cart = carts.find(c => c.userId === req.user.id);

        if (!cart) {
            cart = { userId: req.user.id, items: [] };
            carts.push(cart);
        }

        // Check if item already exists in cart
        const existingItem = cart.items.find(item => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += Number(quantity);
        } else {
            cart.items.push({ productId, quantity: Number(quantity), addedAt: new Date() });
        }

        // Populate product details for response
        const populatedItems = cart.items.map(item => ({
            ...item,
            productId: {
                ...products.find(p => p.id === item.productId || p._id === item.productId),
                _id: item.productId
            }
        }));

        res.json({ ...cart, items: populatedItems });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/cart/update', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        let cart = carts.find(c => c.userId === req.user.id);

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.productId === productId);

        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = Number(quantity);
        }

        // Populate product details for response
        const populatedItems = cart.items.map(item => ({
            ...item,
            productId: {
                ...products.find(p => p.id === item.productId || p._id === item.productId),
                _id: item.productId
            }
        }));

        res.json({ ...cart, items: populatedItems });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;

        let cart = carts.find(c => c.userId === req.user.id);

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        cart.items = cart.items.filter(item => item.productId !== productId);

        // Populate product details for response
        const populatedItems = cart.items.map(item => ({
            ...item,
            productId: {
                ...products.find(p => p.id === item.productId || p._id === item.productId),
                _id: item.productId
            }
        }));

        res.json({ ...cart, items: populatedItems });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
    try {
        let cart = carts.find(c => c.userId === req.user.id);

        if (!cart) {
            cart = { userId: req.user.id, items: [] };
            carts.push(cart);
        } else {
            cart.items = [];
        }

        res.json(cart);
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Backend ready - using in-memory storage');
});

module.exports = app;
