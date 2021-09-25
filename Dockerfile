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
RUN npm ci
COPY --from=builder --chown=node:node /app/dist/ ./dist

EXPOSE 3000

CMD ["node", "dist/app.js"]