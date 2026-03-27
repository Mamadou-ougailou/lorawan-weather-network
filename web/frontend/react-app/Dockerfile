# Base image for building the app
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build for production
COPY . .
RUN npm run build

# Production image using standard Nginx
FROM nginx:alpine

# Copy the built React app to Nginx's web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (Nginx default)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
