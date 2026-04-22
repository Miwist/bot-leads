FROM node:20-alpine
RUN apk add --no-cache wget ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci && chmod -R +x node_modules/.bin
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "npm run migration:run && npm run start:prod"]
