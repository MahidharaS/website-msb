# Website image: Bun only (no Node, no npm). Used by `docker compose up` and by Render.
# Dependency install scripts do not run (Bun only runs them for packages listed in
# "trustedDependencies", and this project lists none). bunfig.toml also refuses package
# versions published less than 24h ago.
FROM oven/bun:1.3.1 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_CHAT_API_URL=""
ARG VITE_RESUME_URL=""
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL VITE_RESUME_URL=$VITE_RESUME_URL NITRO_PRESET=bun
RUN bunx --bun vite build

FROM oven/bun:1.3.1-slim
WORKDIR /app
COPY --from=build --chown=bun:bun /app/.output ./.output
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
USER bun
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
