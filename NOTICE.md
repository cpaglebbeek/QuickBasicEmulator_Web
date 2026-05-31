# NOTICE — QuickBasicEmulator_Web

## Vendored: boxgaming/qbjs

Deze repository bevat een **vendored fork** van [boxgaming/qbjs](https://github.com/boxgaming/qbjs), geïmporteerd in `vendor/qbjs/`.

| Veld | Waarde |
|---|---|
| Upstream | https://github.com/boxgaming/qbjs |
| Imported commit | `e3ca41c62975ccc8734dd9c640cf7e9c081df2b8` |
| Imported commit-date | 2026-05-30 |
| Imported commit-message | `Added support for "Exit Select" (#143)` |
| Import datum | 2026-06-01 |
| Upstream licentie | MIT (zie `vendor/qbjs/LICENSE.qbjs`) |
| Upstream copyright | Copyright (c) 2022 boxgaming |
| Doorgifte-licentie | AGPL-3.0-or-later (`LICENSE` in root) |

### License-compatibiliteit

MIT → AGPL-3.0 is een toegestane re-license-richting (MIT is permissive; AGPL ontvangt MIT-code). De originele MIT-tekst blijft behouden in `vendor/qbjs/LICENSE.qbjs` zodat upstream-copyright en MIT-warranty-disclaim eveneens behouden blijven.

### Patches & wijzigingen

Onze wijzigingen op de vendored code:
- **Geen directe modificaties** aan `vendor/qbjs/`-bestanden (behalve toevoegen `LICENSE.qbjs` als zichtbare kopie)
- Onze aanvullingen leven in `src/` (dialect-adapter, GW-BASIC dialect-mode hooks, build-wiring)
- Bij wijzigingen aan vendored code: documenteer in `patches/README.md` met patch-intent en upstream-link

### Updates uit upstream

Voor upstream-sync:
1. `git -C /tmp/qbjs-source pull` (of fresh clone)
2. `rsync -a --exclude='.git' /tmp/qbjs-source/ vendor/qbjs/`
3. Update commit-hash + datum in deze NOTICE.md
4. Run test-suite (Core path-dep) om regressies te detecteren
5. Bij eigen patches: merge handmatig

## Spec-referenties (geen verbatim code-port)

- [`microsoft/GW-BASIC`](https://github.com/microsoft/GW-BASIC) (MIT) — gebruikt als spec-referentie voor onze GW-BASIC dialect-mode patches (`src/dialects/gwbasic-mode.ts`). Geen verbatim assembly→TS port.

## Andere afhankelijkheden

Zie `Meta_QuickBasicEmulator/docs/DEPENDENCIES.md` voor het volledige register.

## Vragen / IP-issues

Issue openen op [cpaglebbeek/Meta_QuickBasicEmulator](https://github.com/cpaglebbeek/Meta_QuickBasicEmulator/issues).
