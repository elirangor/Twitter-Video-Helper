chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyVideo1Link",
    title: "Copy Tweet Link with /video/1",
    contexts: ["page", "selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copyVideo1Link") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const match = window.location.href.match(/twitter\.com\/[^/]+\/status\/\d+/);
        if (match) {
          const videoLink = match[0] + "/video/1";
          navigator.clipboard.writeText(videoLink).then(() => {
            alert("Copied: " + videoLink);
          });
        } else {
          alert("Tweet link not found.");
        }
      }
    });
  }
});
