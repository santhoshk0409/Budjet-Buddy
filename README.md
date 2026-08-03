# Wallet Buddy (Budjet-Buddy) 💰

A **modern, premium, mobile-first Personal Finance Budget & Expense Tracker** built with **Vite, React 19, TypeScript, TailwindCSS v4, Material Design 3, Dexie.js (IndexedDB), and Supabase Cloud Backend**.

---

## 🌟 Key Features

- **Mobile-First Material Design 3**: Rounded cards, smooth animations, responsive layout, light/dark themes.
- **Supabase Cloud Backend**: PostgreSQL database, Supabase Auth, and real-time cross-device sync.
- **Offline-First Capabilities**: Fast IndexedDB local database storage via Dexie.js.
- **Multi-Wallet Budgeting**: Color-coded progress bars with Green (0–69%), Orange (70–89%), Red (90–100%), and Exceeded alerts.
- **Expense History & Interactive Calendar**: Single day selection, 2-click / point-and-scroll date range selection.
- **Spending Analytics & Reports**: Overview metrics, wallet breakdowns, category rankings, and text/CSV report exporter.
- **Data Backup & Restore**: Instant CSV & JSON export/import.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build production bundle
npm run build
```

---

## 🛠️ Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

## 🌐 Deploy to Vercel

1. Import this repository on [https://vercel.com](https://vercel.com).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Environment Variables.
3. Click **Deploy**!
