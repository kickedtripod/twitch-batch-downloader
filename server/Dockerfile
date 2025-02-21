FROM node:18-alpine

# Install required dependencies
RUN apk add --no-cache \
    python3 \
    ffmpeg \
    curl

WORKDIR /app

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Copy package files and TypeScript config first
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN npm run build

# Create downloads directory
RUN mkdir -p downloads && \
    chmod 777 downloads

# Test yt-dlp installation
RUN /usr/local/bin/yt-dlp --version

EXPOSE 3001

CMD ["npm", "start"] 