FROM node:20-alpine
WORKDIR /app

# Copy everything first so `npm ci`'s postinstall (`prisma generate`) can see prisma/schema.prisma.
COPY . .
RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "deploy:start"]
