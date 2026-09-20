# EnrollX Fee API

The Spring Boot backend for EnrollX, a student fee registration and collection
system. It serves the ten endpoints the existing HTML/Bootstrap front-end calls,
with the exact JSON field names that front-end reads.

- Java 21, Spring Boot 3.5.7, Maven
- H2 (file-backed) for development, MySQL for production
- Port **8080**, every endpoint under the context path **`/api`**

---

## Running it

```bash
cd backend
./mvnw spring-boot:run          # Windows: .\mvnw.cmd spring-boot:run
```

The Maven wrapper is committed, so no Maven install is needed — it fetches
Maven 3.9.12 on first use and caches it under `~/.m2/wrapper`. If you do have
Maven on your PATH, plain `mvn spring-boot:run` works too.

> **Java.** The wrapper needs `JAVA_HOME` to point at a JDK 21 (or newer).
> Check with `echo %JAVA_HOME%` on Windows, `echo $JAVA_HOME` elsewhere; if it
> is empty or points somewhere that no longer exists, set it:
>
> ```powershell
> [Environment]::SetEnvironmentVariable('JAVA_HOME','C:\Program Files\Java\jdk-21','User')
> ```
>
> Open a new terminal afterwards — a running shell keeps the old value.

The API comes up on <http://localhost:8080/api>. On the first run a seeder loads
nine students (`STU-1001`…`STU-1009`) and eleven receipts (`RCP-2001`…`RCP-2011`) —
the same demo data the front-end's mock store shows. The seeder is idempotent: it
only runs against an empty students table, so restarts never duplicate or reset
your data.

The database lives in `backend/data/`. Delete that folder to start over.

```bash
./mvnw test          # 32 integration tests
./mvnw clean package # runnable jar in target/
java -jar target/fee-1.0.0.jar
```

### Connecting the front-end

In `js/api.js`, change two lines:

```js
var API_MODE = 'live';
var API_BASE_URL = 'http://localhost:8080/api';
```

Nothing else changes — no HTML, no CSS, no page script. Serve the front-end from
`http://localhost:5500`, `http://127.0.0.1:5500` or `http://localhost:3000`;
those three origins are whitelisted for CORS (`GET/POST/PUT/DELETE/OPTIONS`, all
headers). Once live, `js/store.js` and its `<script>` tag can be deleted.

### MySQL

```bash
mysql -e "CREATE DATABASE enrollx CHARACTER SET utf8mb4;"
./mvnw spring-boot:run -Dspring-boot.run.profiles=mysql
```

Credentials come from `DB_USER` / `DB_PASSWORD`; see
`src/main/resources/application-mysql.properties`.

---

## Endpoints

| # | Method | Path | Query / body | Returns |
|---|--------|------|--------------|---------|
| 1 | GET | `/api/students` | `search`, `course`, `status` — all optional | `StudentResponse[]`, sorted by rollNo |
| 2 | GET | `/api/students/{id}` | — | `StudentResponse`, `404` if unknown |
| 3 | POST | `/api/students` | `StudentRequest` | `StudentResponse`, `201`; `409` if rollNo taken |
| 4 | PUT | `/api/students/{id}` | `StudentRequest` | `StudentResponse`; `409` if rollNo taken by another |
| 5 | DELETE | `/api/students/{id}` | — | `204`, cascade-deletes that student's payments |
| 6 | GET | `/api/courses` | — | `string[]` of distinct courses, sorted |
| 7 | GET | `/api/payments` | `studentId`, `mode`, `from`, `to`, `search` | `PaymentResponse[]`, newest first |
| 8 | POST | `/api/payments` | `PaymentRequest` | `PaymentResponse` + `balanceAfter`, `201` |
| 9 | DELETE | `/api/payments/{id}` | — | `204`, voids the receipt |
| 10 | GET | `/api/dashboard/stats` | — | `DashboardStats` |

**Filters.** On students, `search` matches name, rollNo or phone
(case-insensitive, partial), `course` is exact, and `status`
(`paid|partial|unpaid`) filters on the *derived* feeStatus. On payments,
`from`/`to` are inclusive `yyyy-MM-dd` bounds on `date`, and `search` matches
student name, rollNo, payment id or reference. A blank parameter means no filter.

---

## Derived fields

`totalFee`, `paid`, `due` and `feeStatus` are **not columns**. They are computed
on every read:

```
totalFee  = tuition + transport + hostel + exam + other
paid      = SUM(amount) of that student's payments
due       = max(totalFee - paid, 0)
feeStatus = "unpaid" if paid <= 0, "paid" if paid >= totalFee, else "partial"
```

Storing `due` would go stale the moment a receipt is voided. Because it is
derived, `DELETE /api/payments/{id}` makes the student's due rise again with no
extra bookkeeping.

The list endpoints still take a fixed number of queries. `GET /api/students` runs
two (the students, then one grouped `SUM(amount)` for all of them);
`GET /api/payments` runs one, join-fetching each receipt's student;
`/api/dashboard/stats` runs four.

---

## Business rules the server enforces

The front-end validates these too, but a form can be bypassed with DevTools, so
the server's check is the real rule.

| # | Rule | Status | Message |
|---|------|--------|---------|
| 1 | A payment must be `> 0` and `<= due`, recomputed from the DB inside the transaction | 400 | `Amount exceeds the outstanding due of ₹23,000` |
| 2 | `rollNo` is unique, on create and update | 409 | `Roll number FRS24001 already exists` |
| 3 | An edited fee structure may not fall below what was paid | 400 | `Total fee cannot be lower than the ₹80,000 already collected` |
| 4 | A payment date cannot be in the future | 400 | `Payment date cannot be in the future` |
| 5 | `reference` (min 3 chars) is required for UPI, Card, Bank Transfer and Cheque; optional for Cash | 400 | `A reference of at least 3 characters is required for Cheque payments` |
| 6 | Deleting a student deletes that student's payments | 204 | — |
| 7 | An unknown id is a 404 | 404 | `Student STU-9999 not found` |

### Error shape

Every failure — validation, 404, conflict, unexpected — leaves the application in
one shape, because the front-end reads `data.message` off every rejection:

```json
{ "message": "Roll number FRS24001 already exists", "status": 409 }
```

Bean-validation failures collapse into a single readable sentence:

```json
{ "message": "Phone must be exactly 10 digits; Name must be at least 2 characters", "status": 400 }
```

---

## Sample requests

```bash
# 1. List, search and filter students
curl "http://localhost:8080/api/students"
curl "http://localhost:8080/api/students?search=aarav"
curl "http://localhost:8080/api/students?course=MBA&status=partial"

# 2. One student
curl "http://localhost:8080/api/students/STU-1001"

# 3. Register a student
curl -X POST "http://localhost:8080/api/students" \
  -H "Content-Type: application/json" \
  -d '{"name":"Zara Khan","rollNo":"FRS24010","course":"MBA","year":1,
       "section":"B","email":"zara.khan@example.com","phone":"9000000001",
       "guardian":"Imran Khan","admissionDate":"2025-07-01",
       "fees":{"tuition":50000,"transport":0,"hostel":0,"exam":3000,"other":0}}'

# 4. Update a student (send the whole record)
curl -X PUT "http://localhost:8080/api/students/STU-1010" \
  -H "Content-Type: application/json" \
  -d '{"name":"Zara Khan","rollNo":"FRS24010","course":"MBA","year":2,
       "section":"B","email":"zara.khan@example.com","phone":"9000000001",
       "guardian":"Imran Khan","admissionDate":"2025-07-01",
       "fees":{"tuition":60000,"transport":0,"hostel":0,"exam":3000,"other":0}}'

# 5. Delete a student (and their receipts)
curl -i -X DELETE "http://localhost:8080/api/students/STU-1010"

# 6. Course names for the filter dropdowns
curl "http://localhost:8080/api/courses"

# 7. Payments: filter by student, mode, date range or free text
curl "http://localhost:8080/api/payments"
curl "http://localhost:8080/api/payments?studentId=STU-1001"
curl "http://localhost:8080/api/payments?mode=UPI&from=2025-07-01&to=2025-12-31"
curl "http://localhost:8080/api/payments?search=NEFT-553210"

# 8. Record a payment (returns the receipt plus balanceAfter)
curl -X POST "http://localhost:8080/api/payments" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"STU-1001","amount":5000,"mode":"UPI","date":"2025-09-15",
       "reference":"UPI-8842999","remarks":""}'

# ...and the rejection when it exceeds the balance
curl -X POST "http://localhost:8080/api/payments" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"STU-1001","amount":999999,"mode":"UPI","date":"2025-09-15",
       "reference":"UPI-8842999","remarks":""}'
# {"message":"Amount exceeds the outstanding due of ₹23,000","status":400}

# 9. Void a receipt — the student's due rises again
curl -i -X DELETE "http://localhost:8080/api/payments/RCP-2012"

# 10. Dashboard
curl "http://localhost:8080/api/dashboard/stats"
```

---

## Layout

```
com.enrollx.fee
├── FeeApplication.java
├── config/      CorsConfig, DataSeeder
├── student/     Student, Fees (@Embeddable), StudentRepository,
│                StudentService, StudentController, StudentRequest, StudentResponse
├── payment/     Payment, PaymentRepository, PaymentService,
│                PaymentController, PaymentRequest, PaymentResponse
├── dashboard/   DashboardController, DashboardService, DashboardStats
└── common/      ApiException, ErrorResponse, GlobalExceptionHandler, IdGenerator
```

Only two entities are persisted, `Student` (with `Fees` embedded) and `Payment`.
Ids are issued sequentially as `STU-n` and `RCP-n` by `common/IdGenerator`, which
continues from the highest number in the database rather than an in-memory
counter, so a restart never reissues one. Money is whole rupees in `long`
throughout — never `double`.

One implementation note: the `year` field maps to a column named `academic_year`,
because `YEAR` is a reserved word in H2 2.x and a type name in MySQL. The JSON
field is still `year`.

## Tests

`./mvnw test` runs 32 integration tests (`@SpringBootTest` + `MockMvc`, against an
in-memory H2). They cover the over-payment rejection, the duplicate-rollNo 409 on
both create and update, the cascade delete, the derived
`totalFee`/`paid`/`due`/`feeStatus` on `GET /api/students`, every filter, the
future-date and reference rules, receipt voiding, the error shape, and the
dashboard totals.
