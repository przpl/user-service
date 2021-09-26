FROM node:16.10.0-alpine3.14 as builder
ENV NODE_ENV build
USER node
WORKDIR /home/node
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-ts
# prune needs some permissions
USER root
RUN npm prune --production

FROM node:16.10.0-alpine3.14
ENV NODE_ENV production
USER node
WORKDIR /home/node
COPY --from=builder /home/node/package*.json ./
COPY --from=builder /home/node/node_modules/ ./node_modules
COPY --from=builder --chown=node:node /home/node/dist/ ./dist

EXPOSE 3000

# we need to pass optional '-migrate' command line argument
ENTRYPOINT ["node", "dist/app.js"]