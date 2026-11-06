# One container, one URL: website (Bun) + Ask Mahi API (Python) behind a single port.
# Render runs this; visitors use https://<service>.onrender.com, the API lives at /api.

# ---- build the website (Bun only, no npm) ----
FROM oven/bun:1.3.1 AS web
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
ENV VITE_CHAT_API_URL=/api NITRO_PRESET=bun
ARG VITE_RESUME_URL=""
ENV VITE_RESUME_URL=$VITE_RESUME_URL
RUN bunx --bun vite build

# ---- runtime: Python API in front, Bun website behind it ----
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
COPY --from=oven/bun:1.3.1 /usr/local/bin/bun /usr/local/bin/bun
RUN useradd -m -u 1000 app
WORKDIR /home/app
COPY chatbot/requirements.txt chatbot/requirements.txt
RUN pip install -r chatbot/requirements.txt
COPY --chown=app:app chatbot chatbot
COPY --from=web --chown=app:app /app/.output web
USER app
ENV SITE_UPSTREAM=http://127.0.0.1:3000 NODE_ENV=production
EXPOSE 10000
CMD ["sh", "-c", "PORT=3000 HOST=127.0.0.1 bun web/server/index.mjs & cd chatbot && exec uvicorn app.site:site --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*'"]
