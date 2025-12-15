# Quizizz Clone - Backend Server

Backend server untuk aplikasi Quizizz Clone menggunakan Node.js, Express, Socket.io, dan Supabase (PostgreSQL).

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Real-time:** Socket.io v4
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT
- **Security:** bcrypt, helmet, CORS, rate limiting
- **Logging:** Winston

## Fitur

- ✅ Authentication (Login/Register) untuk Guru dan Admin
- ✅ Quiz Management (CRUD Quiz dan Questions)
- ✅ Real-time Game dengan Socket.io
- ✅ Room Management (In-Memory)
- ✅ Time-Decay Scoring System
- ✅ Leaderboard real-time
- ✅ Anti-cheat protection
- ✅ Input validation & sanitization
- ✅ Error handling & logging

## Prerequisites

- Node.js >= 18.x
- Supabase account (free tier)
- npm atau yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Buat file `.env` di root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# JWT
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Setup Database

1. Login ke Supabase Dashboard
2. Buka SQL Editor
3. Jalankan script dari `scripts/schema.sql`
4. Atau copy-paste schema SQL ke Supabase SQL Editor

### 4. Run Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server akan berjalan di `http://localhost:3001`

## API Endpoints

### Authentication

#### POST `/api/auth/register`
Register user baru (Guru/Admin)

**Request:**
```json
{
  "email": "teacher@example.com",
  "password": "password123",
  "role": "TEACHER" // optional, default: "TEACHER"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "teacher@example.com",
    "role": "TEACHER"
  },
  "token": "jwt_token"
}
```

#### POST `/api/auth/login`
Login user

**Request:**
```json
{
  "email": "teacher@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "teacher@example.com",
    "role": "TEACHER"
  },
  "token": "jwt_token"
}
```

### Quiz Management

Semua endpoint memerlukan Authorization header: `Authorization: Bearer <token>`

#### GET `/api/quizzes`
Get semua quiz milik authenticated teacher

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Math Quiz Chapter 5",
    "description": "Quiz tentang aljabar",
    "created_at": "2024-12-01T10:00:00Z",
    "questions": [...]
  }
]
```

#### GET `/api/quizzes/:id`
Get detail quiz by ID

#### POST `/api/quizzes`
Create quiz baru dengan questions

**Request:**
```json
{
  "title": "Math Quiz Chapter 5",
  "description": "Quiz tentang aljabar",
  "questions": [
    {
      "question_text": "Berapakah hasil dari 2 + 2?",
      "image_url": null,
      "options": ["3", "4", "5", "6"],
      "correct_idx": 1,
      "time_limit": 15,
      "points": 20
    }
  ]
}
```

## Socket.io Events

### Client → Server

#### `create_room`
Guru membuat room baru

```json
{
  "quizId": "uuid",
  "userId": "uuid"
}
```

#### `join_room`
Siswa join room

```json
{
  "roomCode": "ABC123",
  "nickname": "Budi"
}
```

#### `start_game`
Host mulai game

```json
{
  "roomCode": "ABC123"
}
```

#### `submit_answer`
Siswa submit jawaban

```json
{
  "roomCode": "ABC123",
  "answerIdx": 1,
  "timeElapsed": 3.2
}
```

#### `game:next`
Host next question

```json
{
  "roomCode": "ABC123"
}
```

#### `game:end`
Host end game

```json
{
  "roomCode": "ABC123"
}
```

### Server → Client

#### `room_created`
Room berhasil dibuat (to host)

#### `player_joined`
Player baru join (broadcast to all)

#### `player_joined_success`
Konfirmasi siswa berhasil join

#### `game:started`
Game dimulai

#### `question_start`
Soal baru ditampilkan

#### `answer_result`
Hasil jawaban individual (to student)

#### `live_stats`
Update grafik batang (to host)

#### `question_end`
Waktu soal habis, tampilkan jawaban benar

#### `update_leaderboard`
Update ranking

#### `game:ended`
Game selesai

#### `final_results`
Hasil akhir dengan podium

#### `error_message`
Error message

## Scoring System

Menggunakan algoritma **Time-Decay**:

- Jawaban dalam ≤ 5 detik: **100%** poin (Full points)
- Jawaban dalam ≤ 10 detik: **75%** poin
- Jawaban setelah 10 detik: **50%** poin
- Jawaban salah: **0** poin

## Project Structure

```
backend/
├── config/
│   ├── database.js      # Supabase connection
│   └── logger.js        # Winston logger config
├── middleware/
│   ├── auth.js          # JWT authentication
│   └── validation.js    # Input validation
├── models/
│   └── Room.js          # Room model (in-memory)
├── routes/
│   ├── auth.js          # Authentication routes
│   └── quizzes.js       # Quiz management routes
├── services/
│   ├── authService.js   # Auth business logic
│   └── quizService.js   # Quiz business logic
├── socket/
│   └── gameHandler.js   # Socket.io game handlers
├── utils/
│   ├── scoring.js       # Scoring algorithm
│   └── roomCode.js      # Room code generator
├── scripts/
│   ├── migrate.js       # Migration script
│   └── schema.sql       # Database schema
├── logs/                # Log files (auto-created)
├── server.js            # Main server file
├── package.json
└── README.md
```

## Security Features

- ✅ Password hashing dengan bcrypt (10 salt rounds)
- ✅ JWT authentication dengan expiration
- ✅ Input validation dengan express-validator
- ✅ CORS configuration
- ✅ Rate limiting (100 requests per 15 minutes per IP)
- ✅ Helmet.js untuk security headers
- ✅ SQL injection prevention (parameterized queries via Supabase)
- ✅ XSS protection (input sanitization)

## Logging

Logs tersimpan di folder `logs/`:
- `error.log` - Error logs only
- `combined.log` - All logs

Format: JSON untuk production, colored console untuk development

## Deployment

### Environment Variables untuk Production

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=<supabase_connection_string>
SUPABASE_URL=<supabase_url>
SUPABASE_KEY=<supabase_anon_key>
SUPABASE_SERVICE_KEY=<supabase_service_role_key>
JWT_SECRET=<strong_random_secret>
CORS_ORIGIN=<your_frontend_url>
```

### Deploy ke Render/Railway

1. Connect repository ke Render/Railway
2. Set environment variables
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy!

## Notes

- Rooms disimpan di memory (Map object), akan hilang saat server restart
- Untuk production dengan multiple instances, gunakan Redis adapter untuk Socket.io
- Free tier Supabase: 500MB database, 2GB bandwidth
- Free tier Render: Sleep setelah 15 menit inactivity
- Free tier Railway: 500 hours/month

## License

ISC

