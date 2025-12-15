# Setup Guide

Panduan lengkap untuk setup backend Quizizz Clone.

## 1. Install Dependencies

```bash
npm install
```

## 2. Setup Supabase

1. Buat akun di [Supabase](https://supabase.com)
2. Buat project baru
3. Ambil credentials:
   - **Project URL** (SUPABASE_URL)
   - **Anon Key** (SUPABASE_KEY)
   - **Service Role Key** (SUPABASE_SERVICE_KEY) - untuk backend
   - **Database URL** (DATABASE_URL) - dari Settings > Database

## 3. Setup Database Schema

### Opsi A: Via Supabase Dashboard (Recommended)

1. Login ke Supabase Dashboard
2. Buka **SQL Editor**
3. Copy seluruh isi file `scripts/schema.sql`
4. Paste dan jalankan di SQL Editor

### Opsi B: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## 4. Setup Environment Variables

Buat file `.env` di root directory:

```env
# Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# JWT
JWT_SECRET=your_very_secure_random_secret_key_min_32_chars
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Tips:**
- Generate JWT_SECRET dengan: `openssl rand -base64 32`
- Atau gunakan online generator untuk random string 32+ karakter

## 5. Test Connection

```bash
npm run dev
```

Jika berhasil, Anda akan melihat:
```
✓ Database connected successfully
Server started on port 3001
```

## 6. Test API Endpoints

### Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123",
    "role": "TEACHER"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'
```

Copy token dari response untuk digunakan di request berikutnya.

### Create Quiz

```bash
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Quiz",
    "description": "Quiz untuk testing",
    "questions": [
      {
        "question_text": "Berapakah hasil dari 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correct_idx": 1,
        "time_limit": 15,
        "points": 20
      }
    ]
  }'
```

## 7. Test Socket.io Connection

Anda bisa test dengan:
- Frontend client yang sudah dibuat
- Atau menggunakan tool seperti [Socket.io Client](https://socket.io/docs/v4/client-api/)

### Contoh JavaScript Client Test:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Create room
  socket.emit('create_room', {
    quizId: 'your-quiz-id',
    userId: 'your-user-id'
  });
});

socket.on('room_created', (data) => {
  console.log('Room created:', data.roomCode);
});
```

## Troubleshooting

### Error: "Missing Supabase credentials"
- Pastikan file `.env` sudah dibuat
- Pastikan semua variabel sudah diisi dengan benar
- Restart server setelah mengubah `.env`

### Error: "Table does not exist"
- Pastikan schema sudah dijalankan di Supabase SQL Editor
- Check apakah tabel `users`, `quiz_packages`, dan `questions` sudah ada

### Error: "Invalid token"
- Pastikan JWT_SECRET sudah di-set
- Pastikan token belum expired
- Pastikan format token: `Bearer <token>`

### Socket.io Connection Failed
- Pastikan CORS_ORIGIN sudah di-set dengan benar
- Pastikan port 3001 tidak digunakan aplikasi lain
- Check firewall settings

### Database Connection Error
- Pastikan DATABASE_URL benar (termasuk password)
- Pastikan Supabase project masih aktif
- Check network connectivity

## Next Steps

Setelah setup berhasil:
1. Integrate dengan frontend
2. Test semua Socket.io events
3. Deploy ke production (Render/Railway)

## Production Deployment

Saat deploy ke production:
1. Set semua environment variables di hosting provider
2. Set `NODE_ENV=production`
3. Set `CORS_ORIGIN` ke frontend production URL
4. Generate secure `JWT_SECRET` baru
5. Enable SSL/HTTPS
6. Monitor logs untuk errors

