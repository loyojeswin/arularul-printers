# Arul Printers - Full Stack Platform

Production-ready starter for B2B + B2C printing orders.

## Stack
- Frontend: Next.js (App Router) + Tailwind CSS
- Backend: Node.js + Express + Prisma
- DB: PostgreSQL
- Auth: JWT
- Uploads: Local filesystem
- Payments: Razorpay-ready module scaffold

## Project Structure
- `frontend/`: public website + customer dashboard
- `backend/`: API, auth, orders, admin, pricing
- `shared/`: reusable types/constants

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
3. Configure PostgreSQL in `backend/.env`.
4. Run Prisma:
   ```bash
   npm run prisma:generate -w backend
   npm run prisma:migrate -w backend -- --name init
   npm run prisma:seed -w backend
   ```
5. Start apps:
   ```bash
   npm run dev
   ```

## Core Capabilities Included
- JWT signup/login
- Products + pricing options
- Dynamic quote and order total logic
- Create order with file upload support
- User order history + reorder endpoint
- Admin order status + revenue summary endpoint
- Admin product CRUD (create, edit, deactivate/activate)
- Admin product media upload (multiple images/videos per product)
- Likes/Saves/Cart persisted in PostgreSQL (no localStorage cart data)
- Auth uses HttpOnly cookie (`/api/auth/login` sets cookie, `/api/auth/logout` clears it)
- Product actions: Like + Add to cart (Save removed)

## Seeded Admin Account
- Email: `admin@arulprinters.com`
- Password: `Admin@123`

- Email: `loyo@gmail.com`
- Password: `Loyo@123`
