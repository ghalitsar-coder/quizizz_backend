# Authentication Guide - Cara Mengakses Protected Endpoints

## 🔐 Error 401 Unauthorized

Jika Anda mendapat error `401 Unauthorized`, berarti request Anda belum ter-authenticate. Endpoint `/api/quizzes` memerlukan authentication token.

## ✅ Solusi: Langkah-langkah

### Step 1: Login atau Register

**Login:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

**Atau Register (jika belum punya akun):**

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"TEACHER"}' \
  -c cookies.txt
```

**Response akan mengembalikan token:**

```json
{
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "role": "TEACHER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 2: Akses Protected Endpoint

Ada **2 cara** untuk mengirim token:

#### **Cara 1: Menggunakan Cookie (Recommended untuk Browser)**

Cookie otomatis tersimpan setelah login, gunakan `-b cookies.txt`:

```bash
curl -X GET http://localhost:3001/api/quizzes \
  -b cookies.txt
```

#### **Cara 2: Menggunakan Authorization Header**

Copy token dari response login, lalu:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer $TOKEN"
```

## 📋 Contoh Lengkap (cURL)

### Complete Flow:

```bash
# 1. Login dan simpan cookie
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# 2. Akses protected endpoint menggunakan cookie
curl -X GET http://localhost:3001/api/quizzes \
  -b cookies.txt

# 3. Create quiz
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Test Quiz",
    "questions": [{
      "question_text": "Test?",
      "options": ["A", "B", "C", "D"],
      "correct_idx": 0
    }]
  }'
```

## 🌐 Frontend (JavaScript/React)

### Menggunakan Cookie (Recommended)

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // ⭐ PENTING: untuk cookie
    body: JSON.stringify({ email, password }),
  });
  return await response.json();
};

// Fetch quizzes (cookie otomatis dikirim)
const getQuizzes = async () => {
  const response = await fetch("http://localhost:3001/api/quizzes", {
    credentials: "include", // ⭐ PENTING: untuk cookie
  });
  return await response.json();
};
```

### Menggunakan Authorization Header

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();

  // Simpan token
  localStorage.setItem("token", data.token);
  return data;
};

// Fetch quizzes dengan token
const getQuizzes = async () => {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:3001/api/quizzes", {
    headers: {
      Authorization: `Bearer ${token}`, // ⭐ PENTING: token di header
    },
  });
  return await response.json();
};
```

## 🔍 Debugging

### Cek Apakah Token Valid

```bash
# Test dengan verbose untuk lihat response
curl -v -X GET http://localhost:3001/api/quizzes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Cek Cookie

```bash
# Lihat cookie yang tersimpan
cat cookies.txt
```

### Test Token di Middleware

Jika masih error, cek:

1. ✅ Apakah sudah login/register?
2. ✅ Apakah token dikirim dengan benar?
3. ✅ Apakah token belum expired? (24 jam)
4. ✅ Apakah menggunakan format `Bearer <token>` di header?

## 📝 Endpoints yang Memerlukan Authentication

Semua endpoint di bawah ini memerlukan token:

- ✅ `GET /api/quizzes` - Get all quizzes
- ✅ `GET /api/quizzes/:id` - Get quiz by ID
- ✅ `POST /api/quizzes` - Create quiz

**Endpoints yang TIDAK memerlukan authentication:**

- ❌ `POST /api/auth/login` - Login
- ❌ `POST /api/auth/register` - Register
- ❌ `GET /health` - Health check

## 🛠️ Quick Test Script

Buat file `test_auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
EMAIL="test@example.com"
PASSWORD="password123"

echo "=== 1. Login ==="
curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -c cookies.txt | jq

echo -e "\n=== 2. Get Quizzes (with cookie) ==="
curl -s -X GET $BASE_URL/api/quizzes \
  -b cookies.txt | jq

echo -e "\n=== 3. Logout ==="
curl -s -X POST $BASE_URL/api/auth/logout \
  -b cookies.txt | jq
```

Jalankan:

```bash
chmod +x test_auth.sh
./test_auth.sh
```

## ❓ FAQ

**Q: Kenapa masih error 401 setelah login?**  
A: Pastikan menggunakan cookie (`-b cookies.txt` atau `credentials: 'include'`) atau mengirim token di Authorization header.

**Q: Token expired setelah 24 jam?**  
A: Ya, token expired setelah 24 jam. Login lagi untuk mendapatkan token baru.

**Q: Bisa menggunakan kedua metode (cookie + header) sekaligus?**  
A: Bisa! Middleware akan check header dulu, kalau tidak ada baru check cookie.

**Q: Bagaimana logout?**  
A:

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

Cookie akan dihapus dan token tidak valid lagi.
