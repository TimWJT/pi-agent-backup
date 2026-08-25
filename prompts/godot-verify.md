---
description: Validate Godot changes — headless import + smoke test
argument-hint: "[scene to smoke-test]"
---
Validate my Godot changes before I call them done.

1. Find the Godot binary (check `godot` in PATH; if missing, ask me where Godot 4.4 is installed).
2. Run a headless import so new/changed resources are registered:
   `godot --headless --import --path .`
3. Smoke test: load the project headlessly and report script errors:
   `godot --headless --check-only --script <main script>` OR run the scene $ARGUMENTS for a few frames and quit.
   If unsure what to run, check `project.godot` for the main scene and use that.
4. Report PASS only if both ran clean. Any script errors = FAIL with the exact error text.
5. Note: if a validation gate complains about deleted temp files, re-run once on a fresh pass — stale temp-file false positives are known noise; a clean second run is real verification.
