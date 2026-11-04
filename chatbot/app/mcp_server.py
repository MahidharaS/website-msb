"""Portfolio knowledge MCP server (read-only), mounted at /mcp on the API.

Any MCP client can connect to https://<your-api>/mcp/ (streamable HTTP), for example ChatGPT
connectors or Claude, and use the same tools the website chatbot uses. It exposes reads only:
nothing can write to or delete from your Drive through it.
"""
from mcp.server.fastmcp import FastMCP

from .tools import TOOLS

mcp = FastMCP("mahidhara-portfolio", stateless_http=True, json_response=True)
for fn in TOOLS:
    mcp.tool()(fn)
