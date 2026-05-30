# Cloudflare Worker — tracked link redirects

Deploy separately when `go.growthos.link` is configured.

Flow: `GET /{tenant}/{code}` → log click event → 302 to lead page URL.

See docs/GROWTHOS_MVP_TECHNICAL_SPEC.md §4 and §7.
