import TrezorConnect, {
  UI_EVENT,
  UI_REQUEST,
  type UiEventMessage,
} from "@trezor/connect-web";
import {
  TREZOR_DEVICE_IDENTITY_PATH,
  type TrezorDerivationRow,
} from "../chrome/trezor/derivation";
import {
  TrezorError,
  TrezorErrorCode,
} from "../chrome/trezor/errors";
import {
  TREZOR_CONNECT_SOURCE,
  type TrezorAddress,
  type TrezorConnectedDevice,
  type TrezorMessageSignature,
  type TrezorSignedTransaction,
  type TrezorTransaction,
  type TrezorTypedDataSignature,
} from "../chrome/trezor/types";
import {
  normalizeMessageHex,
  normalizeOptionalHash,
  unwrapTrezorResponse,
  validateAddressPage,
  validateDeviceFeatures,
  validateDeviceIdentity,
  validateIdentityPayload,
  validatePath,
  validateReturnedSignature,
  validateRows,
  validateSignedTransaction,
  validateTransaction,
  validateTypedData,
} from "./trezorValidation";

export type TrezorDispatchStatus = (
  status:
    | "connecting"
    | "selecting-device"
    | "awaiting-confirmation"
    | "scanning"
    | "signing"
    | "success",
) => void;

const TREZOR_MANIFEST = {
  appName: "WalletChan",
  appUrl: "https://walletchan.com",
  email: "hello@walletchan.com",
} as const;

let initialization: Promise<void> | null = null;
let listenersAttached = false;
let activeDispatch: TrezorDispatchStatus | null = null;

export async function connectTrezor(
  dispatch: TrezorDispatchStatus,
): Promise<TrezorConnectedDevice> {
  return withDispatch(dispatch, async () => {
    dispatch("connecting");
    const identity = await getIdentityAddress(true);
    const features = validateDeviceFeatures(
      unwrapTrezorResponse(
        await TrezorConnect.getFeatures({ keepSession: false }),
      ),
    );
    dispatch("success");
    return {
      deviceId: identity,
      deviceLabel: features.label,
      deviceModel: features.model,
    };
  });
}

export async function scanTrezorAddresses(
  deviceId: string,
  rows: TrezorDerivationRow[],
  dispatch: TrezorDispatchStatus,
): Promise<TrezorAddress[]> {
  const normalizedDeviceId = validateDeviceIdentity(deviceId);
  validateRows(rows);

  return withDispatch(dispatch, async () => {
    dispatch("connecting");
    await assertExpectedDevice(normalizedDeviceId, true);
    dispatch("scanning");
    const response = await TrezorConnect.ethereumGetAddress({
      bundle: rows.map(({ hdPath }) => ({
        path: hdPath,
        showOnTrezor: false,
      })),
      keepSession: false,
    });
    const payload = unwrapTrezorResponse(response);
    const addresses = validateAddressPage(payload, rows);
    dispatch("success");
    return addresses;
  });
}

export async function signTrezorTransaction(
  deviceId: string,
  hdPath: string,
  transaction: TrezorTransaction,
  dispatch: TrezorDispatchStatus,
): Promise<TrezorSignedTransaction> {
  const normalizedDeviceId = validateDeviceIdentity(deviceId);
  validatePath(hdPath);
  validateTransaction(transaction);

  return withDispatch(dispatch, async () => {
    await assertExpectedDevice(normalizedDeviceId, true);
    dispatch("signing");
    const response = await TrezorConnect.ethereumSignTransaction({
      path: hdPath,
      transaction,
      keepSession: false,
    });
    const payload = validateSignedTransaction(
      unwrapTrezorResponse(response),
    );
    dispatch("success");
    return payload;
  });
}

export async function signTrezorMessage(
  deviceId: string,
  hdPath: string,
  message: string,
  dispatch: TrezorDispatchStatus,
): Promise<TrezorMessageSignature> {
  const normalizedDeviceId = validateDeviceIdentity(deviceId);
  validatePath(hdPath);
  const normalizedMessage = normalizeMessageHex(message);

  return withDispatch(dispatch, async () => {
    await assertExpectedDevice(normalizedDeviceId, true);
    dispatch("signing");
    const response = await TrezorConnect.ethereumSignMessage({
      path: hdPath,
      message: normalizedMessage,
      hex: true,
      keepSession: false,
    });
    const payload = validateReturnedSignature(
      unwrapTrezorResponse(response),
    );
    dispatch("success");
    return payload;
  });
}

export async function signTrezorTypedData(
  deviceId: string,
  hdPath: string,
  typedData: Record<string, unknown>,
  domainSeparatorHash: string | undefined,
  messageHash: string | undefined,
  dispatch: TrezorDispatchStatus,
): Promise<TrezorTypedDataSignature> {
  const normalizedDeviceId = validateDeviceIdentity(deviceId);
  validatePath(hdPath);
  validateTypedData(typedData);
  const normalizedDomainHash = normalizeOptionalHash(domainSeparatorHash);
  const normalizedMessageHash = normalizeOptionalHash(messageHash);

  return withDispatch(dispatch, async () => {
    await assertExpectedDevice(normalizedDeviceId, true);
    dispatch("signing");
    const base = {
      path: hdPath,
      data: typedData,
      metamask_v4_compat: true,
      keepSession: false,
    };
    const request = normalizedDomainHash
      ? {
          ...base,
          domain_separator_hash: normalizedDomainHash,
          message_hash: normalizedMessageHash,
        }
      : base;
    const response = await TrezorConnect.ethereumSignTypedData(
      request as unknown as Parameters<
        typeof TrezorConnect.ethereumSignTypedData
      >[0],
    );
    const payload = validateReturnedSignature(
      unwrapTrezorResponse(response),
    );
    dispatch("success");
    return payload;
  });
}

export function cancelActiveTrezorOperation(): void {
  TrezorConnect.cancel("WalletChan cancelled the Trezor request.");
}

async function ensureInitialized(): Promise<void> {
  if (!initialization) {
    initialization = TrezorConnect.init({
      manifest: TREZOR_MANIFEST,
      connectSrc: TREZOR_CONNECT_SOURCE,
      // Transport discovery must run in the visible trezor.io tab so Chrome's
      // per-origin Local Network permission applies to the local Bridge.
      coreMode: "popup",
      lazyLoad: true,
      popup: true,
    }).catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
  attachListeners();
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  TrezorConnect.on(UI_EVENT, handleUiEvent);
}

function handleUiEvent(event: UiEventMessage): void {
  if (!activeDispatch) return;
  if (event.type === UI_REQUEST.SELECT_DEVICE) {
    activeDispatch("selecting-device");
    return;
  }
  if (
    event.type === UI_REQUEST.REQUEST_BUTTON ||
    event.type === UI_REQUEST.REQUEST_PIN ||
    event.type === UI_REQUEST.REQUEST_PASSPHRASE ||
    event.type === UI_REQUEST.REQUEST_PASSPHRASE_ON_DEVICE ||
    event.type === UI_REQUEST.REQUEST_CONFIRMATION ||
    event.type === UI_REQUEST.REQUEST_PERMISSION
  ) {
    activeDispatch("awaiting-confirmation");
  }
}

async function withDispatch<T>(
  dispatch: TrezorDispatchStatus,
  run: () => Promise<T>,
): Promise<T> {
  await ensureInitialized();
  if (activeDispatch) {
    throw new TrezorError(
      TrezorErrorCode.TRANSPORT_BUSY,
      "Another Trezor operation is in progress.",
    );
  }
  activeDispatch = dispatch;
  try {
    return await run();
  } finally {
    activeDispatch = null;
  }
}

async function getIdentityAddress(
  keepSession: boolean,
): Promise<`0x${string}`> {
  const response = await TrezorConnect.ethereumGetAddress({
    path: TREZOR_DEVICE_IDENTITY_PATH,
    showOnTrezor: false,
    keepSession,
  });
  return validateIdentityPayload(
    unwrapTrezorResponse(response),
    TREZOR_DEVICE_IDENTITY_PATH,
  );
}

async function assertExpectedDevice(
  expectedDeviceId: string,
  keepSession: boolean,
): Promise<void> {
  const actualDeviceId = await getIdentityAddress(keepSession);
  if (actualDeviceId !== expectedDeviceId) {
    throw new TrezorError(
      TrezorErrorCode.DEVICE_DISCONNECTED,
      "Connect the Trezor used by this account and try again.",
    );
  }
}
