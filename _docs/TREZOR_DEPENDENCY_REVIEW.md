# Trezor Connect dependency review

> Reviewed: 2026-07-30; runtime decision and artifacts reverified 2026-08-01
>
> Production root: `@trezor/connect-web@9.7.3`
>
> Lock authority: `pnpm-lock.yaml`

This is the Phase 0 package, license, privacy, and artifact review required by
[`TREZOR_PRD.md`](./TREZOR_PRD.md). The repository owner approved use of the
official package on 2026-07-30. That approval does not remove the release
owner's responsibility to comply with the published licenses and store
disclosures.

## Provenance and entrypoint decision

- Direct package: `@trezor/connect-web@9.7.3`, exact-pinned in
  `apps/extension/package.json`.
- Registry integrity:
  `sha512-oTI/v9sUJMvLZgLa0seSGyPaumXydRYeAT4OVTQxIaEiL1hOA0yH+UvEfT4WKwxbxOtOqWosD8chP3uuWSArcg==`.
- Upstream package commit:
  `29fbfcb4a2f0e6b52c4eff8b6d133ee056905535`.
- Selected entrypoint: the package's official `lib` export, imported only by
  `src/offscreen/trezorConnect.ts`.
- Rejected entrypoint: the published webextension service-worker bundle,
  because its webpack runtime contains a dynamic-function fallback that is not
  acceptable under WalletChan's MV3 CSP.
- Rejected alternatives: prerelease v10 builds through `10.0.0-beta.1`, runtime
  CDN loading, copied protocol implementations, and the optional
  `@trezor/connect-plugin-ethereum` helper. WalletChan already computes and
  verifies the exact EIP-712 digest locally.

The installed direct package contains 38 files and occupies 196 KiB. The
Chromium production bundle contribution is measured at the final
`static/js/offscreen.js` artifact because the CommonJS package graph is
tree-shaken and minified there. After the popup-mode and typed-transaction `v`
validation fixes, the final offscreen artifact is 2,535,234
bytes. The syntax-only compacted Chrome background is 3,940,571 bytes against
the fixed 4 MiB budget; compaction uses `compress: false` and `mangle: false`.
Store ZIP sizes and hashes recorded before those fixes are historical only;
fresh store archives remain a release-evidence task in `TREZOR_TASKS.md`.

## Frozen production closure

`pnpm --filter @walletchan/extension list --prod --depth Infinity --json`
reports 277 unique name/version pairs reachable from the selected package.
Every pair is frozen by the repository lockfile; none has a prerelease version.
The direct package resolves exactly:

- `@trezor/connect@9.7.3`
- `@trezor/connect-common@0.5.1`
- `@trezor/utils@9.5.0`
- `@trezor/websocket-client@1.3.0`

The closure is intentionally broad because the official Connect package
publishes multi-chain and multi-transport support from one root. The exact
machine-readable package/version graph is the `@trezor/connect-web@9.7.3`
snapshot in `pnpm-lock.yaml`; release review must diff that closure whenever
the root package or lockfile changes.

License census across the 277 unique pairs:

| Published package license field | Count |
| --- | ---: |
| MIT | 210 |
| BSD-3-Clause | 14 |
| Apache-2.0 | 13 |
| Trezor repository `LICENSE.md` reference | 12 |
| Trezor package `LICENSE.md` reference | 9 |
| ISC | 10 |
| MPL-2.0 | 3 |
| 0BSD | 1 |
| AGPL-3.0-or-later | 1 |
| BSD-2-Clause | 1 |
| CC0-1.0 | 1 |
| MIT AND BSD-3-Clause | 1 |
| Unlicense | 1 |

No package has an undeclared license field. The AGPL entry is
`ua-parser-js@2.0.10`, reachable through `@trezor/env-utils`. The Trezor
packages identify their published repository or package `LICENSE.md`; the
direct Connect package is covered by the Trezor Reference Source License.
`apps/extension/THIRD_PARTY_NOTICES.md` records the direct package and the
packaged build retains that notice.

## Install scripts and native modules

The production closure contains these install-time scripts:

| Package | Script |
| --- | --- |
| `bufferutil@4.1.0` | `install: node-gyp-build` |
| `utf-8-validate@5.0.10` | `install: node-gyp-build` |
| `usb@2.18.0` | `install: node-gyp-build` |
| `blake-hash@2.0.0` | `install: node-gyp-build \|\| exit 0` |
| `tiny-secp256k1@1.1.7` | native build with documented pure-JS fallback |
| `protobufjs@7.5.5` | package postinstall |
| `protobufjs@7.4.0` | package postinstall |
| `@stellar/stellar-sdk@14.2.0` | `yarn setup \|\| true` postinstall |

The native candidates are present because the official root supports Node,
WebSocket, UTXO, and native-USB environments. None appears in WalletChan's
browser offscreen output as a native binary or Node addon. Production artifact
inspection rejects emulator hooks, dynamic-code markers, and remote extension
code.

## Network and telemetry review

WalletChan initializes the selected package with `coreMode: "popup"`. Its active
connection surface is:

- `https://connect.trezor.io/9/` for the visible official popup, local
  Bridge/WebUSB discovery, and WebUSB permission experience.

The broad upstream package still contains
`ws://127.0.0.1:21335/connect-ws` code for its Suite Desktop target, but
WalletChan does not select `coreMode: "auto"` or `"suite-desktop"`; the current
adapter therefore never switches to that target. Keeping or newly reaching a
different mode or origin reopens this review.

The dependency closure contains `@trezor/analytics`, whose generic source can
send to `https://data.trezor.io`. The selected Connect path only attaches
analytics metadata to official popup UI messages; WalletChan does not
initialize, enable, or call that analytics client. The final offscreen build
does not contain `https://data.trezor.io/connect/log`, and the Vite artifact
guard fails if that endpoint enters the bundle. WalletChan records no Trezor
behavioral telemetry. The official Trezor UI remains a disclosed third-party
functional communication boundary initiated only by Connect or Sign.

## Manifest, CSP, and browser conclusion

- Chromium packages the reviewed relay only on
  `https://connect.trezor.io/9/*`, with `all_frames: false`.
- No `scripting` permission or `externally_connectable` surface is added.
- The extension CSP permits only the exact `https://connect.trezor.io` frame
  origin in addition to existing packaged scripts/workers.
- The locally packaged WebUSB permission wrapper requires the exact Trezor
  origin and iframe window and never uses wildcard `postMessage`.
- Only the exact extension service-worker sender may invoke the hardware
  offscreen target.
- Firefox aliases authority-bearing Trezor background modules to a
  fail-closed stub, omits the offscreen build, removes the Trezor setup assets
  and relay, and scans every final JavaScript file for Trezor transport
  markers.

## Decision

The exact official package, `lib` entrypoint, and explicit popup mode are
accepted for the Chromium-only implementation. Package upgrade, lockfile
closure drift, permission broadening, mode drift, a telemetry endpoint entering
the bundle, dynamic code, or a new remote origin reopens this review. The
partial packaged Trezor One smoke is recorded in `TREZOR_PRD.md` and
`TREZOR_TASKS.md`; the remaining emulator and physical-device results are
separate release gates and are not implied by this dependency decision.
