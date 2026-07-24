FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

COPY apps/api apps/api

EXPOSE 3000

CMD ["npm", "run", "dev:api"]
