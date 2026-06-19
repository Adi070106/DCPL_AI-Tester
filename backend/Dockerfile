FROM mcr.microsoft.com/playwright/python:v1.60.0-jammy

WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Run with Render's $PORT env var (default to 8000 if not set)
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
