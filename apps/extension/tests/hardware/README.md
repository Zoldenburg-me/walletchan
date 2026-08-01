# Shared hardware transport tests

`offscreenManager.test.ts` proves that concurrent Ledger/Trezor work creates
one hardware document, does not tear it down while either request is active,
and schedules one idle close after the final request completes. Provider
authorization and operation tests remain in `tests/ledger/` and
`tests/trezor/`.
