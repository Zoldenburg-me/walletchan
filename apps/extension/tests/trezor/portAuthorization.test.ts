import assert from "node:assert/strict";
import test from "node:test";
import { isTrezorConnectRelayPort } from "../../src/chrome/trezor/portAuthorization";

const EXTENSION_ID = "walletchan-extension";
const validPort = {
  name: "trezor-connect",
  sender: {
    id: EXTENSION_ID,
    origin: "https://connect.trezor.io",
    url: "https://connect.trezor.io/9/popup.html",
    frameId: 0,
    tab: { id: 7 },
  } as chrome.runtime.MessageSender,
};

test("only the exact top-frame Trezor v9 content-script relay remains open", () => {
  assert.equal(
    isTrezorConnectRelayPort(validPort, EXTENSION_ID),
    true,
  );
  for (const port of [
    { ...validPort, name: "trezor-connect-lookalike" },
    {
      ...validPort,
      sender: { ...validPort.sender, id: "foreign-extension" },
    },
    {
      ...validPort,
      sender: {
        ...validPort.sender,
        origin: "https://connect.trezor.io.evil.test",
        url: "https://connect.trezor.io.evil.test/9/popup.html",
      },
    },
    {
      ...validPort,
      sender: {
        ...validPort.sender,
        url: "https://connect.trezor.io/10/popup.html",
      },
    },
    {
      ...validPort,
      sender: { ...validPort.sender, frameId: 1 },
    },
    {
      ...validPort,
      sender: { ...validPort.sender, tab: undefined },
    },
  ]) {
    assert.equal(
      isTrezorConnectRelayPort(port, EXTENSION_ID),
      false,
    );
  }
});
