# Verification observations

Same-assistant local run on 2 November 2026, Node 26.5.0/macOS, using an isolated copy of Tracecraft's real source. TEST-001 / AC-001–002: both new CLI regressions failed before repair and passed afterward. The overlap case checks both input orders and exact preview/receipt argv equality. TEST-002 / AC-003: literal regex/replacement metacharacters, preserved input arrays, limits and existing streaming/chunk-boundary tests passed.

Focused suite: 22 passed, 0 failed, 1 Windows-only skip (23 total). Full suite: 110 passed, 0 failed, 1 Windows-only skip (111 total). Both final commands also ran through verify and saved exited-zero, unchanged-input observations with complete, untruncated output. Raw receipts/config remain local, not portable checked-in attestations. Reverify on another checkout.
