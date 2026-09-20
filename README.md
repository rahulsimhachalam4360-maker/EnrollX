# Fee Registration System

Student fee registration and collection, built as a **front-end only** application:
HTML5, CSS, Bootstrap 5.3 and vanilla JavaScript. No framework, no build step, no
npm install.

There is no server yet, so data lives in the browser's `localStorage`. The code is
structured so that **connecting the real API is a change to one file** — see
[Connecting the API](#connecting-the-api).

---

## Running it

Open `index.html` in a browser. That's it.

Optionally serve it over HTTP (nicer URLs, and matches how it will be deployed):

```bash
# Python
python -m http.server 5500

# Node
npx serve .
```

Then visit <http://localhost:5500>.

The app seeds 9 sample students and 11 receipts the first time it runs.
**Reset data** in the navbar restores that sample set at any time.

---

## Screens

| Page | What it does |
|---|---|
| `index.html` | Dashboard — KPI tiles, collection meter, outstanding by course, recent receipts |
| `students.html` | Student list with search / course / fee-status filters; register, edit, view, delete |
| `collect.html` | Record a payment against a student's outstanding balance; issues a receipt |
| `payments.html` | All receipts with search, mode and date-range filters; view, print or void a receipt |

---

## Project layout

```
fee-registration-system/
├── index.html            Dashboard
├── students.html         Student management
├── collect.html          Fee collection
├── payments.html         Payment history
├── css/
│   └── styles.css        Design tokens + the components Bootstrap doesn't have
└── js/
    ├── utils.js          Formatting, validation helpers, toasts, confirm dialog
    ├── store.js          MOCK BACKEND — localStorage + seed data. Delete when the API lands.
    ├── api.js            SERVICE LAYER — the only file that touches data
    ├── layout.js         Shared navbar, theme toggle, confirm modal
    ├── receipt.js        Receipt renderer (shared by collect + payments)
    ├── dashboard.js      Page script
    ├── students.js       Page script
    ├── collect.js        Page script
    └── payments.js       Page script
```

Scripts are plain `<script>` files using the IIFE pattern (not ES modules), so the
app also runs straight off `file://` without a server.

---

## Architecture

```
  page scripts  ──►  js/api.js (FeeAPI)  ──►  js/store.js (localStorage)   ← today
                                         ──►  fetch() → your REST API      ← later
```

**No page script ever touches `localStorage` directly.** Every page calls
`FeeAPI.something()` and gets a Promise back — exactly the shape it will have
against a real server, including the artificial latency so loading states and
disabled buttons behave correctly.

### Connecting the API

1. In `js/api.js`, set:
   ```js
   var API_MODE = 'live';
   var API_BASE_URL = 'https://your-server/api';
   ```
2. Each method already contains the real call, written out. For example:
   ```js
   getStudents: function (filters) {
     if (isLive()) {
       return request('/students', { query: filters });   // ← the real call
     }
     return mock(function () { /* localStorage version */ });
   }
   ```
   Delete the `mock(...)` branch once the endpoint is live.
3. Delete `js/store.js` and remove its four `<script>` tags.
4. Nothing else changes — no page script, no HTML, no CSS.

The transport (`request`) already handles JSON encoding, query strings, a
`Bearer` token from `localStorage['frs.token']`, and error responses (thrown as
`ApiError` with `.status` and `.body`).

### Endpoints the server needs to expose

| Method | Path | Notes |
|---|---|---|
| `GET` | `/students` | Query: `search`, `course`, `status` |
| `GET` | `/students/:id` | |
| `POST` | `/students` | `409` if the roll number is taken |
| `PUT` | `/students/:id` | `409` if the roll number is taken |
| `DELETE` | `/students/:id` | Cascades to that student's receipts |
| `GET` | `/courses` | Distinct course names |
| `GET` | `/payments` | Query: `studentId`, `mode`, `from`, `to`, `search` |
| `POST` | `/payments` | `400` if the amount exceeds the balance due |
| `DELETE` | `/payments/:id` | Voids a receipt |
| `GET` | `/dashboard/stats` | |

### Response shapes

A **student** carries its own fee structure; the server also returns the three
derived fields so the UI never has to compute money:

```json
{
  "id": "STU-1001",
  "name": "Aarav Sharma",
  "rollNo": "FRS24001",
  "course": "B.Tech CSE",
  "year": 2,
  "section": "A",
  "email": "aarav.sharma@example.com",
  "phone": "9876543210",
  "guardian": "Rakesh Sharma",
  "admissionDate": "2024-07-15",
  "status": "active",
  "fees": { "tuition": 85000, "transport": 12000, "hostel": 0, "exam": 4000, "other": 2000 },

  "totalFee": 103000,
  "paid": 80000,
  "due": 23000,
  "feeStatus": "partial"
}
```

A **payment**:

```json
{
  "id": "RCP-2001",
  "studentId": "STU-1001",
  "amount": 50000,
  "mode": "UPI",
  "date": "2025-07-18",
  "reference": "UPI-8842013",
  "remarks": "",
  "createdAt": "2025-07-18T00:00:00.000Z",

  "studentName": "Aarav Sharma",
  "rollNo": "FRS24001",
  "course": "B.Tech CSE"
}
```

`POST /payments` additionally returns `balanceAfter` so the receipt can print the
remaining balance.

**Dashboard stats:**

```json
{
  "totalStudents": 9,
  "expected": 1061400,
  "collected": 616700,
  "outstanding": 444700,
  "defaulters": 6,
  "outstandingByCourse": [{ "course": "B.Tech CSE", "due": 242000 }],
  "recentPayments": []
}
```

---

## Business rules implemented client-side

- Total fee = tuition + transport + hostel + exam + other.
- A payment can never exceed the outstanding balance. Enforced in the form **and**
  again in `FeeAPI.createPayment`, because a form can be bypassed — the server must
  enforce it too.
- Fee status: `paid` (due = 0), `partial` (something paid, balance remains),
  `unpaid` (nothing paid).
- Editing a fee structure cannot drop the total below what the student has already
  paid.
- Roll numbers are unique.
- A reference number is mandatory for UPI, Card, Bank Transfer and Cheque; optional
  for Cash.
- Payment dates cannot be in the future.
- Deleting a student deletes their receipts; voiding a receipt returns the amount to
  the student's balance due.

---

## Notes for whoever picks this up

- **Currency and locale** are set in two lines at the top of `js/utils.js`
  (`LOCALE`, `CURRENCY`).
- **Institute name and address** on the printed receipt live at the top of
  `js/receipt.js`.
- **Colours** are CSS custom properties in `css/styles.css`. The chart and meter use
  a single-hue blue ramp; the status badges use a reserved four-colour status
  palette and always carry a text label, so colour is never the only signal.
- **Dark mode** is a real theme (Bootstrap's `data-bs-theme`), with its own token
  values — toggle it in the navbar.
- Any user-entered text passed into `innerHTML` goes through `Utils.escape()`.
