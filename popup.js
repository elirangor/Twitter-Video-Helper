function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
    window.close(); // Close popup after toast hides
  }, 1500);
}

document.getElementById("copy-link").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const url = tab.url;
    const match = url.match(
      /https:\/\/(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/
    );

    if (match) {
      const videoLink = match[0] + "/video/1";
      navigator.clipboard
        .writeText(videoLink)
        .then(() => {
          showToast("Quote video button added");
        })
        .catch(() => {
          showToast("Clipboard copy failed.");
        });
    } else {
      showToast("Not a valid tweet URL.");
    }
  });
});
