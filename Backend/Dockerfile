# ====================================
# Backend Dockerfile
# Save as: backend/Dockerfile
# ====================================

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "run", "dev"]


# ====================================
# Frontend Dockerfile
# Save as: frontend/Dockerfile
# ====================================

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]