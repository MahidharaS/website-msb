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
- Contact currently prepares a mailto message; do not claim successful delivery or storage until Cloud is connected.
- Portfolio motion uses lazy, hydration-gated R3F scenes with ref-based pointer/scroll input and DOM content overlays; this keeps browser rendering isolated and content accessible.
