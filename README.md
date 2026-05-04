# AI Quiz - Trợ Lý Giáo Viên AI

Tạo đề thi trắc nghiệm bằng AI (Gemini API).

## Features
- 🤖 Tạo câu hỏi tự động bằng Gemini AI
- 📝 Làm bài trắc nghiệm trực tuyến
- 📊 Chấm điểm tự động
- 🔐 Đăng ký / Đăng nhập
- 📱 Responsive design

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **AI:** Google Gemini API
- **Deploy:** Railway

## Setup

### Local
```bash
# Backend
cd backend
cp .env.example .env  # điền config
npm install
node index.js

# Frontend
cd frontend
npm install
npm run dev
```

### Railway
1. Push lên GitHub
2. Kết nối Railway với repo
3. Thêm PostgreSQL service
4. Set environment variables
5. Deploy!

## Environment Variables
```
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
GEMINI_API_KEY=your-key
```
