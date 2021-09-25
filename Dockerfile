FROM node:16-alpine as builder
ENV NODE_ENV build
USER node
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-ts

FROM node:16-alpine
ENV NODE_ENV production
USER node
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist/ ./dist
RUN npm ci

EXPOSE 3000

CMD ["node", "dist/app.js"]