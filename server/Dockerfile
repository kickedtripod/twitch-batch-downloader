FROM node:18-slim

# Install ffmpeg and other dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg curl python3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Download yt-dlp binary and make it executable
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp && \
    ln -s /usr/local/bin/yt-dlp /usr/local/bin/youtube-dl

# Create downloads directory and set permissions
RUN mkdir -p downloads && \
    chmod 777 downloads

# Test yt-dlp installation
RUN /usr/local/bin/yt-dlp --version

EXPOSE 3001

CMD ["node", "dist/index.js"] 