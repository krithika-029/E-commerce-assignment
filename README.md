# TechMart E-commerce Store

A modern e-commerce web application built with vanilla JavaScript and Node.js. This project was created as part of learning full-stack development.

## What is TechMart?

TechMart is a responsive e-commerce platform where users can browse and purchase tech products. It features a clean, modern design and includes both customer and admin functionality.

### Key Features

- Browse products with search and filtering
- Add items to shopping cart (persists between sessions)
- User registration and authentication 
- Admin panel for managing products
- Responsive design that works on mobile and desktop
- Real-time cart updates

## Getting Started

### What you'll need
- Node.js (I'm using v18, but v16+ should work)
- A web browser
- Basic knowledge of JavaScript

### Running the project

1. **Download/Clone the project**
   ```bash
   git clone <your-repo-url>
   cd ecommerce-spa
   ```

2. **Start the backend**
   ```bash
   cd backend
   npm install
   node server-test.js
   ```
   The API will start on http://localhost:5000

3. **Start the frontend**
   ```bash
   # In the main project folder
   python -m http.server 3000
   # Or use any static file server you prefer
   ```
   Open http://localhost:3000 in your browser

## � Test Accounts

I've included some demo accounts for testing:

**Admin User:**
- Email: admin@ecommerce.com  
- Password: admin123

**Regular User:**
- Email: user@example.com
- Password: password123

## Project Structure

```
ecommerce-spa/
├── backend/              # Backend API
│   ├── server-test.js   # Main server file
│   └── package.json     # Dependencies
├── index.html           # Main HTML file  
├── app.js              # Frontend JavaScript
├── style.css           # All the styling
└── README.md           # This file
```
2. Set up MongoDB Atlas database
3. Configure environment variables
4. Deploy backend to Heroku
5. Deploy frontend to Netlify/Vercel

#### Option 2: Railway
1. Connect GitHub repository to Railway
2. Configure environment variables
3. Deploy with automatic CI/CD

#### Option 3: Render
1. Connect GitHub repository to Render
2. Configure environment variables
3. Deploy backend and frontend

### Environment Variables

```env
# Backend (.env file)
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/techmart
FRONTEND_URL=https://your-frontend-domain.com
```

```javascript
// Frontend (app.js)
const API_BASE_URL = 'https://your-backend-domain.com/api';
```

## Project Structure

```
ecommerce-spa/
├── backend/
│   ├── server.js           # Express server and API routes
│   ├── package.json        # Backend dependencies
│   ├── .env               # Environment variables
│   └── README.md          # Backend documentation
├── index.html             # Main HTML file
├── app.js                 # Frontend JavaScript (API integrated)
├── style.css              # Complete CSS styles
└── README.md              # This file
```

## Design System

The application uses a comprehensive design system with:
- **Colors**: Semantic color tokens for consistent theming
- **Typography**: Professional font stack with FKGroteskNeue
- **Components**: Reusable UI components (buttons, cards, forms)
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG compliant with focus states and ARIA labels

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get products with filtering/pagination
- `GET /api/products/categories` - Get all categories
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/remove/:productId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure authentication tokens
- **Rate Limiting**: API request rate limiting
- **CORS Protection**: Cross-origin request protection
- **Input Validation**: Server-side input validation
- **Security Headers**: Helmet.js security headers

## Performance Features

- **Lazy Loading**: Efficient product loading with pagination
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression for API responses
- **Optimized Queries**: Efficient MongoDB queries
- **CDN Ready**: Static assets can be served from CDN

## Key Features Implemented

✅ **Authentication**: JWT-based login/signup
✅ **Product CRUD**: Full product management
✅ **Cart Management**: Add/remove/update cart items
✅ **Filtering**: Search, category, price range filters
✅ **Pagination**: Efficient product pagination
✅ **Admin Panel**: Complete admin dashboard
✅ **Responsive Design**: Mobile-friendly interface
✅ **Cart Persistence**: Cart survives logout/login
✅ **Real-time Updates**: Live cart and product updates
✅ **Professional UI**: Modern, clean design

## Future Enhancements

- **Payment Integration**: Stripe/PayPal integration
- **Order Management**: Order history and tracking
- **Product Images**: Image upload and management
- **Email Notifications**: Order confirmations and updates
- **Inventory Management**: Stock tracking and alerts
- **Reviews & Ratings**: User product reviews
- **Wishlist**: Save products for later
- **Social Login**: Google/Facebook authentication

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---


