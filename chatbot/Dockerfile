# Hugging Face Spaces (Docker SDK) — also runs anywhere Docker runs.
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/tmp/hf FASTEMBED_CACHE_PATH=/tmp/fastembed
RUN useradd -m -u 1000 app
WORKDIR /home/app/chatbot
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY --chown=app:app . .
USER app
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
