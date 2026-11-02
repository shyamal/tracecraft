# TASK-001 implementation

Extracted the runner's existing escaped, longest-first, one-pass algorithm into src/redaction.mjs and used it in dry-run previews. Preserved validation limits, streaming capture, suffix protection and byte-budget behavior. Doctor now includes the shared module.

Observed regressions before repair: preview returned [REDACTED]-beta for overlapping alpha/alpha-beta and [[REDACTED]] when the second literal matched the generated marker. Both failures used synthetic strings. Added CLI preview-versus-receipt assertions, plus metacharacter and input-limit tests.
