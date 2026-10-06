# A2IT Warranty Management — Backend (Express API)

REST API for issuing & looking up product warranty cards.
Stack: **Express 5 · MongoDB (Mongoose) · JWT auth · bcrypt · Cloudinary**.

## Setup

```bash
npm install
cp .env.example .env   # then fill in your values
npm run dev            # http://localhost:5000
```

On first run, an **admin** account is auto-created from `ADMIN_EMAIL` /
`ADMIN_PASSWORD` in `.env` (only if no admin exists yet).

## Roles & permissions

- **admin** — full access. Can create / edit / delete / disable moderators and
  grant them permissions.
- **moderator** — only the permissions the admin grants:
  `warranty:view`, `warranty:create`, `warranty:edit`, `warranty:delete`.

## API

| Method | Route                   | Access                    |
| ------ | ----------------------- | ------------------------- |
| POST   | `/api/auth/login`       | public                    |
| GET    | `/api/auth/me`          | any logged-in user        |
| GET    | `/api/users`            | admin                     |
| POST   | `/api/users`            | admin (create moderator)  |
| PUT    | `/api/users/:id`        | admin                     |
| DELETE | `/api/users/:id`        | admin                     |
| GET    | `/api/warranties?q=`    | `warranty:view` (search)  |
| GET    | `/api/warranties/:id`   | `warranty:view`           |
| POST   | `/api/warranties`       | `warranty:create`         |
| PUT    | `/api/warranties/:id`   | `warranty:edit`           |
| DELETE | `/api/warranties/:id`   | `warranty:delete`         |

Search (`?q=`) matches **Order ID**, **customer name**, or **phone**.
Create/edit accept `multipart/form-data` with an optional `image` field
(uploaded to Cloudinary; the warranty saves fine without it).
