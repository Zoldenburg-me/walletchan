"use strict";

// Reviewed copy of @trezor/connect-web@9.7.3's webextension content script.
let port = chrome.runtime.connect({
  name: "trezor-connect",
});
port.onMessage.addListener((message) => {
  window.postMessage(message, window.location.origin);
});
port.onDisconnect.addListener(() => {
  port = null;
});
window.addEventListener("message", (event) => {
  if (port && event.source === window && event.data) {
    port.postMessage({
      data: event.data,
    });
  }
});
