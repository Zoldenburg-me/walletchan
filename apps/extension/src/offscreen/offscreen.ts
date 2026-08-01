import {
  LedgerError,
  LedgerErrorCode,
} from "../chrome/ledger/errors";
import {
  TrezorError,
  TrezorErrorCode,
} from "../chrome/trezor/errors";
import { TREZOR_OFFSCREEN_TARGET } from "../chrome/trezor/types";
import {
  handleLedgerOffscreenMessage,
  serializeLedgerError,
} from "./ledgerMessageHandler";
import {
  isTrustedHardwareBackgroundSender,
} from "./messageAuthorization";
import {
  handleTrezorOffscreenMessage,
  serializeTrezorError,
} from "./trezorMessageHandler";

const LEDGER_OFFSCREEN_TARGET = "walletchan-ledger-offscreen";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const target = message?.target;
  if (
    target !== LEDGER_OFFSCREEN_TARGET &&
    target !== TREZOR_OFFSCREEN_TARGET
  ) {
    return false;
  }

  if (!isTrustedHardwareBackgroundSender(sender)) {
    const error =
      target === LEDGER_OFFSCREEN_TARGET
        ? serializeLedgerError(
            new LedgerError(
              LedgerErrorCode.UNKNOWN,
              "Unauthorized Ledger bridge request.",
            ),
          )
        : serializeTrezorError(
            new TrezorError(
              TrezorErrorCode.UNKNOWN,
              "Unauthorized Trezor bridge request.",
            ),
          );
    sendResponse({ ok: false, error });
    return false;
  }

  const handler =
    target === LEDGER_OFFSCREEN_TARGET
      ? handleLedgerOffscreenMessage
      : handleTrezorOffscreenMessage;
  handler(message).then(sendResponse).catch((error) => {
    sendResponse({
      ok: false,
      error:
        target === LEDGER_OFFSCREEN_TARGET
          ? serializeLedgerError(error)
          : serializeTrezorError(error),
    });
  });
  return true;
});
