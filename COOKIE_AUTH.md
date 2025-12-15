# Cookie-Based Authentication

Backend sekarang mendukung **dual authentication**: token bisa dikirim via **Cookie** (HTTP-only) atau **Authorization Header** (Bearer token).

## ✅ Fitur Cookie Authentication

### 1. **Login/Register** - Set Cookie Otomatis
Saat login atau register, token otomatis di-set sebagai HTTP-only cookie dengan nama `auth_token`.

### 2. **Middleware** - Baca dari Cookie atau Header
Middleware `authenticateToken` akan mencoba membaca token dari:
1. **Authorization header** (priority): `Authorization: Bearer <token>`
2. **Cookie**: `auth_token` (fallback)

### 3. **Logout** - Clear Cookie
Endpoint `/api/auth/logout` untuk menghapus cookie.

## 📋 Cookie Configuration

```javascript
{
  httpOnly: true,              // Tidak bisa diakses via JavaScript (security)
  secure: true,                // HTTPS only di production
  sameSite: 'strict',          // CSRF protection
  maxAge: 24 * 60 * 60 * 1000  // 24 jam
}
```

## 🔄 Cara Kerja

### Login/Register

**Request:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Response:**
- **Cookie**: `auth_token=<jwt-token>` (HTTP-only)
- **Body**: 
```json
{
  "user": { "id": "...", "email": "...", "role": "..." },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Authenticated Requests

**Opsi 1: Menggunakan Cookie (Recommended untuk Browser)**
```javascript
// Frontend tidak perlu set header, cookie otomatis dikirim
fetch('http://localhost:3001/api/quizzes', {
  credentials: 'include' // Penting untuk mengirim cookie
});
```

**Opsi 2: Menggunakan Authorization Header**
```javascript
// Tetap bisa menggunakan Bearer token
fetch('http://localhost:3001/api/quizzes', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Logout

**Request:**
```bash
POST /api/auth/logout
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

Cookie `auth_token` akan dihapus.

## 🌐 Frontend Integration

### React Example

```javascript
// Login dengan credentials: 'include' untuk cookie
const login = async (email, password) => {
  const response = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Penting! Untuk mengirim cookie
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  return data;
};

// Fetch protected resources - cookie otomatis dikirim
const fetchQuizzes = async () => {
  const response = await fetch('http://localhost:3001/api/quizzes', {
    credentials: 'include' // Penting! Untuk mengirim cookie
  });
  
  return await response.json();
};

// Logout
const logout = async () => {
  await fetch('http://localhost:3001/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
};
```

### Axios Example

```javascript
import axios from 'axios';

// Configure axios untuk selalu mengirim cookie
axios.defaults.withCredentials = true;

// Login
const login = async (email, password) => {
  const response = await axios.post('http://localhost:3001/api/auth/login', {
    email,
    password
  });
  return response.data;
};

// Fetch quizzes (cookie otomatis dikirim)
const fetchQuizzes = async () => {
  const response = await axios.get('http://localhost:3001/api/quizzes');
  return response.data;
};

// Logout
const logout = async () => {
  await axios.post('http://localhost:3001/api/auth/logout');
};
```

## 🔒 Security Features

### HTTP-Only Cookie
- Cookie tidak bisa diakses via JavaScript (`document.cookie`)
- Mencegah XSS attacks yang mencoba mencuri token

### Secure Flag (Production)
- Cookie hanya dikirim via HTTPS di production
- Mencegah man-in-the-middle attacks

### SameSite: Strict
- Cookie hanya dikirim untuk same-site requests
- Mencegah CSRF attacks

### Dual Authentication Support
- Backend tetap menerima Authorization header
- Client bisa pilih metode yang sesuai (cookie atau header)

## 📊 Perbandingan

| Metode | Keamanan | Kemudahan | Use Case |
|--------|----------|-----------|----------|
| **Cookie** | ✅ Sangat aman (HTTP-only) | ✅ Otomatis | Browser-based apps |
| **Header** | ✅ Aman | ⚠️ Manual set | Mobile apps, API clients |

## ⚙️ Environment Variables

Tidak ada konfigurasi tambahan yang diperlukan. Cookie settings otomatis:
- **Development**: `secure: false` (HTTP OK)
- **Production**: `secure: true` (HTTPS only)

## 🧪 Testing

### Test dengan cURL

**Login (dengan cookie):**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

**Gunakan cookie untuk authenticated request:**
```bash
curl -X GET http://localhost:3001/api/quizzes \
  -b cookies.txt
```

**Logout:**
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

## 🎯 Best Practices

1. **Browser Apps**: Gunakan cookie (set `credentials: 'include'`)
2. **Mobile Apps**: Gunakan Authorization header (lebih fleksibel)
3. **API Clients**: Gunakan Authorization header
4. **Always**: Set `credentials: 'include'` untuk cookie-based auth

## 📝 Notes

- Token tetap dikirim di response body untuk kompatibilitas
- Client bisa memilih: menggunakan cookie atau menyimpan token di localStorage
- Middleware otomatis check kedua metode (cookie & header)

