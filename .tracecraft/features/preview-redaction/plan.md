# Bug-fix plan

TASK-001: preserve the two observed failures in test/verify.test.mjs; extract the existing runner redactor and use it in preview; add focused literal/limit tests. Proposed check: node --test test/redaction.test.mjs test/runner.test.mjs test/verify.test.mjs, followed by the full suite.

TEST-001 maps AC-001 to both overlap orders and preview/receipt equality, AC-002 to nonrecursive marker replacement. TEST-002 maps AC-003 to metacharacter and invalid-input assertions plus existing bounded/chunked output tests. No raw credentials are used.
