FROM node:20-bookworm-slim

# Install compilation runtimes (GCC for C/C++, OpenJDK 17 for Java, Python 3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    g++ \
    gcc \
    openjdk-17-jdk-headless \
    python3 \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
