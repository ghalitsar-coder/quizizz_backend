# Frontend Integration Guide - Common Issues

## ❌ Error: "invalid input syntax for type uuid: \"1\""

### Masalah:
Frontend mengirim `quizId` atau `userId` yang bukan format UUID.

### Penyebab:
- Frontend menggunakan ID angka (seperti `1`, `2`, `3`) atau string non-UUID
- Backend mengharapkan format UUID (seperti `"5a5f411a-e2a3-4365-b332-86a94010aa2c"`)

### ✅ Solusi di Frontend:

#### 1. Pastikan Menggunakan UUID dari API Response

Saat fetch quizzes, gunakan `id` yang berupa UUID:

```javascript
// ❌ SALAH - Jangan gunakan array index atau ID angka
const quizId = 1; // atau quizList[0]
socket.emit('create_room', { quizId, userId });

// ✅ BENAR - Gunakan UUID dari response API
const response = await fetch('/api/quizzes', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const quizzes = await response.json();
const quizId = quizzes[0].id; // UUID seperti "5a5f411a-e2a3-4365-b332-86a94010aa2c"
socket.emit('create_room', { quizId, userId });
```

#### 2. Contoh Flow yang Benar:

```javascript
// Step 1: Login untuk mendapatkan token
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
});
const { token, user } = await loginResponse.json();
const userId = user.id; // UUID dari response

// Step 2: Fetch quizzes untuk mendapatkan quiz ID
const quizzesResponse = await fetch('http://localhost:3001/api/quizzes', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const quizzes = await quizzesResponse.json();
const quizId = quizzes[0].id; // UUID dari response

// Step 3: Connect socket dan create room dengan UUID yang benar
const socket = io('http://localhost:3001');
socket.on('connect', () => {
  socket.emit('create_room', {
    quizId: quizId,  // UUID format
    userId: userId   // UUID format
  });
});

socket.on('room_created', (data) => {
  console.log('Room created:', data.roomCode);
});

socket.on('error_message', (data) => {
  console.error('Error:', data.msg);
});
```

#### 3. Validasi di Frontend (Optional)

Tambahkan validasi UUID di frontend sebelum emit:

```javascript
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Sebelum emit
if (!isValidUUID(quizId)) {
  console.error('Invalid quizId format. Must be UUID.');
  return;
}

if (!isValidUUID(userId)) {
  console.error('Invalid userId format. Must be UUID.');
  return;
}

socket.emit('create_room', { quizId, userId });
```

## 📋 Checklist Frontend Integration

### ✅ Authentication
- [ ] Login/Register berhasil mendapatkan token
- [ ] Token disimpan dan digunakan di semua API requests
- [ ] User ID (UUID) disimpan setelah login

### ✅ Quiz Management
- [ ] Fetch quizzes berhasil mendapatkan list
- [ ] Quiz ID yang digunakan adalah UUID (bukan index atau angka)
- [ ] Quiz ID diambil dari `quiz.id` bukan dari array index

### ✅ Socket.io Connection
- [ ] Socket.io client library sudah ter-install
- [ ] Koneksi ke `http://localhost:3001` berhasil
- [ ] Event `connect` ter-trigger
- [ ] Menggunakan UUID yang benar untuk `create_room`

### ✅ Error Handling
- [ ] Handle event `error_message` dari socket
- [ ] Tampilkan error message ke user
- [ ] Log error untuk debugging

## 🔍 Debug Tips

### 1. Check Quiz ID Format

```javascript
console.log('Quiz ID:', quizId);
console.log('Is UUID?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(quizId));
```

### 2. Check API Response

```javascript
const quizzes = await fetch('/api/quizzes', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

console.log('Quizzes:', quizzes);
console.log('First quiz ID:', quizzes[0]?.id);
```

### 3. Log Socket Events

```javascript
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('error_message', (data) => console.error('Error:', data));
socket.on('room_created', (data) => console.log('Success:', data));
```

## 📝 Format UUID yang Benar

UUID memiliki format:
```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Contoh:
- ✅ `5a5f411a-e2a3-4365-b332-86a94010aa2c`
- ✅ `72276501-8cb7-4f6b-9e9f-f2fef5e97923`
- ❌ `1`
- ❌ `123`
- ❌ `quiz-1`
- ❌ `"1"`

## 🛠️ Update di Backend

Backend sudah di-update untuk memberikan error message yang lebih jelas:
- Jika `quizId` bukan UUID, akan mendapat error: `"Invalid Quiz ID format. Quiz ID must be a valid UUID format. Please use a valid UUID."`
- Jika `userId` bukan UUID, akan mendapat error: `"Invalid User ID format. User ID must be a valid UUID format. Please use a valid UUID."`

