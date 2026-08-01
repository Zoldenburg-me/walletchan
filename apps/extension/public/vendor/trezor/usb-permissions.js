"use strict";

const TREZOR_CONNECT_ORIGIN = "https://connect.trezor.io";
const TREZOR_CONNECT_MAJOR = "9";
const POPUP_URL = `${TREZOR_CONNECT_ORIGIN}/${TREZOR_CONNECT_MAJOR}/popup.html`;

const switchToPopupTab = (event) => {
  window.removeEventListener("beforeunload", switchToPopupTab);
  if (!event) {
    chrome.tabs.query(
      { currentWindow: true, active: true },
      (currentTabs) => {
        const currentTabId = currentTabs[0]?.id;
        if (typeof currentTabId === "number") {
          chrome.tabs.remove(currentTabId);
        }
      },
    );
  }
  chrome.tabs.query({ url: POPUP_URL }, (tabs) => {
    const popupTabId = tabs[0]?.id;
    if (typeof popupTabId === "number") {
      chrome.tabs.update(popupTabId, { active: true });
    }
  });
};

window.addEventListener("message", (event) => {
  const iframe = document.getElementById("trezor-usb-permissions");
  if (
    event.origin !== TREZOR_CONNECT_ORIGIN ||
    !(iframe instanceof HTMLIFrameElement) ||
    event.source !== iframe.contentWindow
  ) {
    return;
  }
  if (event.data === "usb-permissions-init") {
    iframe.contentWindow?.postMessage(
      {
        type: "usb-permissions-init",
        extension: chrome.runtime.id,
      },
      TREZOR_CONNECT_ORIGIN,
    );
  } else if (event.data === "usb-permissions-close") {
    switchToPopupTab();
  }
});

window.addEventListener("beforeunload", switchToPopupTab);
window.addEventListener("load", () => {
  const iframe = document.createElement("iframe");
  iframe.id = "trezor-usb-permissions";
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.style.border = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.src =
    `${TREZOR_CONNECT_ORIGIN}/${TREZOR_CONNECT_MAJOR}/` +
    "extension-permissions.html";
  iframe.allow = "usb";
  document.body?.appendChild(iframe);
});
