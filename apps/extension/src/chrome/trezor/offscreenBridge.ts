import { isAddress } from "viem";
import {
  withHardwareOffscreenRequest,
} from "../hardware/offscreenManager";
import {
  buildTrezorDerivationPage,
  type TrezorDerivationScheme,
} from "./derivation";
import {
  normalizeTrezorError,
  TrezorError,
  TrezorErrorCode,
} from "./errors";
import {
  TREZOR_OFFSCREEN_TARGET,
  type TrezorAddress,
  type TrezorConnectedDevice,
  type TrezorEip1559Transaction,
  type TrezorLegacyTransaction,
  type TrezorMessageSignature,
  type TrezorSignedTransaction,
  type TrezorTypedDataSignature,
} from "./types";

const DISCOVERY_TIMEOUT_MS = 90_000;
const SIGNING_TIMEOUT_MS = 10 * 60_000;

interface OffscreenResponse<T> {
  ok?: boolean;
  payload?: T;
  error?: {
    code?: string;
    userMessage?: string;
    technicalMessage?: string;
  };
}

export function connectTrezor(opId: string): Promise<TrezorConnectedDevice> {
  return send("offscreen:trezorConnect", { opId }, DISCOVERY_TIMEOUT_MS);
}

export function scanTrezorAddresses(input: {
  opId: string;
  deviceId: string;
  startIndex: number;
  count: number;
  scheme: TrezorDerivationScheme;
}): Promise<TrezorAddress[]> {
  if (!isAddress(input.deviceId)) {
    throw new TrezorError(
      TrezorErrorCode.INVALID_RESPONSE,
      "The stored Trezor identity is invalid.",
    );
  }
  return send(
    "offscreen:trezorScan",
    {
      opId: input.opId,
      deviceId: input.deviceId.toLowerCase(),
      rows: buildTrezorDerivationPage(input),
    },
    DISCOVERY_TIMEOUT_MS,
  );
}

export function signTrezorTransaction(input: {
  opId: string;
  deviceId: string;
  hdPath: string;
  transaction: TrezorLegacyTransaction | TrezorEip1559Transaction;
}): Promise<TrezorSignedTransaction> {
  return send("offscreen:trezorSignTransaction", input, SIGNING_TIMEOUT_MS);
}

export function signTrezorMessage(input: {
  opId: string;
  deviceId: string;
  hdPath: string;
  message: string;
}): Promise<TrezorMessageSignature> {
  return send("offscreen:trezorSignMessage", input, SIGNING_TIMEOUT_MS);
}

export function signTrezorTypedData(input: {
  opId: string;
  deviceId: string;
  hdPath: string;
  typedData: Record<string, unknown>;
  domainSeparatorHash?: string;
  messageHash?: string;
}): Promise<TrezorTypedDataSignature> {
  return send("offscreen:trezorSignTypedData", input, SIGNING_TIMEOUT_MS);
}

export async function cancelTrezorOperation(opId: string): Promise<boolean> {
  return send(
    "offscreen:trezorCancel",
    { opId },
    5_000,
    false,
  );
}

async function send<T>(
  type: string,
  body: Record<string, unknown>,
  timeoutMs: number,
  cancelOnTimeout = true,
): Promise<T> {
  if (!chrome.offscreen || !chrome.runtime.getContexts) {
    throw new TrezorError(
      TrezorErrorCode.OFFSCREEN_UNAVAILABLE,
      "Trezor support requires Chrome 124 or newer.",
    );
  }

  const opId =
    typeof body.opId === "string" ? body.opId.trim().slice(0, 128) : "";
  if (!opId) {
    throw new TrezorError(
      TrezorErrorCode.INVALID_RESPONSE,
      "Missing Trezor operation ID.",
    );
  }

  try {
    const response = await withHardwareOffscreenRequest(() =>
      withTimeout(
        chrome.runtime.sendMessage({
          type,
          target: TREZOR_OFFSCREEN_TARGET,
          ...body,
          opId,
        }) as Promise<OffscreenResponse<T>>,
        timeoutMs,
      ),
    );
    if (response?.ok) return response.payload as T;
    throw new TrezorError(
      (response?.error?.code as TrezorErrorCode) || TrezorErrorCode.UNKNOWN,
      response?.error?.userMessage || "Trezor operation failed.",
      response?.error?.technicalMessage,
    );
  } catch (error) {
    if (
      cancelOnTimeout &&
      error instanceof TrezorError &&
      error.code === TrezorErrorCode.TIMEOUT
    ) {
      void chrome.runtime
        .sendMessage({
          type: "offscreen:trezorCancel",
          target: TREZOR_OFFSCREEN_TARGET,
          opId,
        })
        .catch(() => undefined);
    }
    throw normalizeTrezorError(error);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new TrezorError(
            TrezorErrorCode.TIMEOUT,
            "The Trezor request timed out. Try again.",
          ),
        ),
      timeoutMs,
    );
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
