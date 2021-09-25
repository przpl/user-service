FROM node:16.10.0-alpine3.14 as builder
ENV NODE_ENV build
USER node
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-ts

FROM node:16.10.0-alpine3.14
ENV NODE_ENV production
USER node
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci
COPY --from=builder --chown=node:node /app/dist/ ./dist

EXPOSE 3000

# we need to pass optional '-migrate' command line argument
ENTRYPOINT ["node", "dist/app.js"]