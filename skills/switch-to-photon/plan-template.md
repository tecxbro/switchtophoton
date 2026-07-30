# Required migration plan

Use this exact structure before any repository change.

```text
Switch to Photon — Migration Plan

Repository state
- Repository root: <path>
- Default branch: <branch>
- Current branch: <branch>
- Starting commit: <sha>
- Working tree: <clean or dirty>
- Unrelated changes to preserve:
  - <file/change or none>

Source integration
- Provider: <provider>
- Detection result: <exact SDK version | known REST API generation | known webhook generation | mixed generations | unknown generation>
- Exact SDK/API generation: <specific result>
- Integration style: <REST, webhook, stream, WebSocket, adapter, local bridge, MCP, mixed>
- Detection confidence: <High, Medium, Low>
- Approved agent-readable source available: <yes with URL, or no>
- Detection evidence:
  - <lockfile/package version>
  - <import or generated client>
  - <host/base path/endpoint/header>
  - <request, response, or webhook field>
  - <test or fixture>

Current capabilities
- <only behavior proven by active code, tests, storage, or deployment configuration, with evidence>

Intentionally excluded capabilities
- <source-provider or Photon feature not used by this product>

Photon target
- Product: <chat-adapter-imessage | Spectrum | Photon Webhook | Photon HTTP Proxy | Advanced iMessage Kit | Self-hosted iMessage Kit | Photon MCP>
- Official Photon skill/source to load: <specific skill or agent-readable source>
- Reason: <why this preserves the current language, hosting model, and transport shape with the smallest safe change>

Parity map
| Existing behavior | Source evidence | Photon equivalent | Expected files | Risk/confidence |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

Expected code changes
- <every file or module expected to change and why>

Dependencies and configuration
- Packages to remove:
  - <package or none>
- Packages to add:
  - <package or none>
- Environment-variable names to remove:
  - <name or none>
- Photon environment-variable names to add:
  - <name or none>
- Manual dashboard or credential setup:
  - <step without real values>

Data compatibility
- Provider IDs currently stored:
  - <field/table/file or none>
- Old IDs that must remain readable:
  - <details or none>
- Compatibility aliases or boundary translations:
  - <details or none>
- Data migration:
  - <details or none>
- Blockers:
  - <details or none>

Verification plan
- Unit and integration tests:
  - <commands/checks>
- Typecheck, lint, build, schema, generated-client, and deployment validation:
  - <commands/checks>
- Provider-specific fixture tests:
  - <checks>
- Source-provider removal searches:
  - <imports, packages, hosts, endpoints, headers, environment variables, routes, clients, services>
- Complete diff review:
  - git diff --stat <starting-commit>...HEAD
  - git diff <starting-commit>...HEAD
- Live smoke tests:
  - <tests when credentials are available, or exact unverified item>

Blockers
- <every unsupported, uncertain, or non-equivalent capability, or none>
- <for Low confidence: exact risk that must be explicitly accepted before execution>

Execution boundary
- No migration changes have been made.
- Execution will occur only on branch switch-to-photon.
- Only the approved files and behaviors will be changed.
- Any required scope expansion will produce a revised plan.

To approve this exact migration plan, reply:

APPROVE SWITCH TO PHOTON PLAN
```

Stop after showing the plan. Do not edit while waiting. Low-confidence detection also requires explicit acceptance of the stated risk; the approval phrase alone does not silently waive it.
