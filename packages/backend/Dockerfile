FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm ci --workspace=backend

# Copy source
COPY packages/backend ./packages/backend
COPY tsconfig.json ./

# Build
RUN npm run build --workspace=backend

EXPOSE 3001

CMD ["npm", "start", "--workspace=backend"]
