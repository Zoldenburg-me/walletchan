import assert from "node:assert/strict";
import test from "node:test";
import type { Account } from "../../src/chrome/types";
import {
  decodeTrezorAccount,
  decodeTrezorDeviceMap,
  prepareTrezorAccountImport,
} from "../../src/chrome/trezor/storage";

const DEVICE_ID = "0x0000000000000000000000000000000000000001";
const ADDRESS_A = "0x1111111111111111111111111111111111111111";
const ADDRESS_B = "0x2222222222222222222222222222222222222222";

function prepare(
  addresses: Array<{
    address: string;
    hdPath: string;
    hdIndex: number;
    displayName?: string;
  }>,
  accounts: Account[] = [],
) {
  let id = 0;
  return prepareTrezorAccountImport({
    input: {
      deviceId: DEVICE_ID,
      deviceLabel: " My Trezor ",
      deviceModel: " Safe 5 ",
      addresses,
    },
    accounts,
    devices: {
      [DEVICE_ID]: {
        label: "Earlier label",
        model: "Earlier model",
        addedAt: 50,
      },
    },
    now: 100,
    createId: () => `trezor-${++id}`,
  });
}

test("Trezor account import prepares one atomic account and device snapshot", () => {
  const result = prepare([
    {
      address: ADDRESS_A,
      hdPath: "m/44'/60'/0'/0/0",
      hdIndex: 0,
      displayName: " Account one ",
    },
    {
      address: ADDRESS_B,
      hdPath: "m/44'/60'/1'/0/0",
      hdIndex: 1,
    },
  ]);
  assert.equal(result.created.length, 2);
  assert.deepEqual(result.accounts, result.created);
  assert.deepEqual(result.created[0], {
    id: "trezor-1",
    type: "trezor",
    address: ADDRESS_A,
    deviceId: DEVICE_ID,
    hdPath: "m/44'/60'/0'/0/0",
    hdIndex: 0,
    displayName: "Account one",
    createdAt: 100,
  });
  assert.deepEqual(result.devices[DEVICE_ID], {
    label: "My Trezor",
    model: "Safe 5",
    addedAt: 50,
  });
});

test("Trezor import rejects signer collisions but permits an existing view-only row", () => {
  const viewOnly: Account = {
    id: "watch",
    type: "impersonator",
    address: ADDRESS_A,
    createdAt: 1,
  };
  assert.equal(
    prepare(
      [{
        address: ADDRESS_A,
        hdPath: "m/44'/60'/0'/0/0",
        hdIndex: 0,
      }],
      [viewOnly],
    ).created.length,
    1,
  );

  const signer: Account = {
    id: "local",
    type: "privateKey",
    address: ADDRESS_A,
    createdAt: 1,
  };
  assert.throws(
    () =>
      prepare(
        [{
          address: ADDRESS_A,
          hdPath: "m/44'/60'/0'/0/0",
          hdIndex: 0,
        }],
        [signer],
      ),
    /already in this wallet/,
  );
  assert.throws(
    () =>
      prepare([
        {
          address: ADDRESS_A,
          hdPath: "m/44'/60'/0'/0/0",
          hdIndex: 0,
        },
        {
          address: ADDRESS_A,
          hdPath: "m/44'/60'/1'/0/0",
          hdIndex: 1,
        },
      ]),
    /already in this wallet/,
  );
});

test("Trezor import accepts only released path/index pairs and bounded pages", () => {
  assert.throws(
    () => prepare([]),
    /Select between 1 and 20/,
  );
  assert.throws(
    () =>
      prepare(
        Array.from({ length: 21 }, (_, hdIndex) => ({
          address: `0x${(hdIndex + 1).toString(16).padStart(40, "0")}`,
          hdPath: `m/44'/60'/${hdIndex}'/0/0`,
          hdIndex,
        })),
      ),
    /Select between 1 and 20/,
  );
  assert.throws(
    () =>
      prepare([{
        address: ADDRESS_A,
        hdPath: "m/44'/60'/0'/0/1",
        hdIndex: 0,
      }]),
    /Invalid Trezor account details/,
  );
});

test("Trezor public storage codecs reject extras, malformed paths, and secret-like fields", () => {
  const decoded = decodeTrezorAccount({
    id: "trezor-1",
    type: "trezor",
    address: ADDRESS_A,
    deviceId: DEVICE_ID,
    hdPath: "m/44'/60'/0'/0/0",
    hdIndex: 0,
    createdAt: 1,
  });
  assert.equal(decoded.type, "trezor");
  assert.throws(
    () => decodeTrezorAccount({ ...decoded, passphrase: "never" }),
    /Invalid Trezor account storage/,
  );
  assert.throws(
    () => decodeTrezorAccount({ ...decoded, hdPath: "m/44'/60'/0'/0/1" }),
    /Invalid Trezor account storage/,
  );

  assert.deepEqual(
    decodeTrezorDeviceMap({
      [DEVICE_ID]: { label: "Trezor", model: "Safe 5", addedAt: 1 },
    }),
    {
      [DEVICE_ID]: { label: "Trezor", model: "Safe 5", addedAt: 1 },
    },
  );
  assert.throws(
    () =>
      decodeTrezorDeviceMap({
        [DEVICE_ID]: {
          label: "Trezor",
          model: "Safe 5",
          addedAt: 1,
          session: "never",
        },
      }),
    /Invalid Trezor device storage/,
  );
});
