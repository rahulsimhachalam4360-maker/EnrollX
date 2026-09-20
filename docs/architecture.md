# How this project works

Diagrams for anyone picking up the Fee Registration System for the first time.

> **Previewing this file:** in VS Code press `Ctrl+Shift+V`. GitHub and GitLab
> render Mermaid automatically. Or paste any block into <https://mermaid.live>.

---

## 1. The three layers

The single most important idea in this codebase: **pages never touch data
directly.** They ask `FeeAPI`, and `FeeAPI` decides where the data comes from.

That is why switching from localStorage to your real backend is a one-file change.

```mermaid
flowchart TD
    subgraph L1["LAYER 1 - Pages: what the user sees and clicks"]
        A1["index.html<br/>dashboard.js"]
        A2["students.html<br/>students.js"]
        A3["collect.html<br/>collect.js"]
        A4["payments.html<br/>payments.js"]
    end

    subgraph L2["LAYER 2 - Service: the only file that fetches data"]
        B["js/api.js<br/><b>FeeAPI</b>"]
    end

    subgraph L3["LAYER 3 - Where the data actually lives"]
        C["js/store.js<br/>browser localStorage<br/><i>the fake database</i>"]
        D[("Your REST API<br/>+ real database")]
    end

    A1 --> B
    A2 --> B
    A3 --> B
    A4 --> B

    B -->|"API_MODE = mock &nbsp;(today)"| C
    B -.->|"API_MODE = live &nbsp;(later)"| D

    style B fill:#2a78d6,stroke:#1c5cab,color:#fff
    style C stroke-dasharray: 5 5
```

**Read it like a restaurant:** the pages are the customer, `api.js` is the waiter,
and `store.js` is a temporary kitchen. Replace the kitchen and the customer never
notices, because the customer only ever talks to the waiter.

---

## 2. What happens when a clerk records a payment

Follow one click all the way down and back.

```mermaid
sequenceDiagram
    autonumber
    actor Clerk
    participant UI as collect.js
    participant API as api.js — FeeAPI
    participant DB as store.js — localStorage

    Clerk->>UI: Clicks "Record payment"
    UI->>UI: event.preventDefault()
    Note over UI: Stops the browser from<br/>reloading the whole page

    UI->>UI: validate()

    alt Form has a problem
        UI-->>Clerk: Field turns red. Nothing is saved.
    else Form looks good
        UI->>API: createPayment({ studentId, amount, mode, date })

        API->>API: Check again: amount <= balance due

        alt Amount is too high
            API-->>UI: throw ApiError, status 400
            UI-->>Clerk: Red toast explaining why
        else Amount is fine
            API->>DB: nextId("payment")
            DB-->>API: "RCP-2012"
            API->>DB: savePayments(list)
            DB-->>API: written to disk
            API-->>UI: payment + balanceAfter
            UI-->>Clerk: Green toast + printable receipt
            UI->>UI: Clear the form for the next student
        end
    end
```

### Why is the amount checked twice?

| Check | Lives in | Purpose |
|---|---|---|
| First | `collect.js` | **Convenience.** Tell the user instantly, before any round trip. |
| Second | `api.js` | **Safety.** A form can be bypassed with DevTools. |

Front-end validation is a helpful suggestion. The server's validation is the
actual rule. When your real backend arrives, it must enforce this too.

---

## 3. The data model

Only two kinds of record exist. One student can have many payments, because fees
are usually paid in instalments.

```mermaid
erDiagram
    STUDENT ||--o{ PAYMENT : "makes"

    STUDENT {
        string id PK "STU-1001"
        string rollNo UK "unique - FRS24001"
        string name
        string course
        int year
        string email
        string phone
        string admissionDate
        object fees "tuition, transport, hostel, exam, other"
    }

    PAYMENT {
        string id PK "receipt no - RCP-2001"
        string studentId FK "points at STUDENT.id"
        number amount
        string mode "Cash / UPI / Card / Bank Transfer / Cheque"
        string date
        string reference "txn or cheque number"
        string remarks
    }
```

---

## 4. Money is calculated, never stored

`totalFee`, `paid` and `due` are **not** columns. They are worked out fresh every
time, in `decorate()` inside [`js/api.js`](../js/api.js).

```mermaid
flowchart LR
    F["fees object<br/>tuition 85000<br/>transport 12000<br/>hostel 0<br/>exam 4000<br/>other 2000"]
    P["that student's payments<br/>50000 + 30000"]

    F -->|"add them up"| T["totalFee<br/><b>103000</b>"]
    P -->|"add them up"| PD["paid<br/><b>80000</b>"]

    T --> S["due = totalFee - paid<br/><b>23000</b>"]
    PD --> S

    style S fill:#2a78d6,stroke:#1c5cab,color:#fff
```

**Why not just store `due`?** Because the moment someone voids a receipt, a stored
`due` becomes a lie unless you remember to update it everywhere. Deriving it makes
being out of sync *impossible*. General rule: **don't store what you can derive.**

The fee status badge falls out of the same two numbers:

```mermaid
flowchart TD
    Start["totalFee and paid"] --> Q1{"paid = 0 ?"}
    Q1 -->|Yes| U["UNPAID"]
    Q1 -->|No| Q2{"paid >= totalFee ?"}
    Q2 -->|Yes| P["PAID"]
    Q2 -->|No| PT["PARTIAL"]

    style U fill:#d03b3b,color:#fff
    style P fill:#0ca30c,color:#fff
    style PT fill:#fab219,color:#000
```

---

## 5. How a clerk moves through the app

```mermaid
flowchart LR
    D["Dashboard<br/>how much have we collected?"]
    S["Students<br/>register / edit / search"]
    C["Collect Fee<br/>take a payment"]
    P["Payments<br/>all receipts"]
    R["Receipt<br/>print or reprint"]

    D -->|"Collect a fee"| C
    D -->|"View all"| P
    S -->|"View a student"| SD["Student detail<br/>fee breakdown + history"]
    SD -->|"Collect fee"| C
    C -->|"payment saved"| R
    P -->|"Receipt"| R
    P -->|"Void"| P

    style C fill:#2a78d6,stroke:#1c5cab,color:#fff
```

---

## 6. Going live: what changes

```mermaid
flowchart TD
    Start["Backend is ready"] --> S1["1. api.js:<br/>API_MODE = 'live'<br/>API_BASE_URL = your server"]
    S1 --> S2["2. In each method, delete the mock branch.<br/>The real fetch call is already written above it."]
    S2 --> S3["3. Delete js/store.js<br/>and its 4 script tags"]
    S3 --> Done["Done"]

    Done --> N1["Pages: unchanged"]
    Done --> N2["HTML: unchanged"]
    Done --> N3["CSS: unchanged"]

    style Done fill:#0ca30c,color:#fff
    style N1 stroke-dasharray: 4 4
    style N2 stroke-dasharray: 4 4
    style N3 stroke-dasharray: 4 4
```

Each method in `api.js` already looks like this — the real call is written and
waiting, just switched off:

```js
getStudents: function (filters) {
  if (isLive()) {
    return request('/students', { query: filters });   // <-- the real call
  }
  return mock(function () {
    /* the localStorage version - delete this branch */
  });
}
```

The endpoint list and exact JSON shapes your server must return are in the
[README](../README.md#endpoints-the-server-needs-to-expose).

---

## Where to start reading the code

1. [`js/api.js`](../js/api.js) — read `getStudents`, then `createPayment`.
2. [`js/collect.js`](../js/collect.js) — find `form.addEventListener('submit', ...)`
   and trace it against diagram 2 above.

Those two files are about 80% of the project.
