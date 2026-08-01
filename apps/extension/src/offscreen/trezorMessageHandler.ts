import {
  normalizeTrezorError,
  TrezorError,
  TrezorErrorCode,
} from "../chrome/trezor/errors";
import {
  TREZOR_STATUS_SOURCE,
  type TrezorTransaction,
  type TrezorSignerStatus,
} from "../chrome/trezor/types";
import type { TrezorDerivationRow } from "../chrome/trezor/derivation";
import * as trezor from "./trezorConnect";

const DISCOVERY_TIMEOUT_MS = 90_000;
const SIGNING_TIMEOUT_MS = 10 * 60_000;
const ALLOWED_OPERATION_TYPES = new Set([
  "offscreen:trezorConnect",
  "offscreen:trezorScan",
  "offscreen:trezorSignTransaction",
  "offscreen:trezorSignMessage",
  "offscreen:trezorSignTypedData",
]);

let activeOperationId: string | null = null;

export async function handleTrezorOffscreenMessage(
  message: Record<string, unknown>,
) {
  const opId = normalizeOperationId(message.opId);
  const dispatch = makeDispatch(opId);

  if (message.type === "offscreen:trezorCancel") {
    if (opId && activeOperationId === opId) {
      trezor.cancelActiveTrezorOperation();
    }
    return { ok: true, payload: true };
  }

  try {
    if (!opId) {
      throw new TrezorError(
        TrezorErrorCode.INVALID_RESPONSE,
        "Missing Trezor operation ID.",
      );
    }
    if (
      typeof message.type !== "string" ||
      !ALLOWED_OPERATION_TYPES.has(message.type)
    ) {
      throw new TrezorError(
        TrezorErrorCode.INVALID_RESPONSE,
        "Unknown Trezor operation.",
      );
    }
    if (activeOperationId) {
      throw new TrezorError(
        TrezorErrorCode.TRANSPORT_BUSY,
        "Another Trezor operation is in progress.",
      );
    }

    activeOperationId = opId;
    const payload = await withDeadline(
      runOperation(message, dispatch),
      isSigningOperation(message.type)
        ? SIGNING_TIMEOUT_MS
        : DISCOVERY_TIMEOUT_MS,
    );
    return { ok: true, payload };
  } catch (error) {
    const normalized = normalizeTrezorError(error);
    dispatch("error", { errorCode: normalized.code });
    return { ok: false, error: serializeTrezorError(normalized) };
  } finally {
    if (activeOperationId === opId) activeOperationId = null;
  }
}

export function serializeTrezorError(error: unknown) {
  const normalized = normalizeTrezorError(error);
  return {
    code: normalized.code,
    userMessage: normalized.userMessage,
    technicalMessage: normalized.technicalMessage,
  };
}

function runOperation(
  message: Record<string, unknown>,
  dispatch: trezor.TrezorDispatchStatus,
): Promise<unknown> {
  switch (message.type) {
    case "offscreen:trezorConnect":
      return trezor.connectTrezor(dispatch);
    case "offscreen:trezorScan":
      return trezor.scanTrezorAddresses(
        message.deviceId as string,
        message.rows as TrezorDerivationRow[],
        dispatch,
      );
    case "offscreen:trezorSignTransaction":
      return trezor.signTrezorTransaction(
        message.deviceId as string,
        message.hdPath as string,
        message.transaction as TrezorTransaction,
        dispatch,
      );
    case "offscreen:trezorSignMessage":
      return trezor.signTrezorMessage(
        message.deviceId as string,
        message.hdPath as string,
        message.message as string,
        dispatch,
      );
    case "offscreen:trezorSignTypedData":
      return trezor.signTrezorTypedData(
        message.deviceId as string,
        message.hdPath as string,
        message.typedData as Record<string, unknown>,
        message.domainSeparatorHash as string | undefined,
        message.messageHash as string | undefined,
        dispatch,
      );
    default:
      throw new TrezorError(
        TrezorErrorCode.INVALID_RESPONSE,
        "Unknown Trezor operation.",
      );
  }
}

function makeDispatch(opId?: string) {
  return (
    status: TrezorSignerStatus,
    extra?: { errorCode?: string },
  ): void => {
    if (!opId) return;
    chrome.runtime
      .sendMessage({
        type: "offscreenTrezorStatus",
        source: TREZOR_STATUS_SOURCE,
        opId,
        status,
        ...extra,
      })
      .catch(() => undefined);
  };
}

function normalizeOperationId(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 128) : "";
}

function isSigningOperation(type: unknown): boolean {
  return (
    type === "offscreen:trezorSignTransaction" ||
    type === "offscreen:trezorSignMessage" ||
    type === "offscreen:trezorSignTypedData"
  );
}

function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      trezor.cancelActiveTrezorOperation();
      reject(
        new TrezorError(
          TrezorErrorCode.TIMEOUT,
          "The Trezor request timed out. Try again.",
        ),
      );
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
