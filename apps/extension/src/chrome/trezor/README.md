# Trezor transport audit domain

This Chromium-only domain owns Trezor account metadata, the background-to-
offscreen adapter, setup handlers, and exact signer implementation. The
durable request lifecycle is shared with Ledger, while Trezor payload
construction and response verification remain independent.

- `types.ts` defines the bounded public operation contracts and exact official
  connection source.
- `derivation.ts` owns the canonical public identity path and three fixed
  released address templates.
- `errors.ts` maps upstream failures into a stable bounded vocabulary.
- `offscreenBridge.ts` is the service-worker-side caller. It applies operation
  IDs and deadlines and sends only to the authenticated hardware offscreen
  target.
- `storage.ts` owns exact public account/device codecs and the atomic
  account-plus-device import.
- `accountHandlers.ts` owns master-gated trusted-UI setup operations.
- `signing.ts` prepares legacy/EIP-1559 payloads, verifies returned serialized
  bytes and recovered signers, and supports personal-sign/EIP-712 recovery.
- `transactionExecution.ts` and `signatureConfirmation.ts` expose the shared
  hardware pending-request lifecycle under Trezor-specific entrypoints.

The official SDK itself and its input/output validation live under
`src/offscreen/`, where the exact service-worker sender check runs before
dispatch. Connect is initialized in explicit popup mode so Bridge discovery
runs in the visible official origin. Address pages use the SDK bundle method,
although its UI may request one Export approval per address. Transaction
responses treat `v` as a canonical quantity (`0x0`/`0x1` are valid) while
keeping signature words and serialized bytes bounded. Release and remaining
device-test gates are tracked in `_docs/TREZOR_TASKS.md`; mirrored automated
coverage is documented in `tests/trezor/README.md`.
