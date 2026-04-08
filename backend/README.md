# Netflix Clone Backend

API backend cho Netflix Clone được xây dựng với Next.js, Prisma, và MongoDB.

## Cài đặt

```bash
npm install
```

## Cấu hình môi trường

Tạo file `.env.local` dựa trên `.env.example`:

```bash
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/netflix
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...
```

## Chạy

```bash
npm run dev
```

Backend sẽ chạy trên `http://localhost:3001`

## API Endpoints

### Movies
- `GET /api/movies` - Lấy tất cả phim
- `POST /api/movies` - Tạo phim mới
- `GET /api/movies/[id]` - Lấy chi tiết phim
- `PUT /api/movies/[id]` - Cập nhật phim
- `DELETE /api/movies/[id]` - Xóa phim

### Users
- `GET /api/users` - Lấy danh sách người dùng
- `GET /api/users/[id]` - Lấy chi tiết người dùng

### Auth
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/session` - Lấy session hiện tại
