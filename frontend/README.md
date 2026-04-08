# Netflix Clone Frontend

Frontend cho Netflix Clone được xây dựng với Next.js, React, và TailwindCSS.

## Cài đặt

```bash
npm install
```

## Cấu hình môi trường

Tạo file `.env.local` dựa trên `.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

## Chạy

```bash
npm run dev
```

Frontend sẽ chạy trên `http://localhost:3000`

## Cấu trúc thư mục

- `pages/` - Next.js pages
- `components/` - React components
- `styles/` - CSS styles
- `hooks/` - Custom React hooks
- `store/` - Redux store
- `public/` - Static files
