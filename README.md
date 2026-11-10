# codealpha_3.-Restaurant-Management-System 🍽️

A full-stack, production-grade Restaurant Management System built with **Node.js, Express.js, EJS, Vanilla JavaScript, CSS3, and native SQLite (`node:sqlite`)**.

Designed to handle real-time restaurant operations including table booking with collision prevention, POS and online ordering, recipe-based automatic inventory deduction, low-stock alerts, and financial sales reporting.

---

## 🌟 Key Features

### 1. 📋 Menu Operations & Catalog
- Categorized menu (Starters, Wood-Fired Pizzas, Artisan Burgers, Main Courses, Desserts, Beverages).
- Instant client-side search and category filtering.
- Admin CRUD: Add new dishes, change pricing, and toggle instant item availability.

### 2. 🪑 Smart Table Availability & Reservations
- Real-time availability calculation based on party size (`guest_count`) and overlapping dining windows (90-minute slot algorithm).
- Visual table selection with seating capacities and section locations (Window Bay, Main Hall, Patio, VIP Booth).
- Administrative reservations book with quick action to seat guests (which automatically transitions table status to **occupied**).

### 3. 🛒 Order Processing & POS
- Supports **Dine-In** (linked directly to a physical table) and **Takeaway** orders.
- Dynamic cart with live quantity management and subtotal calculation.
- Status lifecycle: `pending` ➔ `in-preparation` ➔ `ready` ➔ `served` ➔ `completed`.
- Completing a dine-in order automatically frees up the table to `available`.

### 4. 📦 Automatic Inventory & Recipe Deduction
- Menu items are mapped to raw ingredients in `menu_item_ingredients`.
- When an order is placed, required stock is automatically deducted within an atomic database transaction.
- Verifies stock availability prior to order confirmation; prevents overselling if inventory is insufficient.
- Low-stock threshold tracking (`quantity <= min_threshold`) with prominent dashboard warnings.
- One-click restock modal to replenish kitchen supplies.

### 5. 📊 Admin Management & Sales Reports
- **Executive Dashboard**: Today's revenue, all-time sales, active kitchen queue count, table occupancy rate, low-stock warnings, and top-selling dishes.
- **Kitchen POS Display**: Real-time tickets feed with status-advancing buttons.
- **Interactive Floor Plan**: Live visual status for every table (Available, Occupied, Reserved).
- **Inventory Manager**: Visual stock health bars and instant restock controls.

### 6. 🔍 Live Customer Order Tracker
- Customers can track their order status (`#ORD-YYYYMMDD-XXXX`) in real time with an interactive progress stepper.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+ / v24)
- **Backend Framework**: Express.js
- **View Engine**: EJS (Server-side rendering with modular partials)
- **Database**: Native SQLite via `node:sqlite` (zero external database setup required, persistent file `restaurant.db`)
- **Frontend**: Vanilla JavaScript (ES6+ fetch, DOM manipulation, no React)
- **Styles**: Custom CSS3 (warm bistro aesthetic, responsive flex/grid layouts, badges, modal dialogs)

---

## 📁 Project Structure

```
3. Restaurant Management System/
├── package.json               # Dependencies and scripts
├── server.js                  # Application entry point and server configuration
├── restaurant.db              # Persistent SQLite database file
├── db/
│   ├── database.js            # SQLite database initialization & transaction helpers
│   └── seed.js                # Initial seed data (tables, categories, dishes, inventory)
├── services/
│   ├── inventoryService.js    # Stock deduction, low-stock alerts, restocking
│   ├── tableService.js        # Table availability algorithms and occupancy
│   ├── orderService.js        # Order creation, atomic transactions, status flow
│   └── reportService.js       # Daily sales, revenue metrics, popular items
├── controllers/
│   ├── menuController.js      # Menu API and public views
│   ├── orderController.js     # Order placement and tracking
│   ├── tableController.js     # Table floor plan and status
│   ├── reservationController.js # Availability checking and booking
│   ├── inventoryController.js # Stock management and alerts
│   └── adminController.js     # Dashboard views and statistics
├── routes/
│   ├── apiRoutes.js           # RESTful JSON APIs (/api/...)
│   └── viewRoutes.js          # EJS rendered page routes (/, /menu, /order, etc.)
├── public/
│   ├── css/
│   │   ├── style.css          # Main customer stylesheet
│   │   └── admin.css          # Admin panel & dashboard stylesheet
│   └── js/
│       ├── main.js            # Toasts, modals, and badge counters
│       ├── cart.js            # Shopping cart and order checkout
│       ├── reservation.js     # Interactive table reservation
│       ├── tracker.js         # Real-time order progress stepper
│       └── admin.js           # Admin panel status changers and modals
├── views/
│   ├── partials/
│   │   ├── header.ejs         # Customer navbar and head
│   │   ├── footer.ejs         # Customer footer and scripts
│   │   ├── admin-header.ejs   # Admin sidebar and topbar
│   │   └── admin-footer.ejs   # Admin scripts and closing tags
│   └── pages/
│       ├── index.ejs          # Customer landing page
│       ├── menu.ejs           # Filterable menu with Add-to-Cart
│       ├── order.ejs          # Cart review and checkout
│       ├── reserve.ejs        # Table reservation with live slots
│       ├── track.ejs          # Order tracking page
│       ├── 404.ejs            # Error 404 page
│       └── admin/
│           ├── dashboard.ejs  # Sales KPIs, alerts, popular items
│           ├── orders.ejs     # Kitchen POS order tickets
│           ├── tables.ejs     # Dining room floor plan
│           ├── reservations.ejs # Reservation book
│           ├── menu-manage.ejs  # Menu CRUD and availability switch
│           └── inventory.ejs  # Stock health and restock tools
└── test/
    └── api-test.js            # End-to-end automated test suite
```

---

## 🚀 Getting Started

### 1. Installation

Make sure [Node.js](https://nodejs.org/) (v20 or higher) is installed.

```bash
cd "D:\Dipak Projects\Code Alpha Internship\3. Restaurant Management System"
npm install
```

### 2. Seed Database (Optional)

The database auto-seeds on first application start, but you can also run the seed script directly:

```bash
npm run seed
```

### 3. Start the Server

```bash
npm start
```

Access the application in your browser:

- 🌐 **Customer Home**: [http://localhost:3000/](http://localhost:3000/)
- 📋 **Food Menu**: [http://localhost:3000/menu](http://localhost:3000/menu)
- 🪑 **Table Reservation**: [http://localhost:3000/reserve](http://localhost:3000/reserve)
- 🛒 **Order Online / Dine-In**: [http://localhost:3000/order](http://localhost:3000/order)
- 🔍 **Track Order**: [http://localhost:3000/track](http://localhost:3000/track)
- 📊 **Admin & Kitchen Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🧪 Running the Verification Test Suite

Run the automated test suite covering database operations, inventory deductions, and API endpoints:

```bash
npm test
```

Expected output:
```
=============================================================
TEST SUITE RESULTS: 31 Passed, 0 Failed
=============================================================
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/menu` | List all menu items (filter by `category`, `search`) |
| `GET` | `/api/menu/categories` | Get all food categories |
| `POST` | `/api/menu` | Add new menu item |
| `PUT` | `/api/menu/:id` | Update menu item / toggle availability |
| `DELETE` | `/api/menu/:id` | Delete menu item |
| `GET` | `/api/tables` | Get all tables with real-time operational context |
| `GET` | `/api/tables/available` | Find free tables for `date`, `time`, and `guests` |
| `POST` | `/api/tables` | Add new dining table |
| `PATCH` | `/api/tables/:id/status` | Update table status (`available`, `occupied`, `reserved`) |
| `GET` | `/api/reservations` | List reservations (filter by `date`, `status`) |
| `POST` | `/api/reservations` | Reserve table with collision check |
| `PATCH` | `/api/reservations/:id/status` | Update status (`seated`, `completed`, `cancelled`) |
| `POST` | `/api/orders` | Place order (deducts inventory, sets table occupied) |
| `GET` | `/api/orders` | List orders (filter by `status`, `orderType`) |
| `GET` | `/api/orders/track/:orderNumber` | Lookup order details by order number |
| `PATCH` | `/api/orders/:id/status` | Update order state (`pending` ➔ `completed`) |
| `PATCH` | `/api/orders/:id/payment` | Mark order paid |
| `GET` | `/api/inventory` | List stock items with low-stock flag |
| `GET` | `/api/inventory/alerts` | Get low stock warning list |
| `POST` | `/api/inventory/:id/restock` | Restock an ingredient |
| `GET` | `/api/reports/dashboard` | Get KPIs: daily revenue, active orders, occupancy |
