<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Changelog — MANDATORY

You MUST update `CHANGELOG.md` for EVERY user-facing change. This is not optional.
- Add entries under the Current version
- Use Added / Changed / Fixed / Security sections
- Be specific: include file paths, component names, route URLs

## Pipeline Generator Changelog

Update `docs/pipelines/changelog.md` with each pipeline generator change:
- Assign next logical version (SemVer: major.minor.patch)
- List Added / Changed / Fixed / Security sections
- Mark the new version as `(Current)` and remove `(Current)` from the old one
