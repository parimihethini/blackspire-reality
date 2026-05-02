FROM python:3.12-slim

WORKDIR /app

# System libraries required by psycopg2 and image processing (tesseract, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-warm AI models so the first request is instant
RUN python -c "from app.ai.price_predictor import get_model; get_model()" 2>/dev/null || true
RUN python -c "from app.ai.fraud_detection import _get; _get()" 2>/dev/null || true

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
