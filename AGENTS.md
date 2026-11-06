<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Portfolio architecture
- Keep portfolio facts and copy in src/data/content.ts as the single source of truth so updates stay consistent across all pages.
- Public content uses TanStack file routes; shared navigation lives in PortfolioShell around the root Outlet so every page has resume and recruiter access.
- Keep visual styles and semantic colour roles in src/styles.css so the portfolio remains consistently themed.
- Contact posts to the API (/contact → email to the owner). Only show "sent" when the API returns delivered: true; otherwise fall back to the prepared mailto message.
- Portfolio motion uses lazy, hydration-gated R3F scenes with ref-based pointer/scroll input and DOM content overlays; this keeps browser rendering isolated and content accessible.
- Home: real photo hero (public/me-standing.jpg, no WebGL), then a pinned journey. On desktop the interactive Power BI style ImpactDashboard (numbers in content.ts `dashboard`) sits inside the pinned stage; it is rasterised (src/lib/dashboard-raster.ts) into 48k grains that dissolve into a twisting Rubik's data cube, an embedding graph, then a neural network that grows layer by layer (src/components/motion-scene.tsx, formations in src/lib/grain-targets.ts, scroll timeline in motion-input.ts `journeyTimeline`). Small screens show the dashboard in flow and start the journey from procedural grains. Chapter copy and anchor labels live in content.ts `journeyChapters`.
- Swarm cursors build the dashboard on first view (DOM overlay, rAF); visuals are only clipped while JS runs and are skipped under reduced motion.
- /lab is "Ask Mahi": a chat UI that streams from the chatbot/ FastAPI backend (VITE_CHAT_API_URL): NVIDIA Nemotron with tool calling over read-only portfolio tools (also served as an MCP server at /mcp/), knowledge from a link-shared Google Drive folder of JSON entries (chatbot/KNOWLEDGE_FORMAT.md; local fallback chatbot/knowledge/*.json). Chats are emailed to the owner (summary + transcript) on tab close or idle, and saved per visitor to a private Drive folder through chatbot/drive-history/Code.gs (Apps Script web app); a returning visitor who gives name/email gets private notes the model must not quote back. The UI discloses both. Offline fallback is an honest retriever over content.ts. Keep chatbot/knowledge/*.json in step with content.ts.
- Production is ONE Render service (render.yaml, root Dockerfile): chatbot/app/site.py serves the API under /api and proxies every other path to the website's Bun server in the same container, so the site is one URL and VITE_CHAT_API_URL=/api. Local dev keeps two processes (API on :7860, site via bun). Local/self-hosting docs: LOCAL.md, DEPLOY.md, docker-compose.yml and the local:* scripts. The owner does not use npm: local tooling is Bun (bunx --bun, NITRO_PRESET=bun) or Docker. None of this changes the Lovable build.
- /story is the storyline: content.ts `storyline` (seven acts, each with its own colour) drives a pinned R3F scene (src/components/story-scene.tsx) where a small figure with a lantern walks a glowing particle road past one beacon per act; the road forks into three at the end. Copy cards and the act rail are DOM (story-path.tsx). Keep chatbot/knowledge/story.json in step.
- Feel: calm glass UI. One accent (lime) on monochrome; surfaces use the glass tokens in styles.css (CALM GLASS LAYER). Motion uses --ease, wheel scrolling is eased in src/lib/smooth.ts (skipped on touch and reduced motion), below-the-fold content reveals on scroll, and pages cross-fade via view transitions. Avoid adding new accent colours.
