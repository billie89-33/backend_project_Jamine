# Project Jamine - Backend API

A high-performance E-commerce backend built with Node.js, Express, and MongoDB. This project focuses on dynamic product management, efficient cart systems, and robust administrative features.

## 🚀 Features

- **Dynamic Product Management:** Flexible categorization and smart normalization with automated specification templates.
- **Advanced Cart & Order System:** Centralized price calculations, multi-level address management, and atomic checkout processes.
- **Admin Dashboard:** Comprehensive CRUD for products, banners, orders, and user management with analytics-ready endpoints.
- **Robust Security:** JWT-based authentication, role-based access control (RBAC), and rate limiting.
- **Cloudinary Integration:** Seamless image hosting and management.

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Storage:** Cloudinary
- **Authentication:** JWT (JSON Web Tokens)
- **Environment Management:** Dotenv

## 📂 Project Structure

- `src/controllers/`: Business logic divided by version (v1/v2) and scope (admin/public).
- `src/models/`: Mongoose schemas for Users, Products, Orders, Carts, and Banners.
- `src/routes/`: Express route definitions.
- `src/middlewares/`: Auth, Upload, Validation, and Error handling.
- `src/utils/`: Helper functions for tokens, calculations, and keys.
- `src/constants/`: Centralized status strings and configuration values.

## ⚙️ Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env` file in the root directory based on `.env.example` (if available) and add your credentials:
   - `PORT=4001`
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

4. **Run the server:**
   ```bash
   npm start
   ```

## 📜 Documentation

- The API endpoints are documented in `.rest` files within `src/test.http/` for easy testing with VS Code REST Client.
- Architectural decisions and master skills are maintained locally in the `docs-backend/` directory.

---
Developed with focus on **Scalability**, **Maintainability**, and **Developer Experience**.
