FROM node:20-alpine
WORKDIR /app

# Install simple HTTP server
RUN npm install -g serve

# Copy web files
COPY . .

EXPOSE 8080

# Serve the static files
CMD ["serve", "-p", "8080", "."]
