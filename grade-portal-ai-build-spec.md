# Student Grade Portal — Phase-wise Build Specification

**Purpose of this document:** it is written to be fed to an AI coding agent (Claude Code, Cursor, Copilot chat) one phase at a time. Each phase has a copy-paste prompt, a file list, hard requirements, and acceptance criteria the agent must satisfy before you move to the next phase.

**How to use it**
1. Start a session. Paste **Section 0 (Master Context)** first. Do not skip it.
2. Paste **one phase prompt**. Let the agent finish.
3. Run the acceptance checks yourself. Do not accept "it should work".
4. Only then paste the next phase prompt.
5. If the session resets, paste Section 0 again before continuing.

Never paste two phases at once. The agent will stub the second one and you will not notice until Phase 8.

---

# Section 0 — Master Context

> Paste this verbatim at the start of every session.

```
You are building a MERN application called "Student Grade Portal".

PRODUCT
Teachers register, add students, and upload marks. Anyone logged in can view
report cards, subject averages, class-wide toppers, and a class performance
summary. The teaching purpose of the project is average and rank calculation,
so the aggregation endpoints must be correct, not approximate.

STACK — these are fixed, do not substitute
- Node.js 20+, Express 4 (NOT Express 5), CommonJS modules (require/module.exports)
- MongoDB Atlas with Mongoose 8
- bcryptjs (NOT bcrypt), jsonwebtoken, express-validator, dotenv, cors
- React 18 with Vite, react-router-dom v6, axios
- Plain CSS in a single stylesheet. No Tailwind, no component library, no CSS-in-JS.

REPO LAYOUT
student-grade-portal/
  server/   -> Express API, entry point server/src/server.js
  client/   -> Vite React app

RULES YOU MUST FOLLOW
1. Write complete, runnable files. Never emit "// ... rest of the code",
   "TODO", or placeholder implementations.
2. When you change a file, output the entire file, not a diff fragment.
3. Every async Express handler must be wrapped so rejections reach the error
   middleware. No unhandled promise rejections.
4. Never spread req.body directly into a Mongoose document. Whitelist fields.
5. Static route segments are always registered before dynamic ones
   (/top before /:id). State this explicitly in comments where it applies.
6. All API responses use this envelope and nothing else:
   success:  { "success": true, "message"?: string, "data": ..., "meta"?: {...}, "count"?: number }
   error:    { "success": false, "message": string, "errors"?: [{ "field": string, "message": string }] }
7. Status codes: 200 read/update, 201 create, 400 validation, 401 unauthenticated,
   403 wrong role, 404 not found, 409 duplicate, 500 unexpected.
8. Never return the password field in any response.
9. Secrets come from process.env only. Never hardcode a connection string or
   JWT secret, not even as a fallback default.
10. After each phase, print a short list of the files you created or changed,
    and the exact commands to verify the phase works.

WHEN A PHASE IS AMBIGUOUS
Ask me one clarifying question before writing code. Do not invent requirements.
```

---

# Section 1 — Data model specification

The agent must implement exactly these three models. Do not let it add or rename fields.

### `User`

| Field | Type | Rules |
|---|---|---|
| `name` | String | required, trim, 2–60 chars |
| `email` | String | required, unique, lowercase, trim, email format |
| `password` | String | required, min 6, `select: false`, bcrypt-hashed in a `pre('save')` hook that only runs when modified |
| `role` | String | enum `['teacher','student']`, default `'teacher'` |
| `studentProfile` | ObjectId → Student | default `null`, only meaningful when role is `student` |
| timestamps | | `createdAt`, `updatedAt` |

Instance method: `matchPassword(plain)` returning a boolean.

### `Student`

| Field | Type | Rules |
|---|---|---|
| `rollNo` | String | required, unique, trim, uppercase |
| `name` | String | required, trim, max 60 |
| `email` | String | optional, lowercase, email format |
| `className` | String | required, trim — free text like `10`, `12-Science` |
| `section` | String | trim, uppercase, default `'A'` |
| `academicYear` | String | default current year |
| `createdBy` | ObjectId → User | required |
| timestamps | | |

Indexes: `{ className: 1, section: 1 }`.
Virtual: `marks` (ref Mark, localField `_id`, foreignField `student`).

### `Mark`

| Field | Type | Rules |
|---|---|---|
| `student` | ObjectId → Student | required, indexed |
| `subject` | String | required, trim, max 50 |
| `examType` | String | enum `['unit-test','midterm','final']`, default `'final'` |
| `score` | Number | required, min 0 |
| `maxScore` | Number | default 100, min 1 |
| `createdBy` | ObjectId → User | required |
| timestamps | | |

Compound unique index: `{ student: 1, subject: 1, examType: 1 }`.
`pre('validate')` hook rejecting `score > maxScore`.
Virtual `percentage` = `score / maxScore * 100`, rounded to 2 decimals.

### Shared grading scale

Defined once in `server/src/utils/grade.js` and imported everywhere:

```
>= 90  A+      >= 60  C       >= 35  E
>= 80  A       >= 50  D       <  35  F
>= 70  B
PASS_PERCENTAGE = 35
```

---

# Section 2 — API contract (17 endpoints)

| # | Method | Path | Access | Notes |
|---|---|---|---|---|
| 1 | POST | `/api/auth/register` | Public | returns user + token |
| 2 | POST | `/api/auth/login` | Public | returns user + token |
| 3 | GET | `/api/auth/me` | Auth | current profile |
| 4 | POST | `/api/students` | Teacher | |
| 5 | GET | `/api/students` | Auth | `?page&limit&search&className&section&sort` |
| 6 | GET | `/api/students/:id` | Auth | |
| 7 | PUT | `/api/students/:id` | Teacher | |
| 8 | DELETE | `/api/students/:id` | Teacher | cascade-deletes that student's marks |
| 9 | POST | `/api/marks` | Teacher | |
| 10 | GET | `/api/marks` | Auth | `?page&limit&student&subject&examType&className` |
| 11 | GET | `/api/marks/:id` | Auth | |
| 12 | PUT | `/api/marks/:id` | Teacher | |
| 13 | DELETE | `/api/marks/:id` | Teacher | |
| 14 | GET | `/api/students/:id/report-card` | Auth | `?examType` optional |
| 15 | GET | `/api/marks/subject/:id/average` | Auth | `?className&examType` |
| 16 | GET | `/api/students/top` | Auth | `?limit&className` |
| 17 | GET | `/api/marks/class-summary` | Auth | `?className` |

**Critical note for endpoint 15:** there is no Subject collection. Subjects are strings on Mark. So `:id` is the **subject name**, URL-encoded (`/api/marks/subject/Social%20Studies/average`). The agent must match it case-insensitively with an anchored, regex-escaped pattern.

### Required response shapes for the four calculated endpoints

Tell the agent these exactly — they are what the frontend will consume.

**14 · Report card**
```
data: {
  student:  { _id, name, rollNo, className, section, academicYear },
  subjects: [ { _id, subject, examType, score, maxScore, percentage, grade } ],
  summary:  { subjectCount, obtainedMarks, totalMarks, percentage, grade,
              result: "PASS"|"FAIL"|"NO DATA", rank: number|null, outOf: number },
  generatedAt: ISO string
}
```
Rank is the student's position when every student **in the same className** is
sorted by overall percentage descending. `null` if the student has no marks.

**15 · Subject average**
```
data: { subject, examType, className, studentCount, obtainedMarks, totalMarks,
        averageScore, averagePercentage, highestScore, lowestScore,
        passCount, failCount, passPercentage, grade }
```
When no marks match, return 200 with zeroed fields and `grade: "N/A"` — not 404.

**16 · Toppers**
```
data: [ { rank, studentId, name, rollNo, className, section,
          subjectCount, obtainedMarks, totalMarks, percentage, grade } ]
```
Sort by `percentage` desc, tie-break on `obtainedMarks` desc then `name` asc.
`rank` is assigned after sorting, starting at 1.

**17 · Class summary**
```
data: [ { className, studentCount, totalSubjectEntries, averagePercentage,
          highestPercentage, lowestPercentage, passCount, failCount,
          passPercentage, averageGrade } ]
```
Two-stage aggregation: group per student first, then group those per class.
A single-stage group over raw marks gives the wrong average and must be rejected.

---

# Section 3 — Phases

Each phase below is self-contained. The **Prompt** block is what you paste.

---

## Phase 1 — Scaffold and configuration

**Goal:** both apps start, nothing else.

**Prompt**
```
PHASE 1 of the Student Grade Portal.

Create the repository skeleton only. Do not write any models, routes, or
React pages yet.

Backend (server/):
- npm init, install express@4 mongoose@8 dotenv cors bcryptjs jsonwebtoken
  express-validator, and nodemon as a dev dependency
- package.json scripts: "dev": "nodemon src/server.js", "start": "node src/server.js"
- Create empty-but-valid directories: src/config, src/models, src/controllers,
  src/routes, src/middleware, src/utils
- src/app.js: express app with cors (origin from CLIENT_URL, comma-separated
  list supported), express.json(), and a single route
  GET /api/health -> { success: true, message, time }
- src/server.js: loads dotenv on line 1, connects to Mongo, then listens on
  process.env.PORT || 5000, and handles unhandledRejection by closing cleanly
- src/config/db.js: connectDB() using Mongoose 8 syntax with no deprecated
  options, logs host and database name, exits process on failure
- .env.example with PORT, NODE_ENV, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, CLIENT_URL
- .gitignore covering node_modules, .env, *.log

Frontend (client/):
- Vite React (JavaScript) app
- install react-router-dom and axios
- .env.example with VITE_API_URL=http://localhost:5000/api
- Delete the Vite demo content from App.jsx; render a single <h1> placeholder
- Delete App.css and index.css and their imports; create an empty src/styles.css
  imported from main.jsx

Then print the exact shell commands to install and run both apps.
```

**Acceptance**
- `cd server && npm run dev` prints a Mongo connection line and a port line
- `curl http://localhost:5000/api/health` returns `{"success":true,...}`
- `cd client && npm run dev` serves a blank page with no console errors
- `git status` does **not** list `.env`

---

## Phase 2 — Models

**Goal:** the three schemas, exactly as specified.

**Prompt**
```
PHASE 2 of the Student Grade Portal: Mongoose models.

Create server/src/models/User.js, Student.js and Mark.js implementing the
schema specification below exactly. Do not add fields I have not listed.

[PASTE SECTION 1 OF THE SPEC HERE]

Additional requirements:
- Use regular function() syntax in hooks and instance methods, never arrow
  functions, and add a one-line comment explaining why.
- The User password hook must return early when the password was not modified,
  otherwise every profile update re-hashes an already-hashed password.
- The Mark score-vs-maxScore rule goes in pre('validate'), not pre('save'), so
  it surfaces as a 400 alongside the built-in validators.
- Enable toJSON/toObject virtuals on Student and Mark.

Then write server/src/seed.js: a standalone script (`node src/seed.js`) that
wipes the three collections and inserts 1 teacher (teacher@school.com /
secret123), 10 students spread across classes "10" and "12", and 5 subjects of
final-exam marks for each student, with a realistic spread of scores so that
averages, ranks and pass/fail are all non-trivial. Print a summary when done.
```

**Acceptance**
- `node src/seed.js` completes and reports 1 user, 10 students, 50 marks
- In Atlas, the `marks` collection shows a compound index on student+subject+examType
- Inserting a duplicate student+subject+examType fails with error code 11000
- No stored password is readable plaintext

---

## Phase 3 — Utilities and middleware

**Goal:** the plumbing every controller depends on. No business logic yet.

**Prompt**
```
PHASE 3 of the Student Grade Portal: shared utilities and middleware.

Create these files, complete:

server/src/utils/ApiError.js
  class ApiError extends Error with statusCode, isOperational, captureStackTrace

server/src/utils/asyncHandler.js
  wraps an async handler so rejections go to next()

server/src/utils/generateToken.js
  jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || '7d' })

server/src/utils/grade.js
  getGrade(percentage), round2(n), PASS_PERCENTAGE = 35, using this scale:
  [PASTE THE GRADING SCALE]

server/src/utils/paginate.js
  getPagination(query) -> { page, limit, skip } with page>=1, limit 1..100
                          (hard ceiling 100), non-numeric input falling back to
                          page 1 limit 10
  buildMeta(total, page, limit) -> { total, page, limit, totalPages,
                                     hasNextPage, hasPrevPage }

server/src/utils/escapeRegex.js
  escapes regex metacharacters, so a user searching "a.*" cannot run a
  catastrophic pattern against the database

server/src/middleware/auth.js
  protect: reads "Authorization: Bearer <token>", verifies it, loads the user,
           attaches req.user. Distinguish TokenExpiredError ("Session expired,
           please log in again") from a generally invalid token. 401 in both cases.
  authorize(...roles): returns 403 naming the offending role.

server/src/middleware/validate.js
  runs express-validator's validationResult and returns 400 with
  errors: [{ field, message }]

server/src/middleware/errorHandler.js
  notFound: 404 naming the method and URL
  errorHandler: 4-argument signature. Maps CastError(ObjectId) -> 400,
  ValidationError -> 400 with a field list, duplicate key 11000 -> 409 naming
  the field, everything else -> its statusCode or 500. Logs only 500s.
  Includes err.stack only when NODE_ENV === 'development'.

Wire notFound and errorHandler into app.js AFTER all route mounts, and add a
comment stating that an error handler registered before the routes never fires.
```

**Acceptance**
- `GET /api/does-not-exist` returns 404 in the standard envelope
- Temporarily throwing inside `/api/health` returns 500 JSON, not an HTML stack page
- In production mode the response has no `stack` field

---

## Phase 4 — Authentication (endpoints 1–3)

**Prompt**
```
PHASE 4 of the Student Grade Portal: authentication.

Implement endpoints 1-3 of the contract.

server/src/controllers/authController.js
  register: reject a duplicate email with 409. Coerce role to 'student' only
    when explicitly requested, otherwise 'teacher'. Respond 201 with
    { user, token }.
  login: query with .select('+password') — required because the schema sets
    select:false. Return the SAME message "Invalid email or password" whether
    the email is unknown or the password is wrong, so the endpoint cannot be
    used to enumerate registered emails.
  getMe: returns the user, populating studentProfile with name, rollNo,
    className, section.

Use a single publicUser(user) helper so no route can ever leak the password
hash. Never return the raw Mongoose document from register or login.

server/src/routes/authRoutes.js with express-validator rules:
  register: name 2-60 required; email valid + normalizeEmail; password min 6;
            role optional, one of teacher|student
  login:    email valid; password not empty
  /me:      protect middleware only

Mount at /api/auth in app.js.
```

**Acceptance**

| Check | Expected |
|---|---|
| Register a new teacher | 201, token present, no `password` key anywhere in the body |
| Register the same email again | 409 |
| Register with a 3-character password | 400 with `errors[0].field === "password"` |
| Login with the wrong password | 401, message identical to the unknown-email case |
| `GET /api/auth/me` with no header | 401 |
| `GET /api/auth/me` with a valid token | 200, correct user |
| `GET /api/auth/me` with a token signed by a different secret | 401 |

---

## Phase 5 — Student CRUD (endpoints 4–8)

**Prompt**
```
PHASE 5 of the Student Grade Portal: student CRUD, endpoints 4-8.

server/src/controllers/studentController.js
  createStudent (teacher): 409 if the roll number exists. Set createdBy from
    req.user._id — never from the request body.
  getStudents: pagination via the utils, plus optional filters
    search (case-insensitive, matches name OR rollNo, escaped through
    escapeRegex), className, section, and sort with a whitelist map
    { newest, oldest, name, roll } defaulting to newest. Use .lean() and run
    the find and the countDocuments with Promise.all. Return count, meta, data.
  getStudent: 404 when missing.
  updateStudent: 404 when missing. If rollNo changes, 409 on a clash. Apply
    only a whitelisted field list — do NOT spread req.body, because that would
    let a client overwrite createdBy or _id.
  deleteStudent: delete the student AND all of that student's marks. Report how
    many mark records were removed. Explain in a comment that orphaned marks
    would corrupt every later aggregation.

server/src/routes/studentRoutes.js
  router.use(protect) at the top.
  Validation: create requires rollNo, name, className; email optional but must
  be valid when non-empty. Update makes all fields optional. Validate :id with
  param('id').isMongoId() so a malformed id returns 400 rather than reaching
  Mongoose.
  Write and PUT/DELETE guarded by authorize('teacher').

Mount at /api/students.
```

**Acceptance**
- `GET /api/students?page=2&limit=3` returns page 2 with a correct `meta.totalPages`
- `?limit=9999` is clamped to 100
- `?search=rav` matches by name; `?search=10A` matches by roll number
- `GET /api/students/abc` returns 400, not 500
- Deleting a seeded student also removes their 5 marks (verify in Atlas)
- A `student`-role token gets 403 on POST/PUT/DELETE and 200 on GET

---

## Phase 6 — Mark CRUD (endpoints 9–13)

**Prompt**
```
PHASE 6 of the Student Grade Portal: mark CRUD, endpoints 9-13.

server/src/controllers/markController.js
  createMark (teacher): verify the student exists (404 if not). Reject a
    duplicate student+subject+examType with 409 and a readable message,
    matching the subject case-insensitively. Set createdBy from req.user.
    Populate student (name, rollNo, className, section) before responding.
  getMarks: pagination plus optional filters student (validate it is a Mongo
    id, else 400), subject (case-insensitive partial, escaped), examType, and
    className. className requires a two-step lookup because className lives on
    Student, not Mark — resolve the matching student ids first, then filter
    marks by $in. Populate student on every row.
  getMark / updateMark / deleteMark: 404 when missing. updateMark whitelists
    subject, score, maxScore, examType and uses doc.save() so the
    score<=maxScore validator runs. Do not allow changing the student on an
    existing mark.

server/src/routes/markRoutes.js
  protect for all. authorize('teacher') on POST/PUT/DELETE.
  Validation: student isMongoId; subject non-empty max 50; score isFloat min 0
  with toFloat(); maxScore optional isFloat min 1 with toFloat(); examType in
  the enum. Validate :id with isMongoId.

Mount at /api/marks.
```

**Acceptance**
- Creating a mark with `score: 150, maxScore: 100` returns 400 from the pre-validate hook
- Creating the same student+subject+`final` twice returns 409
- `GET /api/marks?className=10` returns only class-10 students' marks
- `GET /api/marks?subject=math` matches "Mathematics" case-insensitively
- Every row in the list response has a populated `student` object
- Updating a score to a value above `maxScore` returns 400
---

## Phase 7 — The four calculated endpoints (14–17)

This is the phase that carries the learning value. Be strict with the agent here.

**Prompt**
```
PHASE 7 of the Student Grade Portal: the four calculated endpoints, 14-17.
These are the heart of the project. Correctness matters more than brevity.
Use MongoDB aggregation pipelines, not JavaScript loops over full collections.

--- 14. GET /api/students/:id/report-card?examType=  (in studentController) ---
Return this exact shape:
[PASTE THE REPORT CARD SHAPE FROM SECTION 2]
Rules:
- percentage per subject = score/maxScore*100, rounded to 2 decimals
- overall percentage = SUM(score) / SUM(maxScore) * 100, NOT the mean of the
  per-subject percentages. Add a comment saying why: subjects with different
  maxScore values must not be weighted equally.
- result is "PASS" only when every subject is at or above PASS_PERCENTAGE,
  "NO DATA" when there are no marks
- rank: aggregate every student in the SAME className, group by student,
  compute percentage, sort descending, and report this student's 1-based
  position plus the total count. rank is null when the student has no marks.

--- 16. GET /api/students/top?limit=&className=  (in studentController) ---
Pipeline over Mark:
  $lookup students -> $unwind -> optional $match on className ->
  $group by student id accumulating subjectCount, obtainedMarks, totalMarks
  and carrying name/rollNo/className/section with $first ->
  $addFields percentage with a $cond guarding division by zero ->
  $sort { percentage: -1, obtainedMarks: -1, name: 1 } -> $limit -> $project
Assign rank in JavaScript after the pipeline, starting at 1. Attach grade.
Cap limit at 50. Note in a comment that the $lookup "from" value is the
physical collection name ("students"), not the model name.

--- 15. GET /api/marks/subject/:id/average?className=&examType=  (markController) ---
:id is the SUBJECT NAME, URL-decoded, not an ObjectId. Match it with an
anchored case-insensitive regex built through escapeRegex.
Return the shape:
[PASTE THE SUBJECT AVERAGE SHAPE FROM SECTION 2]
When nothing matches, return 200 with zeros and grade "N/A", never 404.
passCount is the number of entries at or above PASS_PERCENTAGE of their own
maxScore — use $expr so the threshold is per-row, not against a fixed 35 marks.

--- 17. GET /api/marks/class-summary?className=  (markController) ---
Return the shape:
[PASTE THE CLASS SUMMARY SHAPE FROM SECTION 2]
This MUST be a two-stage aggregation:
  stage A: $group by { className, studentId } to get each student's totals and
           percentage
  stage B: $group by className to average those per-student percentages, and
           take max, min, and the pass count
A single $group over raw marks would average subject rows instead of students
and give a different, wrong number. Add a comment saying so.
Sort by className ascending. Attach averageGrade.

--- ROUTING (do this carefully) ---
In studentRoutes.js, register GET /top and GET /:id/report-card BEFORE the
/:id routes. In markRoutes.js, register GET /class-summary and
GET /subject/:id/average BEFORE the /:id routes. Add a comment at each site
explaining that Express matches top to bottom, so /api/students/top would
otherwise bind id="top" and throw a CastError.
```

**Acceptance — verify these by hand against the seed data**

| Check | How |
|---|---|
| Overall percentage is weighted | Give one student a subject with `maxScore: 50`. Confirm the report card total differs from the plain mean of the subject percentages. |
| Rank is class-scoped | The class-10 topper and the class-12 topper must both show `rank: 1` |
| Rank total matches | `outOf` equals the number of class members **with marks** |
| Toppers ordering | Manually compute the top 3 from the seed data; the endpoint must match exactly |
| Tie-break works | Give two students identical percentages; the one with more obtained marks ranks higher |
| `/students/top` does not CastError | Returns 200, not 400 "Cast to ObjectId failed for value top" |
| Subject average is per-row | Mix `maxScore` 50 and 100 rows; `passPercentage` must use each row's own max |
| Unknown subject | `/api/marks/subject/Astrology/average` returns 200 with zeros, not 404 |
| URL-encoded subject | `/api/marks/subject/Social%20Studies/average` works |
| Class summary is two-stage | A class where one student has 8 subjects and another has 2 must still weight both students equally in `averagePercentage` |
| Empty state | Drop all marks; all four endpoints return 200 with empty/zeroed data, no crash |

If any check fails, paste the failing check back to the agent verbatim rather than describing it loosely.

---

## Phase 8 — API test pass

**Prompt**
```
PHASE 8 of the Student Grade Portal: testing.

Generate a Postman collection JSON file at the repo root named
student-grade-portal.postman_collection.json containing all 17 endpoints,
organised into folders Auth / Students / Marks / Reports.

Requirements:
- Collection-level auth: Bearer {{token}}; every request inherits it
- Variables: baseUrl, token, studentId, markId
- The Login request has a post-response script that saves data.token to the
  environment and asserts status 200
- The Create Student and Create Mark requests save the new _id into studentId
  and markId
- Every request has at least one test assertion on the status code and on
  success === true
- Include negative-case requests: duplicate email (409), short password (400),
  malformed id (400), score above maxScore (400), duplicate mark (409),
  request with no token (401)

Also create a README section listing the run order.
```

**Acceptance:** import into Postman, hit **Run collection**, every request green.

---

## Phase 9 — React foundation

**Prompt**
```
PHASE 9 of the Student Grade Portal: React foundation. No feature pages yet.

client/src/api/axios.js
  axios instance with baseURL from import.meta.env.VITE_API_URL.
  Request interceptor attaching "Authorization: Bearer <token>" from localStorage.
  Response interceptor that: extracts the server's message (data.message, else
  data.errors[0].message, else error.message) and rejects with a plain Error
  carrying that message, so components never dig through error.response
  themselves; and on a 401 clears the token and redirects to /login, except
  when already on /login.

client/src/context/AuthContext.jsx
  State: user, loading (starts TRUE).
  On mount: if a token exists, call GET /auth/me and set the user; clear the
  token on failure; set loading false in a finally block. Add a comment
  explaining that without the loading flag, ProtectedRoute sees user === null
  on the first render and bounces a logged-in user to /login on every refresh.
  Expose login(email, password), register(payload), logout(), and a derived
  isTeacher boolean. useAuth() throws a clear error if used outside the provider.

client/src/components/
  ProtectedRoute.jsx — renders a loading state while loading, redirects to
    /login preserving location.state.from, and supports a teacherOnly prop that
    redirects non-teachers to /dashboard
  Navbar.jsx — NavLinks to all feature routes, user name and role, logout button
  Loader.jsx, Pagination.jsx — Pagination returns null when meta is missing or
    totalPages <= 1, and shows "Page X of Y · N records" with prev/next disabled
    at the boundaries

client/src/App.jsx
  BrowserRouter + AuthProvider. Public /login and /register. Protected routes:
  /dashboard, /students, /students/new, /students/:id/edit,
  /students/:id/report-card, /marks, /marks/new, /marks/:id/edit, /toppers,
  /class-summary, /subject-average. teacherOnly on the new/edit routes.
  / redirects to /dashboard. * renders a 404.
  Create empty placeholder components for every page so the app compiles.

client/src/styles.css
  One stylesheet, CSS custom properties for colours, and classes for:
  container, navbar, card, page-head, table, form field/row, btn variants
  (primary, light, danger, ghost, sm), alert error/success, pagination,
  stat-grid/stat, badge pass/fail, auth-wrap/auth-card, loader, center-screen.
  Mobile-friendly: grids use repeat(auto-fit, minmax(...)).
```

**Acceptance**
- App compiles, `/login` renders, `/dashboard` redirects to `/login`
- No React key or controlled-input warnings in the console
- Manually setting a bogus token in localStorage and refreshing lands you on `/login` with the token cleared

---

## Phase 10 — Auth screens

**Prompt**
```
PHASE 10 of the Student Grade Portal: Login and Register pages.

client/src/pages/Login.jsx and Register.jsx.

Both:
- controlled inputs; every field initialised to '' so React never flips an
  input from uncontrolled to controlled
- e.preventDefault() in the submit handler
- local error state rendered in an .alert.alert-error
- a busy flag disabling the submit button and swapping its label while in flight
- every input has a matching <label htmlFor> and an id
- links between the two pages

Login: on success, navigate to location.state?.from?.pathname || '/dashboard'
with { replace: true }, so the user lands back where they were bounced from.
Register: name, email, password, role select (Teacher/Student). Client-side
check that the password is at least 6 characters before calling the API, but
keep relying on the server as the real validator.
```

**Acceptance**
- Wrong password shows the server's message inline, no crash
- Registering logs you straight in and lands on `/dashboard`
- Refreshing after login keeps you logged in
- Visiting `/students` while logged out, then logging in, returns you to `/students`

---

## Phase 11 — Students and Marks screens

**Prompt**
```
PHASE 11 of the Student Grade Portal: the Students and Marks management screens.

client/src/pages/Students.jsx
  Paginated table: rollNo, name, className, section, actions.
  Filters: search box (name or roll) and className, both resetting page to 1.
  Debounce the fetch by ~350ms. Implement the fetcher with useCallback and call
  it from a useEffect with a setTimeout + cleanup, and comment that without
  useCallback the function identity changes every render and the effect loops.
  Actions: Report card (everyone), Edit and Delete (teachers only, via isTeacher).
  Delete asks for confirmation and warns that the student's marks go too.
  Empty state and error state, not a blank table.

client/src/pages/StudentForm.jsx
  One component serving both /students/new and /students/:id/edit, deciding by
  the presence of the :id param. On edit, fetch the record first and show a
  loading state. Submit sends only the whitelisted fields, omitting empty
  optional ones rather than sending "". Navigate to /students on success.

client/src/pages/Marks.jsx
  Paginated table: student name, roll no, subject, examType, score/maxScore,
  percentage. Filters: subject text and examType select. Teacher-only Edit and
  Delete columns. Use optional chaining on the populated student (m.student?.name)
  and comment that a deleted student leaves populate returning null.

client/src/pages/MarkForm.jsx
  Serves /marks/new and /marks/:id/edit. Loads the student list once for the
  dropdown (limit 100, the API ceiling). Pre-select the student from a
  ?student= query param when present. On edit, disable the student dropdown and
  comment that reassigning a mark to another student would conflict with the
  unique index. Client-side guard: score must be a number, >= 0, and <= maxScore,
  with a clear message before the request is sent.
```

**Acceptance**
- Typing quickly in the search box fires one request, not one per keystroke
- A `student`-role login sees no Add/Edit/Delete controls anywhere
- Deleting a student removes their rows from the Marks page too
- Submitting `score: 200, maxScore: 100` is blocked client-side; removing the guard still gets a readable 400 from the server
- Editing a student prefills every field; no controlled-input warnings

---

## Phase 12 — Report screens

**Prompt**
```
PHASE 12 of the Student Grade Portal: the four report screens plus the dashboard.

client/src/pages/ReportCard.jsx
  Reads :id, calls GET /students/:id/report-card.
  Header card with name, roll no, class-section, academic year.
  Stat tiles: percentage, grade, rank (as "3 / 40"), result as a pass/fail badge.
  Subject table with a <tfoot> total row.
  A Print button calling window.print(), and an @media print block in styles.css
  hiding the navbar and buttons.
  Handle the no-marks case with a message, not an empty table.

client/src/pages/Toppers.jsx
  GET /students/top with className and limit (5/10/25) controls, debounced.
  Medal emoji for ranks 1-3, plain number after. Link each row to that
  student's report card. Empty state explaining that marks must exist first.

client/src/pages/ClassSummary.jsx
  GET /marks/class-summary on mount. Table of every returned column, with
  passPercentage rendered as a pass/fail badge thresholded at 60.

client/src/pages/SubjectAverage.jsx
  A small form: subject (required) and className (optional), submitting to
  GET /marks/subject/:subject/average. Pass the subject through
  encodeURIComponent and comment that a subject like "Social Studies" or
  "Maths & Stats" breaks the URL otherwise. Render the result as stat tiles.
  Handle the zeroed no-data response as a friendly message.

client/src/pages/Dashboard.jsx
  Fire four requests in parallel with Promise.all: student count (limit 1, read
  meta.total), mark count the same way, top 3, and the class summary. Stat tiles
  plus a top-3 table. Teacher-only quick-add buttons.
```

**Acceptance**
- The rank shown on a report card matches the position in `/toppers` filtered to that class
- Printing produces a clean page with no navbar or buttons
- A subject with a space in its name works from the Subject Average form
- The dashboard makes four requests in parallel (check the Network tab waterfall), not serially

---

## Phase 13 — Hardening pass

Run this before deploying. It catches what the phase-by-phase build misses.

**Prompt**
```
PHASE 13 of the Student Grade Portal: review and hardening. Do not add features.

Audit the whole repository and fix anything that violates these, reporting each
issue found with the file and line:

BACKEND
1. Every async route handler is wrapped; no unhandled rejection is possible
2. No handler can send two responses (missing `return` before res.json in a
   branch)
3. No controller spreads req.body into a document or a findByIdAndUpdate
4. createdBy is always taken from req.user, never from the body
5. The password field cannot appear in any response payload, including errors
6. Every :id param route validates isMongoId before reaching Mongoose
7. Every user-supplied string used in a $regex goes through escapeRegex
8. Static routes precede dynamic routes in both route files
9. No secret has a hardcoded fallback value
10. Pagination limit is clamped
11. All list endpoints return count + meta + data

FRONTEND
12. No component reads error.response directly; all go through the interceptor
13. Every form input is controlled with a defined initial value
14. Every .map has a stable key that is not the array index
15. Every fetch has a loading state, an error state and an empty state
16. No useEffect can loop (check dependency arrays and useCallback usage)
17. Teacher-only UI is hidden AND the server enforces it independently

Then add a root README.md with: project description, feature list, the 17-endpoint
table, tech stack, local setup for both apps, the .env variables with
descriptions, seed instructions, and a screenshot placeholder section.
```

---

## Phase 14 — Deployment

**Prompt**
```
PHASE 14 of the Student Grade Portal: deployment configuration.

1. Confirm server/src/server.js listens on process.env.PORT with no hardcoded
   port in production, and that no PORT is set in the Render environment.
2. Confirm CORS reads CLIENT_URL and supports a comma-separated list, so
   localhost and the deployed frontend can both be allowed during cutover.
3. Create client/vercel.json with a catch-all rewrite to /index.html, and
   explain in a comment that React Router paths 404 on refresh without it.
4. Write DEPLOYMENT.md with step-by-step instructions for:
   - MongoDB Atlas: M0 cluster, database user, network access 0.0.0.0/0 and why
     the free Render tier needs it
   - Render: root directory "server", build "npm install", start "npm start",
     the exact environment variables to set, and a note that the free instance
     cold-starts in 30-50 seconds
   - Vercel: root directory "client", VITE_API_URL pointing at the Render URL
     with the /api suffix
   - The ordering trap: deploy the API, deploy the client, then go back and set
     CLIENT_URL on Render to the Vercel origin and redeploy, or CORS blocks
     everything
   - A post-deploy smoke test list: /api/health, register, login, create a
     student, view a report card, refresh on a deep link
5. Add a health-check note: Render pings the root path by default; make sure
   GET /api/health is what you configure as the health check path.
```

---

# Section 4 — Known failure modes to pre-empt

Paste this into any session where the agent starts improvising.

```
Known mistakes in this project — do not make them:

1. Registering /api/students/:id before /api/students/top. Express matches top
   to bottom; "top" gets cast to an ObjectId and throws.
2. Querying the user at login without .select('+password'). The schema sets
   select:false, so bcrypt.compare receives undefined and throws
   "Illegal arguments: string, undefined".
3. Averaging per-subject percentages to get an overall percentage. Use
   SUM(score)/SUM(maxScore) so a 50-mark subject is not weighted like a 100-mark one.
4. A one-stage $group for the class summary. Group per student first, then per
   class, or students with more subjects distort the class average.
5. Using the model name instead of the collection name in $lookup.from. It is
   "students" and "marks", lowercase and plural.
6. Deleting a student without deleting their marks. Every later aggregation
   then joins to a missing document.
7. Omitting the loading flag in AuthContext, which logs the user out on refresh.
8. A useEffect that depends on a fetch function recreated every render,
   producing an infinite request loop.
9. Initialising form state fields as undefined, which makes React flip inputs
   from uncontrolled to controlled.
10. Hiding teacher-only buttons in React and calling that authorisation. The
    server must enforce the role independently.
11. Using bcrypt instead of bcryptjs — the native build fails on Render's free tier.
12. Adding "type": "module" to server/package.json while the code uses require.
```

---

# Section 5 — Progress tracker

| Phase | Deliverable | Done | Verified |
|---|---|---|---|
| 1 | Scaffold, `/api/health` responds | ☐ | ☐ |
| 2 | 3 models + seed script | ☐ | ☐ |
| 3 | Utils + middleware, errors return JSON | ☐ | ☐ |
| 4 | Auth endpoints 1–3 | ☐ | ☐ |
| 5 | Student CRUD 4–8 | ☐ | ☐ |
| 6 | Mark CRUD 9–13 | ☐ | ☐ |
| 7 | Calculated endpoints 14–17 | ☐ | ☐ |
| 8 | Postman collection, all green | ☐ | ☐ |
| 9 | React foundation, routing, auth context | ☐ | ☐ |
| 10 | Login + Register | ☐ | ☐ |
| 11 | Students + Marks screens | ☐ | ☐ |
| 12 | Report screens + dashboard | ☐ | ☐ |
| 13 | Hardening pass + README | ☐ | ☐ |
| 14 | Deployed and smoke-tested | ☐ | ☐ |

---

# Section 6 — Optional extensions

Only after Phase 14 is verified. Each is a self-contained phase prompt of its own.

1. **CSV bulk mark upload** — multer + papaparse, row-level validation, a report of accepted and rejected rows.
2. **PDF report cards** — pdfkit server-side, streamed as a download from `GET /api/students/:id/report-card/pdf`.
3. **Charts** — recharts bar chart of subject percentages on the report card, line chart of class averages over exam types.
4. **Student self-service** — populate `User.studentProfile` at registration, and scope `/api/marks` and `/api/students` so a student role sees only their own record.
5. **Refresh tokens** — short-lived access token plus an httpOnly refresh cookie, replacing localStorage.
6. **Automated tests** — Jest + Supertest against mongodb-memory-server, covering all 17 endpoints and the four aggregations specifically.
