FROM node:20-alpine
RUN apk add --no-cache wget
WORKDIR /app
COPY package*.json ./
COPY .npmrc ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
# Сборка со static export (`out/`); `next start` с таким режимом не поддерживается.
CMD ["sh", "-c", "npx --yes serve@14 out -l tcp://0.0.0.0:${WEB_PORT:-${PORT:-3000}}"]
