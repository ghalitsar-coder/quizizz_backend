# Product Requirement Document (PRD) 02: Backend

**Project Name:** Quizizz Clone (Server Side)  
**Tech Stack:** Node.js (Express), Socket.io, Supabase (PostgreSQL)  
**Deploy Target:** Render / Railway (Free Tier)  
**Version:** 1.0

---

## 1. Pendahuluan

Backend berfungsi sebagai "Game Engine" dan pusat penyimpanan data. Backend harus mampu menangani koneksi persistent (WebSocket) untuk banyak pengguna sekaligus dan melakukan perhitungan skor secara otoritatif (Server-Authoritative) untuk mencegah kecurangan.

---

## 2. Skema Database (Supabase / PostgreSQL)

### A. Tabel `users` (Guru & Admin)

| Kolom        | Tipe Data | Keterangan             |
| ------------ | --------- | ---------------------- |
| `id`         | UUID      | Primary Key            |
| `email`      | VARCHAR   | Unique                 |
| `password`   | VARCHAR   | Hashed (Bcrypt/Argon2) |
| `role`       | ENUM      | 'ADMIN', 'TEACHER'     |
| `created_at` | TIMESTAMP |                        |

---

### B. Tabel `quiz_packages` (Wadah Soal)

| Kolom         | Tipe Data | Keterangan              |
| ------------- | --------- | ----------------------- |
| `id`          | UUID      | Primary Key             |
| `teacher_id`  | UUID      | Foreign Key -> users.id |
| `title`       | VARCHAR   | Judul Kuis              |
| `description` | TEXT      |                         |

---

### C. Tabel `questions` (Soal)

| Kolom           | Tipe Data | Keterangan                    |
| --------------- | --------- | ----------------------------- |
| `id`            | UUID      | Primary Key                   |
| `quiz_id`       | UUID      | FK -> quiz_packages.id        |
| `question_text` | TEXT      | Isi Pertanyaan                |
| `image_url`     | TEXT      | (Opsional) URL Gambar         |
| `options`       | JSONB     | Array: `["A", "B", "C", "D"]` |
| `correct_idx`   | INT       | Index jawaban benar (0-3)     |
| `time_limit`    | INT       | Detik (Default: 15)           |
| `points`        | INT       | Bobot Dasar (Default: 20)     |

---

### D. In-Memory Store (Redis / JS Variable)

Data permainan aktif disimpan di RAM Server (bukan Database SQL) demi kecepatan.

#### `rooms`: Map Object

- **Key:** `RoomCode` (String)
- **Value:**
  - `quizId`: UUID
  - `hostSocketId`: String
  - `currentQuestionIdx`: Int
  - `players`: Array of Objects `{ id, name, score, socketId }`
  - `status`: 'WAITING', 'ACTIVE'

---

## 3. API Endpoints (RESTful)

Digunakan untuk komunikasi non-realtime (CMS).

### Authentication

- `POST /api/auth/login`  
  → Return JWT Token (juga set sebagai HTTP-only cookie)
  → Supports dual authentication: Cookie (HTTP-only) atau Authorization Header

- `POST /api/auth/register`  
  → Register Guru baru (validasi email kampus opsional)
  → Return JWT Token (juga set sebagai HTTP-only cookie)

- `POST /api/auth/logout`  
  → Clear authentication cookie
  → Return success message

**Note:** Token bisa dikirim via:

- Cookie: `auth_token` (HTTP-only, recommended untuk browser)
- Authorization Header: `Authorization: Bearer <token>` (recommended untuk mobile/API clients)

### Quiz Management

- `GET /api/quizzes`  
  → Get list kuis milik guru (Requires authentication: Cookie atau Authorization Header)

- `POST /api/quizzes`  
  → Create kuis baru beserta soal-soalnya (Transactional, requires authentication)

- `GET /api/quizzes/:id`  
  → Get detail kuis untuk dimuat ke Room (requires authentication)
  → Validates quiz ownership (teacher_id must match authenticated user)

### Health Check

- `GET /health`  
  → Server health check endpoint (no authentication required)
  → Returns: `{ status: "ok", timestamp: "..." }`

---

## 4. Game Logic & Scoring System

Sistem penilaian menggunakan algoritma **Time-Decay** (Penurunan nilai berdasarkan waktu).

### Rumus Penilaian

**Input:**

- `T_total`: Batas waktu soal (misal: 15 detik)
- `T_answer`: Waktu jawaban diterima server (dihitung dari `startTime`)
- `Base_Score`: Poin maksimal soal (misal: 20 poin)

**Logika (Pseudocode):**

```javascript
function calculateScore(tAnswer, baseScore, isCorrect) {
  if (isCorrect === false) return 0;

  if (tAnswer <= 5) {
    return baseScore; // Full Point (20)
  } else if (tAnswer <= 10) {
    return Math.floor(baseScore * 0.75); // 15 Poin
  } else {
    return Math.floor(baseScore * 0.5); // 10 Poin
  }
}
```

---

### Validasi Keamanan

#### Anti-Cheat

Jawaban yang dikirim siswa hanya berisi `index` (misal: 0, 1, 2, 3). Server yang mencocokkan dengan kunci jawaban di database. Client tidak pernah menerima data kunci jawaban.

#### Late Submission

Server menolak jawaban yang masuk > (Batas Waktu + 2 detik toleransi latensi).

---

## 5. Socket.io Events

### Client → Server Events

| Event           | Payload                                  | Deskripsi              |
| --------------- | ---------------------------------------- | ---------------------- |
| `create_room`   | `{ quizId: UUID, userId: UUID }`         | Guru membuat room baru |
| `join_room`     | `{ roomCode: string, nickname: string }` | Siswa join room        |
| `start_game`    | `{ roomCode: string }`                   | Host mulai game        |
| `submit_answer` | `{ roomCode, answerIdx, timeElapsed }`   | Submit jawaban         |
| `game:next`     | `{ roomCode: string }`                   | Host next question     |
| `game:end`      | `{ roomCode: string }`                   | Host end game          |

### Server → Client Events

| Event                   | Payload                                                      | Deskripsi                             |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `room_created`          | `{ roomCode, quizTitle, questionCount }`                     | Room berhasil dibuat (to host)        |
| `player_joined`         | `{ name, totalPlayers, players: [...] }`                     | Update daftar pemain di lobby         |
| `player_joined_success` | `{ status: "OK" }`                                           | Konfirmasi siswa berhasil masuk       |
| `game:started`          | `{ questionCount: number }`                                  | Game dimulai                          |
| `question_start`        | `{ qIndex, qText, imageUrl, options, duration, points }`     | Soal baru ditampilkan                 |
| `answer_result`         | `{ isCorrect, scoreEarned, currentTotal, correctAnswerIdx }` | Hasil jawaban individual (to student) |
| `live_stats`            | `{ a, b, c, d }`                                             | Update grafik batang untuk host       |
| `question_end`          | `{ correctAnswerIdx }`                                       | Waktu habis, tampilkan jawaban benar  |
| `update_leaderboard`    | `{ leaderboard: [{name, score, rank}, ...] }`                | Update ranking real-time              |
| `game:ended`            | `{ finalLeaderboard: [...] }`                                | Game selesai                          |
| `final_results`         | `{ winner, top3: [...] }`                                    | Hasil akhir dengan podium             |
| `error_message`         | `{ msg: string }`                                            | Error message                         |

**Note:** Event names menggunakan underscore (`snake_case`) untuk consistency. UUID validation dilakukan untuk `quizId` dan `userId` di `create_room` event.

---

## 6. Error Handling & Logging

### Error Codes

- `400` - Bad Request (Invalid input)
- `401` - Unauthorized (Invalid token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found (Resource tidak ditemukan)
- `500` - Internal Server Error

### Logging Strategy

- Log semua koneksi Socket.io (connect/disconnect)
- Log semua API requests dengan timestamp
- Log error dengan stack trace
- Gunakan winston atau pino untuk structured logging

---

## 7. Performance & Scalability

### Optimizations

- Implement connection pooling untuk Supabase
- Rate limiting untuk API endpoints (express-rate-limit)
- Compress Socket.io messages
- Implement proper indexing pada database tables

### Monitoring

- Track active rooms count
- Monitor memory usage untuk in-memory store
- Alert jika connection count > threshold

---

## 8. Security Checklist

- ✅ Password hashing dengan bcrypt (salt rounds: 10)
- ✅ JWT dengan expiration time (24 hours)
- ✅ Cookie-based authentication dengan HTTP-only flag (prevents XSS)
- ✅ Dual authentication support (Cookie + Authorization Header)
- ✅ Input validation menggunakan express-validator
- ✅ UUID validation untuk quizId dan userId (prevent SQL injection)
- ✅ CORS configuration yang proper (credentials support)
- ✅ Rate limiting untuk mencegah DDoS (100 requests per 15 minutes per IP)
- ✅ SQL injection prevention (parameterized queries via Supabase)
- ✅ XSS protection (sanitize user input, cookie httpOnly)
- ✅ Helmet.js untuk security headers
- ✅ SameSite cookie protection (CSRF prevention)

---

## Catatan Deployment

### Environment Variables

```env
# Database
DATABASE_URL=<supabase_connection_string>
SUPABASE_URL=<supabase_project_url>
SUPABASE_KEY=<supabase_anon_key>
SUPABASE_SERVICE_KEY=<supabase_service_role_key>

# JWT
JWT_SECRET=<random_secret_key>
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=<frontend_url>
```

**Note:** `SUPABASE_SERVICE_KEY` digunakan untuk backend operations (bypass RLS jika ada)

### Free Tier Limitations

- Render: Sleep after 15 minutes inactivity
- Railway: 500 hours/month
- Supabase: 500MB database, 2GB bandwidth

### Startup Script

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node scripts/migrate.js"
  }
}
```

---

## 9. Additional Features (Beyond Original PRD)

### Cookie-Based Authentication

- Token dikirim sebagai HTTP-only cookie setelah login/register
- Cookie settings: `httpOnly: true`, `secure: true` (production), `sameSite: 'strict'`
- Middleware membaca token dari cookie (priority) atau Authorization header
- Logout endpoint untuk clear cookie

### UUID Validation

- Validasi format UUID untuk `quizId` dan `userId` di Socket.io events
- Mencegah SQL injection dan format errors
- Error message yang jelas untuk invalid UUID format

### Health Check Endpoint

- `GET /health` untuk monitoring server status
- No authentication required
- Returns server status and timestamp

---

**Last Updated:** December 2024  
**Document Version:** 1.1
