# QuickBasicEmulator_Web

Browser-runtime voor GW-BASIC, QBasic en QuickBASIC 4.5. Deployt naar **icthorse.nl/quickbasic-emulator/** (vanaf v0.1.0-Letwin).

> ⚠️ **v0.0.1-Gates — Skeleton.** Geen QBJS-fork in deze versie. Fork-import gepland voor v0.0.3-Davidoff. Zie [ROADMAP](https://github.com/cpaglebbeek/Meta_QuickBasicEmulator/blob/main/ROADMAP.md).

## Architectuur

```
QuickBasicEmulator_Web
├── src/
│   └── main.ts          (placeholder, vervangen door QBJS-fork in v0.0.3)
├── index.html           (placeholder)
├── public/
└── consumeert ../QuickBasicEmulator_Core (path-dep, fase-1)
```

## Tech

- **Vanilla JS / TS** (consumeert Core via npm path-dep)
- **Vite** bundler
- Vanaf v0.0.3: vendored QBJS-fork in `src/qbjs-fork/` met NOTICE.md attribution

## Build + deploy

```bash
npm install
npm run build           # output → dist/
npm run dev             # localhost dev-server
```

Deploy (per `feedback_icthorse_deploy`):
```bash
rsync -avz dist/ <hostinger-target>:~/domains/icthorse.nl/public_html/quickbasic-emulator/
# + LiteSpeed cache purge
```

## Project + ecosystem

- **Meta:** [`cpaglebbeek/Meta_QuickBasicEmulator`](https://github.com/cpaglebbeek/Meta_QuickBasicEmulator)
- **Ecosystem:** Retro_Computing
- **Licentie:** AGPL-3.0
