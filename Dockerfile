FROM node:20-alpine

WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Frontend build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend
COPY backend/ ./backend/

# Serve frontend from backend (clean old assets first)
RUN rm -rf backend/public && cp -r frontend/dist backend/public

WORKDIR /app/backend
EXPOSE 5000

CMD ["node", "index.js"]
