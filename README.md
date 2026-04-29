# TaskHub Backend

Boş vaxtlarda kiçik işlər tapıb pul qazanmaq üçün platforma backend-i.
**Kateqoriyalar**: Home Services · Delivery · Technical · Education · Events

## Stack
Node.js + Express + TypeScript · PostgreSQL + Prisma · Socket.io · JWT · Stripe · Zod · Multer

## Quraşdırma
```bash
cd backend
npm install
cp .env.example .env   # DATABASE_URL və JWT_SECRET-i doldur
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Test hesabları
| Email | Şifrə | Rol |
|---|---|---|
| admin@taskhub.az | Admin123! | ADMIN |
| ali@taskhub.az | User1234! | USER |
| leyla@taskhub.az | User1234! | USER |

## Funksiyalar
- ✅ Auth (yaş 16-40), JWT + refresh rotation
- ✅ İş elanları (5 kateqoriya, filter, axtarış)
- ✅ Müraciətlər (apply, accept/reject, withdraw)
- ✅ **Escrow ödəniş** (Stripe, dev mode-da Stripe-siz işləyir)
- ✅ **Komissiya**: 5% standart / 8% urgent / 10% events
- ✅ **Check-in/out** — hər iki tərəf təsdiqi
- ✅ Rating + Review
- ✅ **Real-time chat** (Socket.io, typing, read receipts)
- ✅ **Badge sistemi** (Verified, Top Rated, Fast Responder, Reliable, Rising Star, Expert)
- ✅ **ID verification** (vəsiqə + selfie + admin baxışı)
- ✅ **Dispute** mexanizmi
- ✅ Bildirişlər (DB + real-time)
- ✅ Admin panel (statistika, dispute, verification)
- ✅ Rate limiting, helmet, CORS, Zod validation

## Əsas API endpoints
- `POST /api/auth/register|login|refresh|logout`, `GET /api/auth/me`
- `GET|POST /api/jobs`, `GET|PATCH /api/jobs/:id`, `POST /api/jobs/:id/{cancel,check,applications,reviews,dispute}`
- `GET /api/applications/me`, `POST /api/applications/:id/{respond,withdraw}`
- `POST /api/payments/:id/{fund,release,refund}`, `GET /api/payments/me`
- `GET|POST /api/chat/conversations`, `GET|POST /api/chat/conversations/:id/messages`
- `POST /api/verification/submit` (multipart), `POST /api/verification/:id/{approve,reject}`
- `GET /api/users/me/dashboard`, `PATCH /api/users/me`, `GET /api/users/:usernameOrId`
- `GET /api/notifications`, `GET /api/admin/stats`

## Socket.io eventləri
`conversation:join/leave`, `message:send` (ack), `message:new`, `message:read`, `typing`, `notification:new`

## Növbəti addım
Frontend (Lovable-də React) bu API ilə inteqrasiya olunacaq.
