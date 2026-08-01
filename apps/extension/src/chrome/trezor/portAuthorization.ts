const TREZOR_CONNECT_ORIGIN = "https://connect.trezor.io";
const TREZOR_CONNECT_PATH_PREFIX = "/9/";

/**
 * Identifies only the packaged Trezor Connect v9 content-script relay.
 *
 * This is not a wallet-UI trust decision. It merely prevents the background's
 * generic port guard from closing a port consumed and independently checked by
 * the official SDK in the authenticated offscreen document.
 */
export function isTrezorConnectRelayPort(
  port: {
    name?: unknown;
    sender?: chrome.runtime.MessageSender;
  },
  extensionId: string,
): boolean {
  if (port.name !== "trezor-connect") return false;
  const sender = port.sender;
  if (
    !sender ||
    sender.id !== extensionId ||
    sender.origin !== TREZOR_CONNECT_ORIGIN ||
    sender.frameId !== 0 ||
    typeof sender.tab?.id !== "number" ||
    typeof sender.url !== "string"
  ) {
    return false;
  }
  try {
    const url = new URL(sender.url);
    return (
      url.origin === TREZOR_CONNECT_ORIGIN &&
      url.username === "" &&
      url.password === "" &&
      url.pathname.startsWith(TREZOR_CONNECT_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}
