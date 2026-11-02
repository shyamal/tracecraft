# Shared redaction

Extract createLiteralRedactor from the existing runner algorithm into src/redaction.mjs. Both preview and runner use this function, preserving longest-match-first literal escaping and one-pass replacement. Keep stream capture/suffix handling in runner unchanged.

Alternative: patch preview with another copy of the algorithm. Rejected because the existing duplication caused semantic drift. No new dependency, configuration or receipt schema is required.
