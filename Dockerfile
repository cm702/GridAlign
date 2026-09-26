FROM python:3.12-slim

# Install Java and Maven
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        default-jdk-headless \
        maven && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first
COPY ai-service-python/requirements.txt /tmp/requirements.txt

RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy the complete GridAlign repository
COPY . .

# Compile Java during deployment
RUN mvn -f backend-java/pom.xml -DskipTests compile

# Render provides the PORT environment variable
CMD ["sh", "-c", "uvicorn app.api:app --app-dir ai-service-python --host 0.0.0.0 --port ${PORT:-10000}"]