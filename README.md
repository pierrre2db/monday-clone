# Monday Clone

Self-hosted work-management app (boards, typed columns, Table/Kanban/Calendar views).

## Run with Docker (VPS or macOS)

```bash
cp .env.example .env   # set APP_PASSWORD and SESSION_SECRET
docker compose up -d --build
docker compose exec app npm run db:seed   # optional demo board
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `APP_PASSWORD`.

## Local dev

```bash
docker compose up -d db
cp .env.example .env    # point DATABASE_URL at localhost:5432
npx prisma migrate deploy
npm run db:seed
npm run dev
```

## Environment

| Var | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `APP_PASSWORD` | single shared instance password |
| `SESSION_SECRET` | cookie signing secret (long random) |
| `UPLOAD_DIR` | file storage path (default `/data/uploads`) |
| `MAX_UPLOAD_BYTES` | max upload size (default `10485760`) |

Data persists in Docker volumes `pgdata` and `uploads`.

## Tests

```bash
npm test
```
