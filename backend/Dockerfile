# Clawd Domain Marketplace Backend
# Python FastAPI server for domain registration and DNS management

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Create non-root user for security
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8402

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8402/health')" || exit 1

# Run with uvicorn
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8402"]
