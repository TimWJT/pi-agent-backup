---
name: web-research
description: Fallback live web fetching with curl. Use only when the primary ketch skill is unavailable, fails, or Tim explicitly asks to use curl; do not select it for ordinary web research while ketch works.
---

# Web research via curl

Pi has no built-in web tool, but bash has `curl`. Use it to fetch real pages.

## How

1. **Fetch the page:**

   ```bash
   curl -sL "<url>" | head -c 20000
   ```

   `-s` = silent, `-L` = follow redirects. Truncate large pages; fetch more in
   chunks with `tail -c +20001 | head -c 20000` if needed.

2. **For HTML pages, strip the noise before reading:**

   ```bash
   curl -sL "<url>" | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' \n' | head -c 15000
   ```

3. **GitHub files / raw content:** use raw.githubusercontent.com instead of the HTML page.
4. **JSON APIs** (GitHub API, PyPI, etc.) return clean data — prefer them:

   ```bash
   curl -sL "https://api.github.com/repos/godotengine/godot/releases/latest"
   ```

5. **Search engines:** most block bots. If a plain search is needed and curl fails,
   say so honestly and hand the query back to Tim for Hermes.

## Rules

- Always cite the URL you fetched from.
- If a page fails to load or needs JavaScript, say so — never guess at its contents.
- Never fetch URLs Tim hasn't seen unless he asked for research; be transparent about what you're retrieving.
