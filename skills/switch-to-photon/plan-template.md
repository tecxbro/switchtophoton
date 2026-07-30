# Required migration plan

Use this format before making any migration change.

```text
Switch to Photon — Migration Plan

Repository state
- Default branch: <branch>
- Current branch: <branch>
- Starting commit: <sha>
- Working tree: <clean or describe unrelated changes>

Source integration
- Provider: <provider>
- Detected SDK/API generation: <exact package version or API family>
- Integration style: <REST, webhook, stream, WebSocket, adapter, local bridge, MCP, mixed>
- Detection confidence: <high, medium, low>
- Evidence:
  - <package/version, import, endpoint/header, webhook schema, fixture, or call site>

Capabilities currently used
- <capability with source files/call sites>

Intentionally out of scope
- <provider or Photon capabilities not used by the product>

Photon target
- Surface: <Spectrum, Photon Webhook, HTTP Proxy, Advanced iMessage Kit, iMessage Kit, Chat SDK adapter, MCP>
- Reason: <why this preserves the current architecture with the smallest diff>

Parity map
| Existing behavior | Source evidence | Photon equivalent | Expected files | Risk/confidence |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

Expected code changes
- <file or module and precise responsibility>

Dependencies and configuration
- Remove/replace: <packages and environment variable names only>
- Add: <Photon package/surface and environment variable names only>
- Manual setup: <Photon account, project, line, webhook, or credentials steps>

Data compatibility
- Persisted source-provider IDs: <fields/tables or none>
- Strategy: <boundary translation, compatibility alias, migration, or blocker>

Verification
- <existing test/typecheck/lint/build commands>
- <provider-specific fixture and parity checks>
- <old-provider removal search>
- <live smoke test if credentials are available>

Blockers or non-equivalents
- <exact issue or none>

Execution boundary
- Create/use branch `switch-to-photon` only after approval.
- Make only the changes listed above.
- Stop and request a plan update if scope must expand.
```

End by asking for explicit approval. Do not edit while waiting.
