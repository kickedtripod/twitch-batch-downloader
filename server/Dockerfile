FROM node:18-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Download yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o yt-dlp && \
    chmod +x yt-dlp

# Create downloads directory
RUN mkdir -p downloads

EXPOSE 3001

CMD ["node", "dist/index.js"] 