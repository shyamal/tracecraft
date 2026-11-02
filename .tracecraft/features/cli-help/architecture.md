# CLI help design

Reuse the existing CLI dispatch boundary. A shared command list feeds dispatch validation and help output; help aliases are handled before command-specific parsing. The existing usage string remains the syntax reference. No model, configured command or project mutation is involved.

Alternative: introduce a CLI framework and per-command modules. Rejected for this small feature because it adds dependency and migration cost without needed behavior. The decision follows existing JSON conventions and the authorized implementation scope; it does not imply separate user approval of design.
