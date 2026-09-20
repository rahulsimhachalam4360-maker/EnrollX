# How this project works

Diagrams for anyone picking up the Fee Registration System for the first time.

> **Previewing this file:** in VS Code press `Ctrl+Shift+V`. GitHub and GitLab
> render Mermaid automatically. Or paste any block into <https://mermaid.live>.

---

## 1. The three layers

The single most important idea in this codebase: **pages never touch data
directly.** They ask `FeeAPI`, and `FeeAPI` is the only thing that knows there is
a server at all.

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
        D[("Spring Boot API<br/>backend/<br/>localhost:8080/api")]
        E[("Database")]
    end

    A1 --> B
    A2 --> B
    A3 --> B
    A4 --> B

    B -->|"fetch() + JSON"| D
    D --> E

    style B fill:#2a78d6,stroke:#1c5cab,color:#fff
    style D fill:#2a78d6,stroke:#1c5cab,color:#fff
```

**Read it like a restaurant:** the pages are the customer, `api.js` is the waiter,
and the backend is the kitchen. The customer only ever talks to the waiter — which
is why this app previously ran against a fake localStorage kitchen, and swapping in
the real one changed no page script, no HTML and no CSS.

---

## 2. What happens when a clerk records a payment

Follow one click all the way down and back.

```mermaid
sequenceDiagram
    autonumber
    actor Clerk
    participant UI as collect.js
    participant API as api.js — FeeAPI
    participant SRV as Spring Boot API

    Clerk->>UI: Clicks "Record payment"
    UI->>UI: event.preventDefault()
    Note over UI: Stops the browser from<br/>reloading the whole page

    UI->>UI: validate()

    alt Form has a problem
        UI-->>Clerk: Field turns red. Nothing is saved.
    else Form looks good
        UI->>API: createPayment({ studentId, amount, mode, date })
        API->>SRV: POST /api/payments

        SRV->>SRV: Recompute due from the DB<br/>Check again: amount <= due

        alt Amount is too high
            SRV-->>API: 400 { message }
            API-->>UI: throw ApiError, status 400
            UI-->>Clerk: Red toast explaining why
        else Amount is fine
            SRV->>SRV: Insert RCP-2012, commit
            SRV-->>API: 201 payment + balanceAfter
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
| Second | the API | **Safety.** A form can be bypassed with DevTools. |

Front-end validation is a helpful suggestion. The server's validation is the
actual rule — which is why the server recomputes the balance from the database
rather than trusting any figure the browser sends it.

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

`totalFee`, `paid` and `due` are **not** columns. The server works them out fresh
on every read and sends them down with each student, so the browser never does
money arithmetic.

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

## 6. Running the two halves

The UI and the API are separate processes on separate ports, so both must be up.

```mermaid
flowchart LR
    B["backend/<br/>mvn spring-boot:run<br/><b>:8080</b>"]
    F["UI<br/>python -m http.server 5500<br/><b>:5500</b>"]

    F -->|"fetch, cross-origin"| B
    B -->|"CORS allows :5500"| F

    style B fill:#2a78d6,stroke:#1c5cab,color:#fff
    style F fill:#2a78d6,stroke:#1c5cab,color:#fff
```

**Open the UI over HTTP, never from disk.** A `file://` page sends `Origin: null`,
the API's CORS policy rejects it, and every screen fails to load with an error
that looks like the server is down when it isn't.

The endpoint list and exact JSON shapes are in the
[README](../README.md#endpoints-the-api-exposes).

---

## Where to start reading the code

1. [`js/api.js`](../js/api.js) — the whole client half of the contract, in one
   short file. Read `getStudents`, then `createPayment`.
2. [`js/collect.js`](../js/collect.js) — find `form.addEventListener('submit', ...)`
   and trace it against diagram 2 above.
3. `backend/src/main/java/com/enrollx/fee/payment/PaymentService.java` — the other
   side of diagram 2, including the balance check that actually counts.
