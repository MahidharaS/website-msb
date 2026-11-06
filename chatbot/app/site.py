"""One server, one URL: the API under /api and the website for every other path.

Used by the root Dockerfile on Render. The website's Bun server runs inside the same container
on an internal port (SITE_UPSTREAM); this app forwards page requests to it, so visitors and the
chat use a single address (e.g. https://mahidhara.onrender.com).
"""
from __future__ import annotations

import os

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask

from .main import app as api, lifespan

UPSTREAM = os.getenv("SITE_UPSTREAM", "http://127.0.0.1:3000")
HOP = {"connection", "keep-alive", "transfer-encoding", "te", "trailer", "upgrade", "host", "content-length"}

site = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
site.mount("/api", api)
client = httpx.AsyncClient(base_url=UPSTREAM, timeout=60)


@site.api_route("/{path:path}", methods=["GET", "HEAD", "POST", "OPTIONS"], include_in_schema=False)
async def website(path: str, request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP}
    headers["x-forwarded-host"] = request.headers.get("host", "")
    req = client.build_request(
        request.method, "/" + path, params=request.query_params, headers=headers, content=await request.body()
    )
    upstream = await client.send(req, stream=True)
    out_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in HOP}
    return StreamingResponse(
        upstream.aiter_raw(), status_code=upstream.status_code, headers=out_headers, background=BackgroundTask(upstream.aclose)
    )
