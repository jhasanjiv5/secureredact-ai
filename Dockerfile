FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV OLLAMA_HOST=http://ollama:11434

EXPOSE 3000

CMD ["npm", "run", "dev"]