# Trezor implementation tasks

> Source: [`TREZOR_PRD.md`](./TREZOR_PRD.md)
>
> Started: 2026-07-30
>
> Status legend: `[x]` complete, `[-]` in progress, `[ ]` pending, `[!]`
> blocked

This is the dependency-ordered implementation checklist for Trezor support.
No task may make Trezor user-visible until every prerequisite in its gate has
passed. Ledger behavior remains the regression baseline throughout.

## Dependency graph

```text
Phase 0 SDK/legal/transport gate
  ├─> Phase 1 shared hardware UI
  └─> Phase 2 account model, setup, storage, and onboarding
        └─> Phase 3 exact-payload signing
              └─> Phase 4 WalletConnect, Safe, and Privacy Pools
                    └─> Phase 5 release validation
```

## Phase 0 — SDK, license, manifest, and transport proof

- [x] **TRZ-001 — Reverify stable package versions.**
  `@trezor/connect-web` and `@trezor/connect-webextension` `9.7.3` remain the
  latest stable browser releases as of 2026-08-01. Prerelease v10 builds through
  `10.0.0-beta.1` are explicitly excluded. The optional typed-data helper is
  `@trezor/connect-plugin-ethereum` `9.1.5` and is not needed by the current
  adapter.
- [x] **TRZ-002 — Record direct package provenance.**
  The selected `@trezor/connect-web@9.7.3` registry integrity is
  `sha512-oTI/v9sUJMvLZgLa0seSGyPaumXydRYeAT4OVTQxIaEiL1hOA0yH+UvEfT4WKwxbxOtOqWosD8chP3uuWSArcg==`.
  It declares exact direct dependencies on `@trezor/connect@9.7.3`,
  `@trezor/connect-common@0.5.1`, `@trezor/utils@9.5.0`, and
  `@trezor/websocket-client@1.3.0`.
- [x] **TRZ-003 — Obtain redistribution/license clearance.**
  The repository owner explicitly cleared use of the official package for this
  implementation on 2026-07-30. The package remains identified under its
  published Trezor Reference Source License in the packaged third-party notice;
  release owners remain responsible for retaining the applicable clearance.
- [x] **TRZ-004 — Prove MV3 CSP compatibility.**
  WalletChan consumes the official `@trezor/connect-web` `lib` entry in the
  offscreen target, not the published webextension service-worker bundle that
  contains webpack's `new Function` fallback. The existing Ledger
  `reflect-metadata` dependency is resolved to its official `lite` entry for
  the same reason. `vite.config.offscreen.ts` now fails the build if reviewed
  dynamic-code markers enter `offscreen.js`; the production artifact passes.
- [x] **TRZ-005 — Complete transitive package review.**
  Freeze the full production dependency graph; record licenses, install
  scripts, native modules, shipped files, network endpoints, telemetry hooks,
  and byte contribution. Reject prerelease or range-resolved production
  dependencies.
  [`TREZOR_DEPENDENCY_REVIEW.md`](./TREZOR_DEPENDENCY_REVIEW.md) freezes the
  277-package unique production closure, license census, eight install-script
  packages, native-module candidates, shipped direct-package files, functional
  origins, analytics boundary, CSP entrypoint decision, and upgrade triggers.
  No prerelease exists in the closure; native candidates and the Trezor
  analytics reporting endpoint are absent from the browser artifact.
- [x] **TRZ-006 — Prove the least-privilege manifest path.**
  The reviewed 9.7.3 content-script protocol is packaged locally on only
  `https://connect.trezor.io/9/*`; the Chrome manifest adds no `scripting`
  permission. The local USB-permission wrapper accepts messages only from the
  exact Trezor origin and iframe window. The official page and local permission
  page both fail the exact service-worker sender test. The Firefox manifest and
  build contain neither Trezor content scripts nor an offscreen target.
- [-] **TRZ-007 — Build an isolated packaged-extension proof.**
  Against the pinned emulator commit, prove init, one connection window,
  public device metadata, bundled address discovery, legacy transaction
  signing, EIP-1559 signing, personal-message signing, typed-data signing,
  cancellation, ten-minute operation deadline, and restart-fail-closed
  behavior.
  Partial packaged evidence now passes on macOS with a Trezor One (`T1B1`)
  emulator running firmware `1.14.2`: the visible official popup discovers the
  locally patched test Bridge, public identity/model and a five-address page
  return, and one EIP-1559 approval passes exact serialization and recovered-
  signer verification. The official UI requested one Export approval per
  address. Legacy transaction, message, EIP-712, cancellation, deadline,
  restart, passphrase, and integrated-workflow scenarios remain pending; no
  physical-device claim is made.
- [x] **TRZ-008 — Record the Phase 0 decision.**
  The approved entrypoint, endpoints, privacy behavior, permissions, CSP
  evidence, transitive closure, and rejected alternatives are recorded in
  `SECURITY.md` and `TREZOR_DEPENDENCY_REVIEW.md`. The accepted runtime is the
  explicit official popup mode; auto/hidden-iframe and Suite Desktop targets
  are not selected. Remaining release blockers are tracked by TRZ-007/TRZ-502
  and TRZ-505.

Primary references:

- <https://www.npmjs.com/package/@trezor/connect-web>
- <https://www.npmjs.com/package/@trezor/connect-webextension>
- <https://connect.trezor.io/9/guides/webextension-implementation-tutorial/>
- <https://github.com/trezor/trezor-suite/tree/29fbfcb4a2f0e6b52c4eff8b6d133ee056905535/packages/connect-web>
- <https://github.com/trezor/trezor-suite/tree/29fbfcb4a2f0e6b52c4eff8b6d133ee056905535/packages/connect-webextension>

## Phase 1 — shared hardware UI

- [x] **TRZ-101 — Extract provider-configured presentation primitives.**
  Shared local-logo, avatar, device-panel, derivation-picker,
  hardware-wait-status, and full-tab setup-shell components now live in
  `components/HardwareWallet/`. Ledger adapters preserve existing public
  imports, copy, layouts, and status treatment.
- [x] **TRZ-102 — Extract the shared add-hardware-account controller.**
  Move address paging, selection, duplicate state, loading, error, retry,
  sticky actions, and accessibility from `AddLedgerFlow` behind a
  provider-operation adapter. Keep WebHID and Ledger messages in the Ledger
  adapter.
- [x] **TRZ-103 — Extract the shared onboarding wrapper.**
  Make the existing deferred public-selection flow provider-configured without
  changing credential-first commit or rollback ordering.
- [x] **TRZ-104 — Add Trezor provider configuration.**
  Only after TRZ-003, add approved local assets, Trezor-specific copy,
  Standard default path, Account-based and Legacy alternatives, and
  “Sign the request with your Trezor” wait copy.
- [x] **TRZ-105 — Add Chromium-only entry and route behavior.**
  Place Trezor beside Ledger in onboarding and Add account; popup/sidepanel
  launch `index.html?route=add-trezor`; preserve route-through-unlock priority
  and shared side-panel close behavior. Firefox exposes no actionable tile.
- [x] **TRZ-106 — Characterize Ledger regression behavior.**
  Cover public exports, exact Ledger instructions, path order, five-address
  paging, duplicate selection, onboarding deferral, wait-state control locks,
  popup/sidepanel routing, and both themes.

## Phase 2 — account setup, storage, and lifecycle

- [x] **TRZ-201 — Add an exhaustive hardware capability policy.**
  Classify every current Ledger branch as shared, Ledger-only, Trezor-only, or
  unsupported. Replace scattered permissive checks before adding `trezor` to
  the account union.
- [x] **TRZ-202 — Add public account and device codecs.**
  Introduce `TrezorAccount`, bounded `TrezorDevice`, exact path/index/address
  validation, and a `trezorDevices` repository. Read `_docs/STORAGE.md` and
  `_docs/PUBLISHING.md`; add an idempotent migration only if older installs
  require one.
- [x] **TRZ-203 — Implement the background-owned SDK operation manager.**
  One active opaque operation, bounded init, short discovery deadline,
  ten-minute hard signing deadline, matching cancel, listener cleanup, bounded
  status/error projection, and restart-safe unknown-result handling.
  The authenticated offscreen operation manager, shared hardware-document
  lifetime accounting, exact allowlist, opaque retry IDs, matching
  cancellation, setup-unmount cancellation, and deadlines are implemented.
- [x] **TRZ-204 — Implement connect and address scanning.**
  Validate the three fixed path templates in trusted UI and background; scan
  five at a time; derive device identity from
  `m/44'/60'/0'/0/0`; return bounded public rows only; release the device
  session after the final call.
  The SDK adapter and background-callable bridge implement these exact
  derivation, binding, paging, bounded feature metadata, response, and
  session-release rules. The SDK bundle API does not collapse user consent:
  the current five-address page may require five official Export approvals.
- [x] **TRZ-205 — Add trusted setup routes.**
  Add `trezorConnect`, `trezorScan`, `trezorCancel`,
  `addTrezorAccounts`, and `getTrezorDevices` to one focused router and the
  exhaustive wallet-UI audience policy. Add top-level exact-sender rejection
  tests for pages, content scripts, web-accessible pages, subframes, foreign
  extension IDs, lookalikes, and the official Trezor origin.
- [x] **TRZ-206 — Implement atomic import and onboarding commit.**
  Require current master epoch; serialize with wallet-secret and account locks;
  collision-check signing accounts; commit accounts/device metadata together;
  make active-account preference best-effort; defer fresh-wallet persistence
  to the onboarding initialization marker and rollback.
- [x] **TRZ-207 — Complete account lifecycle support.**
  Identity, switching, rename, explorer/copy, custom-chain eligibility,
  remove-one/remove-final-device, dapp revocation, tab selection cleanup, and
  reset deletion.

## Phase 3 — exact-payload signing

- [x] **TRZ-301 — Implement adapter response/error schemas.**
  Bound every public field and normalize only the stable PRD error categories.
  Do not expose upstream strings, addresses, paths, payloads, signatures,
  identifiers, PIN/passphrase data, or external-window data in logs.
  Transaction/message/typed-data inputs and SDK outputs are bounded, upstream
  errors are normalized, and focused tests cover stable categories, local
  recovery, malformed output, and final-effect integration.
- [x] **TRZ-302 — Sign legacy and EIP-1559 transactions.**
  Rebuild the exact reviewed transaction, validate canonical quantity `v`
  (including typed-transaction `0x0`/`0x1`), normalize the signature words,
  serialize, recover the signer, rerun final
  account/device/path/origin/topic/reset/nonce gates, remove the pending request
  only in `beforeBroadcast`, and broadcast the exact recovered bytes. Reject
  EIP-2930-only and all unsupported transaction types before device interaction.
- [x] **TRZ-303 — Sign personal messages.**
  Pass exact validated bytes in hex mode, compare any SDK-returned address,
  independently recover the signature, and terminalize only after final
  release authorization.
- [x] **TRZ-304 — Sign EIP-712 v3/v4.**
  Keep WalletChan's bounded validator authoritative; compute the local digest;
  capability-gate model/firmware/schema/size/arrays; supply exact local
  domain/message hashes only where required; recover the returned signature
  against the reviewed digest; expose hash-only limitations in review.
- [x] **TRZ-305 — Integrate auth and durable request lifecycle.**
  Master or agent may sign; add/remove remains master-only. Rejection,
  disconnect, timeout, external-window close, surface close, and worker restart
  leave the request pending with no premature Activity row.
- [x] **TRZ-306 — Preserve replacement behavior.**
  Speed Up/Cancel pin the original nonce, enforce replacement floors, and pass
  through the same exact-byte transaction signer.

## Phase 4 — integrated workflows and exclusions

- [x] **TRZ-401 — WalletConnect.**
  Advertise only transaction, personal-sign, and supported typed-data methods;
  retain durable topic/result routing and replay handling.
- [x] **TRZ-402 — Safe owner approval.**
  Reuse exact SafeTx EIP-712 construction, live owner/quorum/config checks,
  proposal claim, recovered-owner proof, and durable publication.
- [x] **TRZ-403 — Safe native-gas execution.**
  Reuse exact outer transaction simulation and signer recovery. Fail before
  quote/signing for token-gas execution.
- [x] **TRZ-404 — Privacy Pools single-transaction paths.**
  Revalidate encrypted intent immediately before hardware signing; begin the
  privacy lifecycle only at final pre-broadcast; limit public exit to one
  commitment.
- [x] **TRZ-405 — Fail closed for every exclusion.**
  ERC-5792/cross-dapp batches, EIP-7702, ERC-7715, token-funded fees, force
  inclusion, sponsored transfers, direct in-extension swap/bridge, multi-exit,
  and approval-cleanup mutation must be hidden where applicable and rejected
  independently in background policy.

## Phase 5 — validation and release

- [x] **TRZ-501 — Unit and architecture coverage.**
  Adapter schemas/errors, path pages, collision/storage/reset/removal, audience,
  exact signer/digest, lifecycle/replacement, WalletConnect, Safe, Privacy
  Pools, shared UI, Ledger regressions, and production-bundle exclusions.
  The final focused Trezor/shared-hardware/Ledger suite has 81 passing tests.
  The full extension UI suite has 397 passing tests and the full security suite
  has 2,150 passing tests. Extension, UI, and QA typechecks plus zero-warning
  lint all pass.
- [-] **TRZ-502 — Deterministic emulator matrix.**
  Run every setup, PIN/passphrase, transaction, message, EIP-712, concurrency,
  lifecycle, WalletConnect, Safe, Privacy Pools, and account-lifecycle scenario
  from the PRD through production adapter boundaries. Connect, five-address
  export, and one EIP-1559 transaction are complete on Trezor One; the rest of
  the matrix remains pending.
- [-] **TRZ-503 — Production artifact inspection.**
  Run `pnpm build:extension`, UI/security tests, and store packaging; inspect
  Chrome and Firefox manifests and bundles; prove no emulator hooks,
  prereleases, dynamic code, remote extension code, unnecessary permissions,
  or Trezor integration in Firefox.
  Chrome and Firefox production builds and the earlier store packaging pass.
  Chrome
  contains only the exact helper assets and authenticated offscreen SDK;
  Firefox strips the full Chrome-only Trezor subtree and contains no Trezor
  setup asset, transport URL, manifest entry, or hardware offscreen target.
  Same-version ZIPs are deleted before creation so stale build entries cannot
  survive. The following archives predate the popup-mode and transaction-`v`
  fixes and are retained only as historical evidence; fresh archives and hashes
  must be generated before release:

  - Chrome CWS:
    `walletchan-v4.0.0.zip`, 28,339,195 bytes,
    SHA-256 `ca25098a4dbca4d1f0e2a6ab25c5b1af84f24f3768af40c397c23abf940eba8a`.
  - Firefox:
    `walletchan-firefox-v4.0.0.zip`, 27,725,133 bytes,
    SHA-256 `f987bc1823971f11b8787a9aa616af3901f526bcf61644686ec8c4a9c9bb0ba8`.
- [x] **TRZ-504 — Documentation and disclosures.**
  Update `IMPLEMENTATION.md`, `SECURITY.md`, `STORAGE.md`, account-type
  references, manifest/privacy/store disclosures, support copy, and the five
  signing-wallet test matrix.
- [!] **TRZ-505 — Physical-device release gate.**
  Record Model One and a current touchscreen device; current Chrome on macOS
  and a second desktop OS; standard/hidden passphrase wallets; transaction,
  message, EIP-712, Safe owner/executor, and Privacy Pools through the selected
  official popup with supported Bridge/WebUSB transport. Release remains
  blocked without this evidence.
