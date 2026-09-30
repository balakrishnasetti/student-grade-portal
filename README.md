# Student Grade Portal

A MERN application for teachers to manage students and marks, then calculate report cards, rankings, subject averages, and class performance summaries.

## Features

- Teacher and student authentication with JWT
- Student CRUD with pagination, search, class filters, and cascade mark deletion
- Mark CRUD with score validation and duplicate protection
- Weighted report-card percentages and class-scoped ranks
- Topper rankings with deterministic tie-breaks
- Subject averages and per-row pass/fail calculations
- Two-stage class summaries weighted equally by student
- Responsive React screens with print-ready report cards

## API endpoints

| # | Method | Endpoint | Access |
|---:|---|---|---|
| 1 | POST | `/api/auth/register` | Public |
| 2 | POST | `/api/auth/login` | Public |
| 3 | GET | `/api/auth/me` | Authenticated |
| 4 | POST | `/api/students` | Teacher |
| 5 | GET | `/api/students` | Teacher: all; student: own record |
| 6 | GET | `/api/students/:id` | Teacher: any; student: own record only |
| 7 | PUT | `/api/students/:id` | Teacher |
| 8 | DELETE | `/api/students/:id` | Teacher |
| 9 | POST | `/api/marks` | Teacher |
| 10 | GET | `/api/marks` | Teacher: all; student: own marks only |
| 11 | GET | `/api/marks/:id` | Teacher: any; student: own marks only |
| 12 | PUT | `/api/marks/:id` | Teacher |
| 13 | DELETE | `/api/marks/:id` | Teacher |
| 14 | GET | `/api/students/:id/report-card` | Teacher: any; student: own report only |
| 15 | GET | `/api/marks/subject/:id/average` | Teacher |
| 16 | GET | `/api/students/top` | Teacher |
| 17 | GET | `/api/marks/class-summary` | Teacher |

Student mark lists are scoped to the authenticated student's linked profile.
Student accounts cannot access class-wide rankings or aggregates.

All API responses use `{ success, message?, data?, meta?, count? }` for success and `{ success: false, message, errors? }` for errors.

## Tech stack

- Node.js 20+, Express 4, CommonJS
- MongoDB with Mongoose 8
- bcryptjs, jsonwebtoken, express-validator, dotenv, cors
- React 18, Vite, react-router-dom 6, axios
- Plain CSS in one client stylesheet

## Local setup

Requirements: Node.js 20+ and a MongoDB instance or MongoDB Atlas database.

### Backend

```powershell
cd studentgradeportal\server
copy .env.example .env
npm install
npm run dev
```

Before starting the API, set a private `TEACHER_REGISTRATION_CODE` value in
`server/.env`. Teacher registration requires this code. Students can register
only after a teacher adds their record with the same email address. The API
runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

### Frontend

```powershell
cd studentgradeportal\client
copy .env.example .env
npm install
npm run dev
```

Open the Vite URL printed in the terminal, normally `http://localhost:5173`.

## Environment variables

### Server: `server/.env`

| Variable | Description |
|---|---|
| `PORT` | API port; defaults to `5000` |
| `NODE_ENV` | `development` or `production` |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs; set this only in the environment |
| `JWT_EXPIRES_IN` | JWT lifetime, such as `7d` |
| `TEACHER_REGISTRATION_CODE` | Private code required to register teacher accounts |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated when needed |

### Client: `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL, normally `http://localhost:5000/api` |

Never commit `.env` files. They are excluded by `.gitignore`.

## Seed data

Configure `MONGO_URI` in `server/.env`, then run:

```powershell
cd studentgradeportal\server
node src\seed.js
```

The seed script clears the three collections and inserts one teacher, ten students across classes `10` and `12`, and fifty final-exam marks. Login credentials: `teacher@school.com` / `secret123`.

## Postman test run order

Import `student-grade-portal.postman_collection.json` into Postman and set `baseUrl` to `http://localhost:5000/api`.

1. Auth: register, login, current user, then negative auth cases.
2. Students: create, list, get, update, toppers, malformed ID, and no-token case.
3. Marks: create, list, get, update, subject average, class summary, negative mark cases, and delete mark.
4. Reports: report-card verification and final student cleanup.

The collection saves `token`, `studentId`, and `markId` automatically.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for MongoDB Atlas, Render, Vercel, CORS,
health-check, and post-deployment smoke-test instructions.

## Screenshots

Screenshot placeholder: add application screenshots here after running the client locally.
