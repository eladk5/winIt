# Bids Client

The frontend for the **Bids** auction platform — a real-time bidding marketplace where users can list products for sale and place proxy bids on live auctions.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) |
| UI | [React 19](https://react.dev/) |
| Language | TypeScript 5 |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons | [Material Symbols](https://fonts.google.com/icons) |
| Modals | [SweetAlert2](https://sweetalert2.github.io/) |
| Images | [Cloudinary](https://cloudinary.com/) (upload widget) |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Catalog – browse & bid on live auctions
│   ├── layout.tsx        # Root layout (fonts, navbar, global styles)
│   ├── globals.css       # Tailwind base + custom design tokens
│   ├── auth/             # Login page
│   ├── register/         # User registration
│   ├── sell/             # Create a new auction listing
│   ├── products/         # Product detail & bidding view
│   ├── dashboard/        # Seller dashboard (my listings & bids)
│   └── help/             # How-it-works / FAQ
├── components/           # Shared UI components
│   ├── navbar.tsx        # Top navigation bar
│   ├── brand.tsx         # Logo / brand mark
│   ├── product-form.tsx  # Reusable product create/edit form
│   └── bidding-card.tsx  # Bidding interface card
└── lib/                  # Utilities & services
    ├── api.ts            # Typed API client (fetch wrapper)
    ├── cloudinary.ts     # Cloudinary upload helpers
    ├── format.ts         # Currency & time formatters
    └── swal.ts           # SweetAlert2 modal presets
```

## Pages

| Route | Description |
|---|---|
| `/` | Live auction catalog with category, price, and sort filters |
| `/auth` | Login (with optional `?redirect=` param) |
| `/register` | New user registration |
| `/sell` | Create a new auction listing |
| `/products/[id]` | Product detail page with full bidding UI |
| `/dashboard` | Seller dashboard — my listings & bid history |
| `/help` | How bidding works |

## Prerequisites

- **Node.js** 20+
- **npm**
- A running instance of the **bids-server** (Spring Boot backend on port `8080`)

## Environment Variables

Create a `.env.local` file in the `bids-client/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### API Proxy

The Next.js server automatically proxies API calls to the backend so the browser never hits a different origin (avoiding CORS / cookie issues):

| Frontend path | Proxied to |
|---|---|
| `/api/*` | `http://localhost:8080/api/*` |
| `/uploads/*` | `http://localhost:8080/uploads/*` |

This is configured via `rewrites()` in `next.config.ts`.

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev
```

## Available Scripts

| Script | Command | Description |
|---|---|---|
| **dev** | `npm run dev` | Start Next.js dev server with hot-reload |
| **build** | `npm run build` | Create an optimized production build |
| **start** | `npm run start` | Serve the production build |
| **lint** | `npm run lint` | Run ESLint across the codebase |
