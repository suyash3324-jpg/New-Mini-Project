# ShopInsight

ShopInsight turns a shop's Excel or CSV sales records into an interactive, browser-based analytics dashboard. The app does not require an account. Spreadsheet parsing, calculations, charts, and exports run in the visitor's browser.

## Current architecture

- `client/`: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Recharts, SheetJS, Zod, and Lucide.
- `client/src/utils/`: spreadsheet parsing/validation, calculation functions, demo data, and report downloads.
- `client/src/context/`: tab-memory sales and inventory state, plus persisted theme preference.
- `client/src/pages/`: overview, import, product analytics, sales records, inventory, reports, and settings.
- `client/src/**/*.test.*`: Vitest unit and theme tests.

There is currently **no Express server, SQLite database, or Prisma schema**. This is intentional for the anonymous first version: a shared server-side workspace would let unrelated visitors risk seeing each other's data. The current app needs no backend for its main workflow and does not transmit sales files. Inventory is session-only too. If persistence is added later, it must have an explicitly isolated local-workspace design and clear privacy boundaries before it stores business data.

## Requirements and setup

Tested with Node.js 24.15.0 and npm 11.12.1.

```sh
npm install
npm run dev
```

Vite prints a local URL (normally `http://localhost:5173`). For a production build and local preview:

```sh
npm run build
npm --workspace client run preview
```

Run the unit tests:

```sh
npm test
```

`.env.example` is provided for future deployment configuration; no environment variables are currently required.

## Use the app

1. Open **Import data**, choose a `.xlsx`, `.xls`, or `.csv` file, or drag it onto the upload area.
2. Select a worksheet if needed, review the preview, and correct suggested column mappings.
3. Validate the rows. Review invalid records, potential duplicate transaction lines, and revenue discrepancies.
4. Confirm import. Potential duplicates are excluded by default, but can be explicitly included. A new import replaces the current dataset after confirmation.
5. Explore the overview, sales records, product analytics, and generated reports. Choose a date period and product/category filters on the overview.
6. Use **Settings** to choose Light, Dark, or System appearance. Use the chart PNG buttons, reports downloads, or the Excel template.
7. Use **Clear** in the top bar to discard the current analysis, or open Settings to reset the demo.

The deterministic demo dataset is clearly labeled and is never merged into an uploaded dataset.

## Supported input

- `.xlsx`, `.xls`, `.csv`
- Maximum file size: 10 MB
- Maximum worksheet size: 20,000 non-header rows and 200 columns
- First row must contain unique, non-empty headers
- Required: date, product, quantity, and either total revenue or unit selling price
- Optional: transaction/invoice ID, SKU, category, unit cost, and discount

Common aliases such as `Sale Date`, `Order Date`, `Item`, `Qty`, `Price`, `Total Sales`, `Purchase Price`, and `Discount Amount` are suggested automatically. Header mapping can be changed before validation.

## Calculation and privacy conventions

- A provided revenue/amount column is used as the source of truth. If unit price is also mapped, material differences from quantity × price less discount are flagged.
- Without a total-revenue column, revenue is `quantity × unit price − discount`; negative results are rejected as invalid.
- Currency values are rounded to two decimal places using JavaScript's nearest-cent rounding convention.
- Gross profit and margin are displayed only when every included line has a recorded unit cost. Missing cost is not estimated.
- Transactions and average order value are shown only when transaction IDs exist on every included sales row.
- Product demand is relative to the selected dataset: the maximum-selling product(s) are High demand; products selling at least half that quantity are Moderate demand; other products with sales are Low demand. Products with zero sales are shown only when they exist in the session inventory.
- Historical imported sales never deduct from current inventory.
- Sales records are held in memory. Reloading or closing the tab can clear them. Only the theme preference is saved in localStorage.
- The app has no account or server-side identity. Avoid sensitive data on shared/public devices.

## Export behavior

- Chart PNG: generated from the visible chart using the active theme and actual filtered data.
- Sales/product/inventory CSV: RFC-style quoted fields and UTF-8 BOM for spreadsheet compatibility.
- PDF: generated in the browser with selected period, KPIs, a sales trend, product/category summaries, and data limitations.
- Excel template: generated locally with example headers and rows.

## Verification status

- [x] Responsive routed dashboard and sidebar
- [x] Light, dark, and system theme with browser preference persistence
- [x] Client-side Excel/CSV parsing with worksheet selection, preview, column mapping, size/shape limits, validation, and duplicate reporting
- [x] Deterministic demo dataset that is separate from uploaded analysis
- [x] Tested revenue, cost, profit, margins, date filtering, product/category summaries, and daily/weekly/monthly trend calculations
- [x] Weekday sales summary, top-product units/revenue toggle, and evidence-bearing business recommendations
- [x] Data-driven overview and product/sales tables
- [x] Session-only inventory CRUD, stock adjustments, low-stock alerts, and CSV export
- [x] PNG, CSV, PDF, and Excel template download implementations
- [x] Frontend production build, 26 unit tests, and dependency audit (0 vulnerabilities)
- [ ] Express/SQLite/Prisma backend and API tests — not implemented; see privacy explanation above
- [ ] Persistent inventory, import history, and saved reports — not implemented
- [ ] Import of stock snapshots from sales spreadsheets — not implemented

## Troubleshooting

- If dependencies are out of date, run `npm install` from the project root.
- If the app reports an invalid file, check that the file is not empty, has a header row, is within the size/row/column limits, and is a valid Excel/CSV workbook.
- If metrics appear unavailable, check the selected date/product/category filters and confirm that required values (especially costs and transaction IDs) exist in the file.
- To verify dependency advisories, run `npm audit`.
