# Trezor transport tests

These tests cover the Chromium-only Trezor implementation without requiring a
device: exact dependency/manifest packaging and popup mode, dynamic-code build
guards, service-worker sender authorization, released derivation paths,
storage/import behavior, capability exclusions, input/output bounds, stable
errors, operation serialization/cancellation/deadlines, exact transaction
serialization and signer recovery, and personal/EIP-712 signer recovery.
Shared hardware-offscreen lifetime coverage lives in `tests/hardware/`.

The regression for typed transactions explicitly accepts canonical SDK
recovery IDs `v = 0x0` and `v = 0x1` while rejecting non-canonical quantities.
A separate packaged Trezor One smoke covers connection, five-address export,
and one EIP-1559 approval; these tests do not claim the remaining emulator or
any physical-device coverage. The complete release QA matrix remains required
by `_docs/TREZOR_TASKS.md`.
