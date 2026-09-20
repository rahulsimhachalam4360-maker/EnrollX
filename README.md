# Fee Registration System

Student fee registration and collection. The front end is HTML5, CSS, Bootstrap 5.3
and vanilla JavaScript — no framework, no build step, no npm install. It talks to a
Java Spring Boot API in [`backend/`](backend/).

---

## Running it

**1. Start the API** (it must be running before you open the UI):

```bash
cd backend
mvn spring-boot:run
```

It comes up on <http://localhost:8080/api> and seeds 9 sample students and
11 receipts on first run.

**2. Serve the UI over HTTP:**

```bash
# Python
python -m http.server 5500

# Node
npx serve .
```

Then visit <http://localhost:5500>.

> **Don't open `index.html` directly from disk.** A `file://` page sends
> `Origin: null`, which the API's CORS policy rejects, and every request fails.
> The allowed origins are `localhost:5500`, `127.0.0.1:5500` and `localhost:3000`
> — see `backend/.../config/CorsConfig.java` to add more.

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
    ├── api.js            SERVICE LAYER — the only file that touches data
    ├── layout.js         Shared navbar, theme toggle, confirm modal
    ├── receipt.js        Receipt renderer (shared by collect + payments)
    ├── dashboard.js      Page script
    ├── students.js       Page script
    ├── collect.js        Page script
    └── payments.js       Page script
```

Scripts are plain `<script>` files using the IIFE pattern (not ES modules), so there
is no bundler to run — edit a file and refresh.

---

## Architecture

```
  page scripts  ──►  js/api.js (FeeAPI)  ──►  fetch()  ──►  Spring Boot API
```

**No page script ever makes an HTTP call directly.** Every page calls
`FeeAPI.something()` and gets a Promise back. That one indirection is why the
switch from the old localStorage mock to the real API touched no page script, no
HTML and no CSS.

### Pointing at a different server

One line, at the top of `js/api.js`:

```js
var API_BASE_URL = 'http://localhost:8080/api';
```

The transport handles JSON encoding, query strings, a `Bearer` token from
`localStorage['frs.token']`, and error responses — thrown as `ApiError` with
`.status` and `.body`. Whatever host you point at has to allow your UI's origin
in its CORS config.

### Endpoints the API exposes

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

## Business rules

Every rule below is enforced by the **API**. The forms check most of them too, but
only so the user hears about a mistake without a round trip — a form can be
bypassed with DevTools, so the server's check is the one that counts.

- Total fee = tuition + transport + hostel + exam + other.
- A payment can never exceed the outstanding balance.
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
