# WalletChan Browser Extension — Third-Party Notices

This file records third-party software whose license materially affects the
distributed WalletChan browser extension. Other dependencies retain their own
copyright notices and license terms as provided in their source packages.

## snarkjs and its GPL dependency family

- Component: `snarkjs`
- Version: `0.7.5`
- Copyright: Copyright 2018 0KIMS Association
- Author listed by the package: Jordi Baylina
- Project: <https://github.com/iden3/snarkjs>
- Exact source: <https://github.com/iden3/snarkjs/tree/v0.7.5>
- License: GNU General Public License version 3 (`GPL-3.0`)

WalletChan uses the unmodified npm release of `snarkjs@0.7.5` for local
Groth16 proof generation and verification in its packaged privacy prover.
WalletChan's build bundles that library into the extension; no `snarkjs`
source patch is maintained by WalletChan.

The following GPL-3.0 packages are included through that exact dependency:

| Package | Version | Exact package source |
| --- | --- | --- |
| `@iden3/bigarray` | `0.0.2` | <https://www.npmjs.com/package/@iden3/bigarray/v/0.0.2> |
| `@iden3/binfileutils` | `0.0.12` | <https://www.npmjs.com/package/@iden3/binfileutils/v/0.0.12> |
| `fastfile` | `0.0.20` | <https://www.npmjs.com/package/fastfile/v/0.0.20> |
| `ffjavascript` | `0.3.0`, `0.3.1` | <https://www.npmjs.com/package/ffjavascript/v/0.3.0>, <https://www.npmjs.com/package/ffjavascript/v/0.3.1> |
| `r1csfile` | `0.0.48` | <https://www.npmjs.com/package/r1csfile/v/0.0.48> |
| `wasmbuilder` | `0.0.16` | <https://www.npmjs.com/package/wasmbuilder/v/0.0.16> |
| `wasmcurves` | `0.2.2` | <https://www.npmjs.com/package/wasmcurves/v/0.2.2> |

These packages identify Jordi Baylina or 0kims as their author. Their upstream
source packages retain the detailed copyright notices for each work.

The complete GNU GPL version 3 text is included in [COPYING](./COPYING) and as
`LICENSE.txt` in every packaged extension build.

## Trezor Connect

- Component: `@trezor/connect-web`
- Version: `9.7.3`
- Copyright: SatoshiLabs Group a.s. and contributors
- Project: <https://github.com/trezor/trezor-suite/tree/develop/packages/connect-web>
- Exact package: <https://www.npmjs.com/package/@trezor/connect-web/v/9.7.3>
- License: Trezor Reference Source License (`T-RSL`), as published in the
  package's `LICENSE.md`

WalletChan bundles the official package's reviewed `lib` entry in the
Chromium-only hardware offscreen document and packages the reviewed 9.7.3
webextension content-script protocol locally. The Firefox artifact contains no
Trezor SDK, setup UI, official-origin relay/assets, offscreen target, or signing
transport; shared account-type display policy may still recognize a public
Trezor metadata row fail-closed. The package and its Trezor dependencies retain
their published copyright and license terms.
