# Troubleshooting Guide

## Error: "Route not found"

Jika Anda mendapat error `{"error":"Route not found"}`, periksa hal berikut:

### ✅ Format Request yang Benar

**Register:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### ❌ Kesalahan Umum

1. **Path salah - kurang prefix `/api/auth`:**
   ```bash
   # SALAH ❌
   curl -X POST http://localhost:3001/register
   
   # BENAR ✅
   curl -X POST http://localhost:3001/api/auth/register
   ```

2. **Method HTTP salah:**
   ```bash
   # SALAH ❌ (GET tidak ada untuk register)
   curl -X GET http://localhost:3001/api/auth/register
   
   # BENAR ✅
   curl -X POST http://localhost:3001/api/auth/register
   ```

3. **Tidak ada Content-Type header:**
   ```bash
   # SALAH ❌
   curl -X POST http://localhost:3001/api/auth/register \
     -d '{"email":"test@example.com","password":"password123"}'
   
   # BENAR ✅
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

4. **Path dengan trailing slash:**
   ```bash
   # SALAH ❌
   curl -X POST http://localhost:3001/api/auth/register/
   
   # BENAR ✅
   curl -X POST http://localhost:3001/api/auth/register
   ```

### 🔍 Debugging

1. **Cek apakah server berjalan:**
   ```bash
   curl http://localhost:3001/health
   ```
   Seharusnya return: `{"status":"ok","timestamp":"..."}`

2. **Cek log server:**
   Lihat di terminal dimana server berjalan. Seharusnya ada log:
   ```
   API Request {"method":"POST","path":"/api/auth/register",...}
   ```

3. **Test dengan verbose mode:**
   ```bash
   curl -v -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

### 📋 Daftar Endpoints yang Tersedia

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register user baru |
| POST | `/api/auth/login` | Login user |
| GET | `/api/quizzes` | Get semua quizzes (requires auth) |
| GET | `/api/quizzes/:id` | Get quiz by ID (requires auth) |
| POST | `/api/quizzes` | Create quiz (requires auth) |

### 🔐 Endpoints yang Memerlukan Authentication

Untuk endpoints yang memerlukan auth, tambahkan header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

Contoh:
```bash
TOKEN="your-token-here"

curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer $TOKEN"
```

