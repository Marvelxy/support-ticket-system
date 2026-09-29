FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npm run prisma:generate && npm run build
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:push && npm start"]
