# Patches — QuickBasicEmulator_Web

Deze map bevat **wijzigingen op de vendored QBJS-source** (`vendor/qbjs/`).

## Beleid

- **Per default geen modificaties** aan `vendor/qbjs/`. Onze functionaliteit leeft in `src/`.
- Als een patch onvermijdelijk is (bv. omdat een hook-punt niet bestaat in upstream):
  1. Voeg een `.patch`-bestand toe in deze map, gegenereerd met `git diff`
  2. Documenteer hieronder: intent, upstream-link, verwacht onderhoud bij upstream-update
  3. Apply-instructie: `git apply patches/<naam>.patch` na vendoring-update

## Patch-register

### v0.0.3-Davidoff

Geen patches. Onze GW-BASIC dialect-mode is **pre-flight buiten de QBJS-engine** geïmplementeerd in `src/dialects/gwbasic-mode.ts` — geen wijziging aan vendored code nodig.

### Toekomstig

| Voorzien | Wanneer | Reden |
|---|---|---|
| QBJS IDE → embed in iframe | v0.0.4-Whitten | Vermijdt "nieuwe tab"-friction; vereist eventueel CSS-fix in QBJS |
| QBJS URL share → Decompiler-input | v0.0.4+ | Round-trip integratie met `_Decompiler` |
| QBJS sample-loader → onze Core test-corpus | v0.0.5+ | Demo-discovery vergroten |

## Upstream-tracking

Huidige import (zie `../NOTICE.md`):
- commit `e3ca41c62975ccc8734dd9c640cf7e9c081df2b8`
- datum 2026-05-30
- Bij upstream-update: rerun rsync + valideer dat tests groen blijven
