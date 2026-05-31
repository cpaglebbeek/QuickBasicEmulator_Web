# CLAUDE.md — QuickBasicEmulator_Web

## Rol

Browser-runtime. Fase-1 = QBJS-fork (vanaf v0.0.3-Davidoff) + GW-BASIC dialect-mode.

## Sessie-startprotocol

1. Pull deze repo + QuickBasicEmulator_Core + Meta_QuickBasicEmulator
2. Lees Meta_QuickBasicEmulator/ROADMAP.md voor huidige milestone
3. `npm install && npm run dev` voor lokale ontwikkeling

## Deploy-protocol (kritieke regel)

Conform `feedback_icthorse_deploy`:

1. `npm run build` → `dist/`
2. `rsync -avz dist/ <hostinger-target>:~/domains/icthorse.nl/public_html/quickbasic-emulator/`
3. **LiteSpeed cache purge** (verplicht — anders ziet gebruiker oude versie)
4. Verifieer in browser dat versie-string in console matcht met `version.json`

## QBJS-fork-protocol (vanaf v0.0.3)

Bij QBJS-fork-import:
1. `git clone https://github.com/boxgaming/qbjs.git /tmp/qbjs-source`
2. Check QBJS LICENSE → verifieer dat AGPL-3.0 doorgifte OK is
3. Vendor `src/qbjs-fork/` (kopieer code, behoud upstream-history-link in NOTICE.md)
4. Schrijf `NOTICE.md` met attribution naar boxgaming/qbjs + commit-hash bij import
5. Geen verbatim merges van upstream zonder review

## Code-locaties

| Wat | Waar |
|---|---|
| Entry point | `src/main.ts` |
| QBJS-fork (v0.0.3+) | `src/qbjs-fork/` |
| Dialect-uitbreidingen | `src/dialects/` |
| Build-config | `vite.config.ts` |
| HTML-shell | `index.html` |

