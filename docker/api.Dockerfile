FROM node:20-alpine
WORKDIR /app

# Install dependencies specifically for apps/api
COPY apps/api/package.json ./apps/api/
RUN cd apps/api && npm install --production

# Clear unnecessary cache
RUN npm cache clean --force

# Copy application source
COPY apps/api ./apps/api

# Copy environment files if necessary (managed by docker-compose)
WORKDIR /app/apps/api
EXPOSE 3000

# Start server
CMD ["node", "server-production.js"]
