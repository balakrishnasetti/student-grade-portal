# Deployment Guide

This project deploys as two services:

- Express API on Render from the `server` directory
- Vite React client on Vercel from the `client` directory

## 1. MongoDB Atlas

1. Create or sign in to MongoDB Atlas.
2. Create an M0 free cluster.
3. Create a database user and store its username and password securely.
4. Add network access `0.0.0.0/0` in Atlas Network Access.
5. Copy the Atlas connection string and replace its password and database name.

The free Render tier does not provide a stable outbound IP address for the
application. Allowing `0.0.0.0/0` lets the Render instance reach Atlas. Protect
the database with a strong database-user password and least-privilege access.

## 2. Deploy the API to Render

Create a new Render Web Service connected to the repository with these settings:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Set these Render environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random production secret |
| `JWT_EXPIRES_IN` | `7d` or another chosen lifetime |
| `TEACHER_REGISTRATION_CODE` | A private code required to create teacher accounts |
| `CLIENT_URL` | The Vercel origin after the client is deployed |

Keep `TEACHER_REGISTRATION_CODE` private and share it only with trusted teachers.
Students can register only after a teacher creates their student record with
the same email address. Student accounts can read only their own profile and
marks; class-wide rankings and summaries are teacher-only.

Do not set `PORT` in Render. Render supplies the listening port through its
runtime environment, and `server/src/server.js` reads `process.env.PORT`.

The free Render instance may cold-start in approximately 30-50 seconds after
being idle. The first request after sleeping can therefore take longer.

## 3. Deploy the client to Vercel

1. Import the same repository into Vercel.
2. Set the project root directory to `client`.
3. Use `npm install` as the install step and `npm run build` as the build command.
4. Set the Vercel environment variable:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/api` |

5. Deploy the client.

`client/vercel.json` contains a catch-all rewrite to `/index.html`. This is
required because React Router paths such as `/students` otherwise return a 404
when the browser refreshes a deep link on Vercel.

## 4. CORS ordering trap

Deploy in this order:

1. Deploy the API to Render.
2. Deploy the client to Vercel using the Render API URL.
3. Copy the final Vercel origin, such as `https://your-portal.vercel.app`.
4. Go back to the Render service and set `CLIENT_URL` to that Vercel origin.
5. Redeploy the Render service.

The API reads `CLIENT_URL` as a comma-separated list, so a cutover value can be
configured as `http://localhost:5173,https://your-portal.vercel.app`. If the
Vercel origin is not added to `CLIENT_URL` after the client deploys, the browser
will block API requests because of CORS.

## 5. Post-deploy smoke test

Run these checks against the deployed API and client:

- Open `GET https://YOUR-RENDER-SERVICE.onrender.com/api/health` and confirm a successful JSON response.
- Set `TEACHER_REGISTRATION_CODE`, then register a teacher account with that code.
- Log in and confirm a token is issued.
- Create a student with an email address, then register a student account using that exact email.
- Create marks for that student.
- Confirm the student sees only their own marks and report card.
- Confirm only the teacher can open toppers, subject average, and class summary screens.
- Refresh a deep client link such as `/students` or `/students/:id/report-card` and confirm Vercel serves the React app.

Render pings the root path by default. Configure Render's health check path as
`/api/health`, because that is the application's health endpoint.
