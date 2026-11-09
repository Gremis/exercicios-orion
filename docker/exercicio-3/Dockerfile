FROM node:24-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM dependencies AS dev

COPY src/ ./src/

USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:24-alpine AS prod

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencies /app/package.json /app/package-lock.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY src/ ./src/

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
