# Trezor Hardware Wallet Support PRD

> Status: implementation complete; packaged Trezor One connect, address-export,
> and EIP-1559 signing smoke passed; full deterministic emulator and
> physical-device release matrices pending
>
> Created: 2026-07-30
>
> Product: WalletChan browser extension
>
> WalletChan baseline: `1c6f8b41627451e410c52583eec9448cf2cfe1d6`
>
> Related implementation reference: [`LEDGER.md`](./LEDGER.md)

## 1. Executive summary

WalletChan will add `trezor` as a first-class hardware-backed account type.
The user experience will reuse the existing Ledger setup, account selection,
request review, hardware-wait, and account-management flows. Trezor-specific
connection, device-session, derivation, signing, error, and test logic will
remain isolated behind a hardware-wallet adapter.

Users will be able to:

1. choose Trezor during fresh-wallet onboarding or from Settings → Add account;
2. connect a device through Trezor's official connection experience;
3. select one or more derived EVM addresses;
4. use those addresses as normal WalletChan accounts on built-in and custom EVM
   networks;
5. approve legacy and EIP-1559 transactions, personal messages, and supported
   EIP-712 requests on the device;
6. use Trezor accounts through injected dapps and WalletConnect;
7. use a Trezor address as a Safe owner and native-gas executor;
8. use the Ledger-supported, single-transaction Privacy Pools paths; and
9. retry safely after a rejection, disconnect, interrupted Trezor window, or
   service-worker restart.

WalletChan will never receive, request, or store a Trezor recovery phrase,
private key, PIN, or passphrase. PIN and passphrase interaction belongs only to
Trezor's official UI and the device.

## 2. Product decisions

These are implementation requirements, not optional design directions.

| Decision | Requirement |
| --- | --- |
| Account type | User-facing: **Trezor** or **Trezor account**. Internal account type: `trezor`. |
| UX model | Reuse the Ledger flow structure and shared components. Do not create a second copied setup or confirmation system. |
| Logic model | Ledger and Trezor use separate protocol adapters behind shared hardware-account policies and UI. |
| Initial browser scope | Chromium MV3 only, matching the current Ledger boundary. Firefox must remain fully functional but must not advertise or bundle the initial Trezor integration. |
| Setup surface | Popup and side-panel entry points open `index.html?route=add-trezor` in a full extension tab. Fresh onboarding already runs in a full tab and embeds the same shared flow. |
| Connection UI | One WalletChan **Connect Trezor** action starts the official Trezor flow. Do not add a redundant unlock, address, or permission popup before the operation that already opens Trezor's UI. |
| PIN and passphrase | Trezor's UI owns them. WalletChan must not render, proxy, inspect, store, log, or cache either value. |
| Default derivation | `m/44'/60'/0'/0/n`. The picker may also expose the existing Ledger-style and legacy EVM layouts so users can recover addresses created with those paths. |
| Device identity | Bind stored accounts to a canonical public EVM address derived under the selected Trezor wallet and revalidate the actual signer for every effect. Never persist a transport path, USB serial, PIN, passphrase, or Trezor session state. |
| Signing integrity | Locally rebuild the exact reviewed payload and recover every returned signature. A different seed, device, passphrase wallet, path, address, chain, or digest fails closed before broadcast or signature release. |
| Capability scope | Match the deliberately supported Ledger capability set. Do not infer support merely because the SDK exposes a method. |
| Dependencies | Use only official, pinned Trezor packages after manifest, CSP, dependency, privacy, and package-content review. Do not ship a prerelease SDK. |
| Test strategy | The official emulator is required for repeatable integration tests. Representative physical-device QA is still a release gate. |
| Telemetry | No WalletChan behavioral telemetry. Trezor traffic occurs only after a user-initiated connect or signing action and must be disclosed as functional third-party communication. |

## 3. User problem and outcome

A WalletChan user with a Trezor cannot currently add its addresses, connect
them to dapps, or approve WalletChan-reviewed requests without moving the
request to another application.

The desired outcome is not a separate Trezor mini-wallet. A Trezor account
should feel like the existing Ledger account type everywhere outside the device
transport:

- the same WalletChan request arrives and remains pinned to one account, chain,
  origin, and result route;
- the same transaction, message, clear-signing, simulation, gas, nonce,
  replacement, Activity, WalletConnect, Safe, and Privacy Pools surfaces are
  used;
- WalletChan clearly tells the user when attention moves to Trezor's UI or the
  device; and
- no device response can authorize a payload or account different from the one
  WalletChan displayed.

## 4. Goals and non-goals

### 4.1 Goals

- Add multiple Trezor-derived EVM accounts without importing private material.
- Reuse one shared hardware-wallet setup and signing-status UI system.
- Preserve WalletChan's account pinning, pending-request durability,
  first-action claims, clear-signing validation, session restoration, and
  reset barriers.
- Work with Trezor's official popup connection path exposed by the selected
  stable SDK, including its local Bridge/WebUSB discovery behavior.
- Treat hidden passphrase wallets as distinct signing identities.
- Make device rejection, disconnection, busy state, unsupported firmware,
  interrupted external UI, and timeouts understandable and retryable.
- Test deterministic account discovery and signing through
  `trezor-user-env`.
- Keep Ledger behavior unchanged while extracting shared hardware UI and
  policy.

### 4.2 Non-goals for the first release

- Firefox support.
- Device initialization, recovery, backup, wipe, firmware update, PIN change,
  passphrase configuration, or other device administration.
- Importing or exporting a Trezor recovery phrase.
- Raw `eth_sign`.
- ERC-5792 or cross-dapp atomic batches.
- EIP-7702 authorization or ERC-7715 delegated permissions.
- Token-funded gas or token-funded Safe execution.
- Force inclusion or sponsored transfers.
- WalletChan's direct in-extension swap or bridge shortcut.
- Removing Trezor's own permission or device-confirmation UI.
- Supporting a model or firmware combination that the selected stable SDK does
  not report as Ethereum-capable.

## 5. Capability parity

The implementation must use one exhaustive account-capability policy rather
than scattering new `account.type === "trezor"` checks. Trezor receives the
following initial policy:

| Capability | Initial support | Required behavior |
| --- | --- | --- |
| Built-in and custom EVM chains | Yes | Same chain visibility and RPC rules as Ledger. |
| Legacy transactions | Yes | Rebuild, sign, recover, and broadcast the exact reviewed transaction. |
| EIP-1559 transactions | Yes | Same gas editor, nonce, simulation, and result lifecycle as Ledger. |
| EIP-2930-only transactions | No | Reject unless a later, separately reviewed release adds support. |
| Contract deployment | Yes | Normal single-transaction path when supported by the device and firmware. |
| `personal_sign` | Yes | Sign exact bytes and recover the expected account before release. |
| EIP-712 v3/v4 requests | Yes, capability-gated | The returned signature must recover against WalletChan's exact locally computed digest. |
| Raw `eth_sign` | No | Reject before device interaction. |
| Injected dapps | Yes | Normal pinned single-transaction and supported-signature paths. |
| WalletConnect | Yes | Advertise the same reduced method set as Ledger. |
| Pending Speed Up and Cancel | Yes | Preserve the original nonce and enforce replacement fee floors before device interaction. |
| Safe owner approval | Yes | Sign the locally rebuilt, chain-bound Safe transaction digest. |
| Safe native-gas execution | Yes | Sign the exact outer execution transaction after fresh authority and simulation checks. |
| Safe token-gas execution | No | Reject before quote or signing work. |
| Privacy Pools single-transaction paths | Yes | Use the same intent revalidation and final pre-broadcast boundary as Ledger. |
| Multi-commitment public exit | No | Limit the UI and background to one commitment per device-signed transaction. |
| Direct in-extension swap or bridge | No | Explain that a dapp can submit a supported normal transaction instead. |
| ERC-5792 and cross-dapp batches | No | Do not advertise the methods and reject any attempted route. |
| EIP-7702 and ERC-7715 | No | Do not show or enter authorization, delegation, or permission flows. |
| Token-funded network fees | No | Native gas only. |
| Force inclusion | No | Hide the control and reject background attempts. |
| Sponsored transfers | No | Reject before relayer work. |
| Approval cleanup | Informational only | No atomic cleanup action. |
| Agent-password signing | Yes | Same ordinary-signing authority as Ledger; account add/remove remains master-only. |

Any later Ledger capability added before Trezor implementation is merged must
be classified explicitly as:

1. shared hardware capability;
2. Ledger-only device behavior;
3. Trezor-only device behavior; or
4. unsupported for both.

It must not be inherited accidentally through a permissive default.

## 6. UX specification

### 6.1 Shared component requirement

The current Ledger UI is the baseline, but provider-specific words and assets
must become configuration. The implementation should extract or rename the
current components into a shared hardware-wallet feature:

| Current responsibility | Shared result |
| --- | --- |
| `AddLedgerFlow` | One add-hardware-account flow driven by a Ledger or Trezor adapter. |
| `LedgerSetupScreen` | One full-tab hardware setup shell. |
| `LedgerDevicePanel` | One device panel with provider-specific instructions and status. |
| `LedgerDerivationPicker` | One picker with provider-specific default and available path templates. |
| `LedgerSigningStatus` | One hardware-wait notice with provider logo and copy. |
| `LedgerLogo` / `LedgerAvatar` | Brand registry with locally packaged, official assets. |
| `LedgerOnboardingStep` | One onboarding wrapper around the shared add flow. |

The shared UI owns layout, selection, pagination, duplicate-address state,
loading, errors, retry, sticky actions, and accessibility. The adapter owns
device operations and status translation. Ledger-specific SDK code must not
move into renderer components.

### 6.2 Add-account entry

- Add a Trezor tile immediately beside Ledger in fresh onboarding and
  Settings → Add account.
- Use an official Trezor mark stored locally. Runtime UI must not fetch a brand
  asset.
- Unsupported builds do not show the tile as an actionable option.
- Selecting the tile from a popup or side panel opens the full-tab
  `add-trezor` route. A side-panel launcher closes through the existing shared
  path after the tab opens.
- The route survives unlock and takes priority over ordinary pending-request
  auto-routing, matching Ledger.

### 6.3 Connection and account discovery

The initial screen uses the same device card and sticky action layout as
Ledger, with Trezor-specific guidance:

- “Connect and unlock your Trezor.”
- “WalletChan stores public addresses and paths only. Your keys stay on the
  device.”
- “Trezor may open its own approval window.”

Do not tell a Trezor user to open an Ethereum app.

The **Connect Trezor** action:

1. begins one background-owned Trezor SDK operation;
2. lets Trezor's UI handle application permission, device choice, PIN, and
   passphrase;
3. obtains public identity and model metadata;
4. scans five addresses from the selected derivation layout;
5. returns only bounded public account rows to the WalletChan renderer; and
6. preselects the first address not already present as a signing account.

Changing the derivation layout clears prior results and selection. **Load more**
adds five addresses at a time. Existing non-view-only addresses are shown as
already added and cannot be imported twice.

### 6.4 Derivation paths

The Trezor picker reuses the Ledger picker layout but defaults to:

| Label | Template |
| --- | --- |
| Standard | `m/44'/60'/0'/0/{index}` |
| Account-based | `m/44'/60'/{index}'/0/0` |
| Legacy | `m/44'/60'/0'/{index}` |

Path input is not accepted from untrusted dapps. Every template and generated
path is validated and bounded in the trusted UI and again in the background.

Address discovery should use the official bundled-address method when the
selected SDK supports it safely. If it does not, sequential calls may reuse one
bounded device session. The final call must release the session.

The selected 9.7.3 SDK accepts a bundle, but its official UI may still require
one **Export** approval per requested address. WalletChan currently requests a
five-row page, so a page can produce five approvals. The bundle is a response
and session-management optimization, not a promise of one user confirmation.
Any future one-address-at-a-time UX change must preserve the same bounded page,
path, identity, and duplicate-account checks.

### 6.5 Fresh-wallet onboarding

The shared Trezor flow collects public device/path/address selection before the
master password exists. It must not persist that selection immediately.

After the user creates the master password, account and device metadata commit
inside the existing onboarding initialization marker. Any failure rolls back
the partial credential and Trezor metadata together. The first successful
account becomes the best-effort active-account preference only after the
durable account/device commit.

### 6.6 Hardware-wait state

During a transaction, message, Safe, or Privacy Pools hardware operation:

- keep the original review screen mounted;
- show “Sign the request with your Trezor” in the shared sticky notice;
- use the same branded tile, trailing spinner, and three-dot **Waiting**
  primary-action treatment as Ledger;
- keep the transaction-submitting banner hidden until device signing finishes;
- lock gas, nonce, approval, queue, warning-acknowledgement, alternate action,
  reject, and other request-mutating controls;
- allow Back as navigation without implying that it cancelled the operation;
  and
- rely on the background first-action claim, not UI disabling, to prevent
  competing effects from another WalletChan surface.

If Trezor's external UI closes or the device rejects, the request remains
pending with no Activity entry and presents an explicit retry.

### 6.7 Account identity and settings

Trezor accounts use the same address, chain, copy, explorer, rename, remove,
and account-switching components as Ledger. Device details show only:

- Trezor;
- a bounded model/label returned by the SDK;
- account derivation path and index; and
- the public account address.

Removing the final account associated with one stored public device identity
also removes its `trezorDevices` entry.

## 7. Architecture

### 7.1 Account and device records

Add the following public metadata:

```ts
type TrezorAccount = {
  id: string;
  type: "trezor";
  address: string;
  deviceId: string;
  hdPath: string;
  hdIndex: number;
  displayName?: string;
  createdAt: number;
};

type TrezorDevice = {
  label: string;
  model: string;
  addedAt: number;
};
```

`trezorDevices` is a `Record<deviceId, TrezorDevice>`.

The device ID is the lowercase EVM address at
`m/44'/60'/0'/0/0`, derived inside the same selected Trezor passphrase wallet
used for account discovery. It is public correlation metadata, not proof of
authority. The actual account signature is still recovered for every effect.

Never persist Trezor Connect's transport device path, session state, instance
identifier, USB serial, PIN, passphrase, or any secret-bearing value.

### 7.2 Hardware adapter contract

The shared hardware feature requires provider adapters with equivalent
high-level operations:

- connect and return bounded public device metadata;
- scan a bounded page of public addresses;
- sign an exact unsigned transaction;
- sign exact personal-message bytes;
- sign validated EIP-712 data or its exact locally computed hashes where
  required by the device;
- cancel the active operation; and
- normalize provider errors and status events.

Ledger keeps its existing WebHID signer. Trezor uses an independent adapter
around the official browser SDK inside the authenticated hardware offscreen
document. The service worker owns every operation and is the only accepted
caller; neither renderer nor content script may invoke the SDK directly.

### 7.3 Official SDK gate

As reverified on 2026-08-01, the latest stable browser packages are
`@trezor/connect-web` and `@trezor/connect-webextension` `9.7.3`. WalletChan
uses `@trezor/connect-web@9.7.3` because its official `lib` entry bundles under
the extension CSP; the published webextension service-worker bundle is
rejected because it contains a webpack dynamic-function fallback. The selected
package includes the same upstream dependency security fix. The v10 webextension
redesign remains prerelease (`10.0.0-beta.1`) and is not used. The typed-data
helper `@trezor/connect-plugin-ethereum` `9.1.5` is permitted only if the
existing WalletChan hashing implementation cannot safely produce the
separately required domain and message hashes.

Before implementation:

1. reverify the latest stable versions and upstream release notes;
2. pin every production dependency exactly;
3. inspect the installed tarballs, transitive dependencies, licenses, bundled
   code, install scripts, dynamic code use, network endpoints, and telemetry;
4. prove compatibility with WalletChan's MV3 CSP and build;
5. prove that account discovery and all three signing methods work through the
   packaged extension and emulator; and
6. record the exact manifest delta before accepting the dependency.

Do not use a beta, alpha, canary, remote script, or runtime CDN.

The 9.7 stable integration offers automatic injection or a manually packaged
content script for its exact official connection origin. WalletChan packages
the reviewed 9.7.3 content-script protocol on
`https://connect.trezor.io/9/*`, avoiding the broad `scripting` permission. If
a later stable SDK replaces this with an `externally_connectable` flow, allow
only the exact official origin required by that SDK and add an explicit
external-message audience test. Never ship both permission models without a
demonstrated need.

### 7.4 Trusted message routing

Add trusted-wallet-UI messages equivalent to the Ledger setup routes:

- `trezorConnect`;
- `trezorScan`;
- `trezorCancel`;
- `addTrezorAccounts`; and
- `getTrezorDevices`.

They belong in the exhaustive wallet-UI audience policy and must be rejected
from webpages, content scripts, web-accessible extension pages, subframes,
foreign extension IDs, and URL lookalikes.

Provider and WalletConnect requests continue to enter through their existing
validated transaction/signature routes. They never call setup, scan, device,
or account-import messages.

### 7.5 Operation and service-worker lifecycle

- Only one Trezor SDK operation may be active at a time.
- Every operation has an opaque ID and a ten-minute hard deadline.
- Account discovery has a shorter bounded connection deadline with a clear
  retry.
- Initialize the SDK once per live hardware offscreen document, but recover
  cleanly from partial or stale initialization.
- Repeated requests must not create duplicate approval windows or retain stale
  listeners.
- Cancellation targets only the matching active operation.
- Pairing and address scans may return through a bounded trusted-UI response.
- Signing remains owned by the durable pending request and first-action claim.
- A service-worker restart must never convert an unknown SDK result into a
  broadcast or released signature. The request returns to a retryable state
  unless a later durable boundary already proves completion.

WalletChan initializes Connect with `coreMode: "popup"`. Discovery therefore
runs in the visible `connect.trezor.io` tab where Chromium can grant the exact
origin Local Network access needed for a local Bridge. Auto/iframe discovery
from the hidden offscreen document and the Suite Desktop target are not selected
by this release. The WalletChan review screen remains the source of request
intent and must not be replaced by the external window.

## 8. Signing requirements

### 8.1 Transactions

WalletChan prepares legacy and EIP-1559 transactions from the pinned request
using the same gas, nonce, simulation, replacement, chain, RPC, history, and
receipt rules as Ledger.

The Trezor adapter receives only the exact normalized unsigned fields required
by the official method. After device approval, WalletChan:

1. validates the response shape and bounds;
2. validates `v` as a canonical hexadecimal quantity (including the typed-
   transaction values `0x0` and `0x1`) and validates `r`, `s`, and the serialized
   transaction as bounded byte strings;
3. reconstructs the signed transaction;
4. recovers the signer locally;
5. compares it to the pinned Trezor account;
6. rechecks account existence, stored device/path binding, origin or
   WalletConnect authorization, reset lease, and reviewed nonce;
7. removes the pending request and starts Activity only in the final
   pre-broadcast callback; and
8. broadcasts the exact recovered serialized bytes.

A signature from a different seed, passphrase wallet, device, or derivation
path is never broadcast.

### 8.2 Personal messages

`personal_sign` passes the exact validated bytes with the SDK's hex mode.
WalletChan compares any address returned by the SDK and independently recovers
the signature from those exact bytes. The pending request is removed only
after final origin/session authorization succeeds.

### 8.3 EIP-712

The existing bounded EIP-712 validator remains authoritative. Trezor receives
only the normalized typed data that passed WalletChan review.

- Domain-chain mismatch is rejected before the device operation.
- WalletChan computes the exact digest locally before calling the device.
- If a device model requires domain and message hashes, WalletChan supplies
  locally computed hashes for the same reviewed typed data.
- The returned signature must recover to the pinned account against the exact
  expected digest.
- If the SDK/device signs a different digest, WalletChan rejects the result.
- If the model can display only hashes, the WalletChan review must state this
  limitation and expose the exact digest in Advanced details.
- Unsupported model, firmware, schema, size, or array behavior fails before
  signing rather than silently changing the payload.

### 8.4 Safe and Privacy Pools

Safe owner approval reuses the Trezor EIP-712 signer. Native-gas Safe execution
reuses the Trezor transaction signer. Existing Safe code remains authoritative
for live owner/quorum/configuration checks, proposal claims, exact-envelope
simulation, confirmation publication, execution, and receipt reconciliation.

Privacy Pools uses the same single-transaction Trezor signer after its
encrypted intent, account, amount, source, and lifecycle state are revalidated.
No privacy operation becomes active until the recovered signature reaches the
final pre-broadcast boundary.

## 9. Security and privacy requirements

1. Private keys and recovery phrases never leave the Trezor device.
2. WalletChan never receives or renders the Trezor PIN or passphrase.
3. Public account/device writes use the existing wallet-secret operation lock,
   account repository lock, and master authorization epoch.
4. Adding or removing accounts requires a live master session. Ordinary
   signing accepts master or agent sessions.
5. All setup messages require an exact trusted, top-level WalletChan UI sender.
6. The Trezor SDK operation is background-owned and executes only in the
   authenticated hardware offscreen document. Untrusted page input cannot
   select a device, path, session, or SDK method.
7. The exact reviewed account, chain, origin/topic, payload, nonce, fee policy,
   and result route remain pinned throughout device interaction.
8. Every signature is recovered locally before broadcast, persistence, Safe
   publication, or dapp release.
9. The operation log contains no addresses, paths, unsigned payloads,
   signatures, device identifiers, PINs, passphrases, or external-window data.
10. External Trezor communication occurs only after an explicit user action and
    is described in the setup privacy disclosure.
11. Only packaged extension code executes in extension contexts. Trezor's
    remote UI stays in its own origin and is never treated as trusted
    WalletChan UI.
12. Any added content script or externally connectable origin is exact,
    documented, independently audience-tested, and excluded from
    `isTrustedWalletUiSender`.
13. Dependency error text is bounded and normalized before it reaches storage
    or UI.
14. Reset deletes `trezorDevices`, Trezor accounts, related tab selections,
    permissions, and pending requests through the existing exact reset and
    account-removal paths.
15. The Chrome Web Store permission disclosure is updated if the reviewed
    manifest delta changes a permission or externally connectable surface.

## 10. Error and recovery model

The UI must normalize upstream errors into these stable categories:

| Category | User outcome |
| --- | --- |
| User rejected | “Rejected on your Trezor.” Request remains pending and retryable. |
| Permission rejected | Explain that Trezor connection permission is required and offer Retry. |
| External window closed | Explain that closing Trezor's window interrupted the request. |
| Device disconnected | Ask the user to reconnect the Trezor used by this account. |
| Device busy | Ask the user to finish or close the other active Trezor request. |
| Wrong device or passphrase wallet | Explain that the signer does not match the selected account. Never broadcast. |
| Firmware or capability unsupported | Identify the required update or unsupported operation without suggesting a payload downgrade. |
| Request too large or unsupported | Keep the request pending and explain the model-specific limitation. |
| Official connection unavailable | Explain that the Trezor popup or local Bridge/WebUSB connection is unavailable and offer Retry. |
| Timeout | Cancel local waiting, leave the request pending, and offer Retry. |
| Malformed SDK response | Fail closed with a generic user message and bounded technical code. |
| Unknown | “Something went wrong while talking to your Trezor. Try again.” |

Retry starts a new operation ID. It must not reuse a stale device response,
signature, SDK promise, passphrase state, or external window.

## 11. Emulator and test plan

### 11.1 Test environment

Use the official
[`trezor-user-env`](https://github.com/trezor/trezor-user-env) repository pinned
to a reviewed commit. The PRD was validated against
`8d3416fa8cfbbbac97266b8742741437ee1719bf`.

The environment provides:

- controller WebSocket on `localhost:9001`;
- dashboard on `localhost:9002`;
- Trezor Bridge on legacy `localhost:21325` and current status/API
  `localhost:21328`; and
- emulator display through the dashboard or VNC on `localhost:15900`.

The test setup must document the conflict with another local Bridge or a
desktop application running its bundled Bridge.

The macOS harness used for the current smoke lives outside WalletChan at
`~/blockchain/wchan/trezor-user-env`, pinned to the commit above with two local
test-infrastructure changes: Docker bind-mounts the generated node Bridge patch
across force-recreates, and the node Bridge answers Chrome's scoped Local
Network/CORS preflight for exact Trezor and localhost origins. Those changes are
not production dependencies and no emulator hook is compiled into WalletChan.

`@trezor/trezor-user-env-link` `1.0.0` may be pinned as a test-only dependency
for deterministic setup and button actions. It must not be imported into a
production entrypoint or included in the release bundle.

Automated tests may provide a test-only SDK transport configuration for the
local Bridge, but they must execute the same WalletChan adapter, payload
normalization, signer recovery, storage, pending-request, and broadcast code
used by production. Emulator-only shortcuts must be compile-time absent from
production builds.

### 11.2 Required emulator scenarios

Current partial evidence (2026-07-30, not the complete matrix):

- packaged Chrome extension connected to a Trezor One (`T1B1`) emulator running
  firmware `1.14.2` on macOS;
- the visible official popup discovered the local node Bridge after Chrome's
  Local Network permission was enabled for `connect.trezor.io`;
- public identity/model metadata and a five-address page completed, with the
  official UI requesting a separate Export approval for each address; and
- one EIP-1559 transaction completed device approval and WalletChan's exact-
  serialization/recovered-signer verification after the response validator was
  corrected to accept canonical `v = 0x0` or `v = 0x1` quantities.

This smoke does not claim legacy transaction, message, EIP-712, passphrase,
restart, cancellation, WalletConnect, Safe, Privacy Pools, or physical-device
coverage.

| Area | Scenarios |
| --- | --- |
| Setup | Start emulator and Bridge, load deterministic mnemonic, connect, read model, scan first five standard addresses, load five more, change path, import multiple accounts, reject duplicates. |
| PIN and passphrase | PIN-enabled device; empty passphrase; hidden passphrase wallet; different passphrase produces a different identity; WalletChan never receives the inputs. |
| Transactions | Legacy transfer, EIP-1559 transfer, contract call, contract deployment, edited gas, edited nonce, Speed Up, Cancel, device reject, disconnect, timeout, malformed response. |
| Personal messages | Plain UTF-8 bytes, arbitrary hex bytes, rejection, wrong-account recovery. |
| EIP-712 | Simple structure, nested structure, arrays where supported, chain mismatch, oversized/unsupported data, full-display model, hash-only model, wrong digest recovery. |
| Concurrency | Two WalletChan surfaces attempt the same request; second confirm/edit/reject loses the first-action claim; a second SDK operation receives busy state. |
| Lifecycle | Close WalletChan surface during approval, close Trezor window, service-worker restart before signature, restart after signature but before final release, browser restart with pending request. |
| WalletConnect | Session approval, transaction, personal message, EIP-712, unsupported method omission, disconnect during approval, result replay after relay recovery. |
| Safe | Owner discovery, owner approval, wrong owner/passphrase, threshold-ready native-gas execution, token-gas rejection. |
| Privacy Pools | Shield, receiver-paid Unshield, one public exit, multi-exit rejection, intent mutation during hardware wait. |
| Account lifecycle | Rename, switch, tab selection, remove one account, remove final device account, reset, fresh onboarding rollback. |

Every successful signature test independently recovers the expected address.
Transaction tests also compare the final serialized transaction fields and
hash to the reviewed fixture before any local-chain broadcast.

### 11.3 Automated WalletChan coverage

Add:

- pure adapter response and error-normalization tests;
- derivation-path and address-page tests;
- storage transaction, collision, reset, and account-removal tests;
- message audience and external-origin authorization tests;
- signature recovery and exact-digest tests;
- transaction lifecycle and replacement tests;
- WalletConnect capability and durable result tests;
- Safe owner/executor policy tests;
- Privacy Pools account-policy and lifecycle tests;
- shared hardware UI architecture tests proving Ledger and Trezor render from
  the same flow components;
- regression tests proving Ledger behavior and copy remain unchanged; and
- build tests proving emulator packages and hooks are absent from production.

### 11.4 Physical-device release gate

The emulator does not prove USB permissions, cable behavior, physical display,
button/touch confirmation, installed firmware, or browser/operating-system
interaction with a physical device.

Before release, test at minimum:

- one Model One device;
- one current touchscreen Trezor device;
- current stable Chrome on macOS and one second supported desktop operating
  system;
- standard and hidden passphrase wallets;
- transaction, personal message, EIP-712, Safe owner approval, Safe native-gas
  execution, and one Privacy Pools transaction; and
- the selected official popup flow with its supported Bridge/WebUSB transport.

Record the device model, firmware, browser, operating system, account/path,
operation, expected result, actual result, and any on-device display
limitation. No Trezor release may rely only on emulator approval.

## 12. Implementation sequence

### Phase 0 — dependency and transport proof

- Build an isolated packaged-extension proof against the pinned stable SDK.
- Confirm manifest/CSP requirements, popup/Bridge behavior, emulator
  connection, service-worker lifetime, cancellation, and all signing methods.
- Decide the exact least-privilege manifest path and document it in
  `SECURITY.md`.
- Reject the dependency choice if it requires remote code in an extension
  context, unbounded external messaging, behavioral telemetry, or an
  unreviewable permission.

### Phase 1 — shared hardware UI

- Extract shared setup, device, derivation, signing-status, branding, and
  onboarding components.
- Keep Ledger behavior byte-for-byte or behaviorally equivalent.
- Add provider-specific copy so Trezor never inherits Ledger app instructions.

### Phase 2 — account setup and storage

- Add the exhaustive `trezor` account type and capability entries.
- Add trusted setup routes, adapter, storage, reset, removal, identity, and
  account-switching support.
- Add onboarding's deferred public-selection commit.

### Phase 3 — signing

- Add legacy/EIP-1559 transaction, personal-message, and EIP-712 adapters.
- Reuse the pending-request, session, nonce, simulation, history, receipt,
  authorization, and result boundaries.
- Add exact signer and digest recovery for every path.

### Phase 4 — integrated workflows

- Add WalletConnect method policy and routing.
- Add Safe owner and native-gas executor paths.
- Add single-transaction Privacy Pools eligibility and background guards.
- Confirm every Ledger exclusion is also enforced for Trezor.

### Phase 5 — validation and release

- Complete emulator, automated, build, package, and physical-device matrices.
- Update `IMPLEMENTATION.md`, `SECURITY.md`, account-type references, storage
  keys, manifest documentation, and user-facing support text.
- Run the extension build and inspect the unpacked and store ZIP manifests.
- Ship only after the entire Trezor tile, setup, signing, recovery, and
  regression matrix passes.

## 13. Acceptance criteria

- [x] `trezor` is a first-class exhaustive account type with public-only
      device/path metadata.
- [x] Fresh onboarding and Add account use the same shared hardware UI flow as
      Ledger, with Trezor-specific copy and official local assets.
- [x] No copied Trezor versions of Ledger layout, selection, signing-status, or
      sticky-action components exist.
- [x] Chromium users can connect, scan, page, select, and atomically import
      multiple Trezor accounts.
- [x] Firefox does not advertise or bundle the initial integration.
- [x] WalletChan never receives or stores a Trezor PIN, passphrase, recovery
      phrase, private key, transport path, or session state.
- [x] Legacy and EIP-1559 transactions recover to the pinned account before
      exact-byte broadcast.
- [x] Personal and supported EIP-712 signatures recover against the exact
      reviewed bytes/digest before release.
- [x] Wrong device, seed, passphrase wallet, path, account, chain, or digest
      fails closed.
- [x] Pending requests remain durable and retryable across rejection,
      disconnection, external-window interruption, surface closure, and
      service-worker restart.
- [x] WalletConnect, Speed Up/Cancel, Safe owner approval, Safe native-gas
      execution, and single-transaction Privacy Pools paths pass.
- [x] Batches, EIP-7702, ERC-7715, token gas, force inclusion, sponsored
      transfers, multi-exit, and direct in-extension swap/bridge fail closed.
- [x] The official stable SDK and any helper are exact-pinned and pass
      dependency, license, CSP, manifest, privacy, and package-content review.
- [x] The least-privilege manifest path is tested; no prerelease SDK, runtime
      CDN, remote extension code, or unnecessary `scripting` permission ships.
- [-] The deterministic emulator matrix is in progress through the same production
      adapter and signing boundaries.
- [x] Emulator hooks and dependencies are absent from production bundles.
- [!] Representative physical-device QA passes and is recorded.
- [x] Ledger automated smoke tests remain green after the shared UI refactor.
- [!] Ledger physical-device smoke tests remain green after the shared UI
      refactor.
- [x] `pnpm build:extension`, targeted tests, UI architecture tests, and store
      package inspection pass.
- [x] `IMPLEMENTATION.md` and `SECURITY.md` reflect the final architecture,
      message types, storage key, manifest surface, signing invariants, and
      support boundaries.

`[-]` marks the partially completed emulator matrix. `[!]` marks release
evidence that requires physical hardware and is intentionally not claimed by
the automated or partial emulator suite. The implementation is ready for the
remaining matrix; it is not release-approved until all external-evidence items
above are checked.

## 14. Risks and mandatory implementation gates

| Risk | Required gate |
| --- | --- |
| Stable SDK changes its popup, desktop, or external-message architecture | Reverify the current stable package and record the exact manifest and trust-boundary choice before coding the adapter. |
| MV3 worker suspension interrupts a long approval | Emulator and browser tests must prove the selected SDK lifetime behavior and WalletChan's fail-closed restart recovery. |
| Hidden passphrase wallet signs from a different address | Recover every result against the pinned account; never trust the selected physical device alone. |
| Model-specific EIP-712 display or size limits | Capability-gate before signing, show the exact limitation, and test full-display and hash-only models. |
| External Trezor UI creates a new privacy boundary | Add an explicit setup disclosure, audit SDK endpoints/telemetry, and send data only after a user action. |
| SDK requires a broader extension permission | Prefer the documented manual exact-origin content script; otherwise stop for security review and update the manifest proof. |
| Shared UI refactor regresses Ledger | Land shared components with Ledger regression coverage before enabling Trezor logic. |
| Accidental support through scattered account-type checks | Use exhaustive central policies and review every current Ledger branch as shared, Ledger-only, Trezor-only, or unsupported. |

## 15. Evidence and primary references

Accessed 2026-07-30 and reverified 2026-08-01:

- WalletChan implementation baseline:
  `1c6f8b41627451e410c52583eec9448cf2cfe1d6`.
- WalletChan Ledger architecture and behavior:
  [`LEDGER.md`](./LEDGER.md).
- WalletChan extension architecture:
  [`IMPLEMENTATION.md`](./IMPLEMENTATION.md).
- WalletChan trust boundaries and manifest policy:
  [`SECURITY.md`](./SECURITY.md).
- Official Trezor browser-extension SDK source at the `9.7.3` package commit:
  <https://github.com/trezor/trezor-suite/tree/29fbfcb4a2f0e6b52c4eff8b6d133ee056905535/packages/connect-webextension>.
- Official browser-extension integration guide:
  <https://connect.trezor.io/9/guides/webextension-implementation-tutorial/>.
- Official Ethereum address method:
  <https://connect.trezor.io/9/methods/ethereum/ethereumGetAddress/>.
- Official Ethereum transaction-signing method:
  <https://connect.trezor.io/9/methods/ethereum/ethereumSignTransaction/>.
- Official Ethereum message-signing method:
  <https://connect.trezor.io/9/methods/ethereum/ethereumSignMessage/>.
- Official EIP-712 signing method and model/firmware boundaries:
  <https://connect.trezor.io/9/methods/ethereum/ethereumSignTypedData/>.
- Official device-session and passphrase protocol:
  <https://docs.trezor.io/trezor-firmware/common/protocol_v1/passphrase.html>.
- Official emulator repository at reviewed commit:
  <https://github.com/trezor/trezor-user-env/tree/8d3416fa8cfbbbac97266b8742741437ee1719bf>.
- Official emulator integration guide:
  <https://connect.trezor.io/9/guides/hardware-emulator/>.
