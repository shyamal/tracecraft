# Preview redaction bug

Observed real defect: with redact [alpha, alpha-beta], dry-run displayed [REDACTED]-beta but execution recorded [REDACTED]. With redact [alpha, REDACTED], preview produced [[REDACTED]]. Only synthetic strings were used. The requirement is consistent literal replacement, not automatic detection of secrets. No blocking policy question remains.
