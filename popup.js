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
    const match = url.match(/https:\/\/(?:twitter\.com|x\.com)\/[^/]+\/status\/\d+/);

    if (match) {
      const videoLink = match[0] + "/video/1";
      navigator.clipboard.writeText(videoLink).then(() => {
        showToast("Copied: /video/1 added!");
      }).catch(() => {
        showToast("Clipboard copy failed.");
      });
    } else {
      showToast("Not a valid tweet URL.");
    }
  });
});

const downloadBtn = document.getElementById("download");
const mp4Btn = document.getElementById("download-mp4");
const gifBtn = document.getElementById("download-gif");

function getVideoUrl() {
  // Check meta tags for direct MP4 links first
  const metaMp4 = document.querySelector(
    'meta[property="og:video:url"], meta[name="twitter:player:stream"]'
  );
  if (metaMp4 && metaMp4.content) {
    const url = metaMp4.content;
    if (/\.mp4(\?.*)?$/.test(url)) {
      return url;
    }
  }

  const html = document.documentElement.innerHTML;
  const mp4Match = html.match(
    /https:\/\/(?:video|pbs)\.twimg\.com[^"']+\.mp4[^"']*/
  );
  if (mp4Match) {
    return mp4Match[0];
  }
  const videoEl = document.querySelector('video');
  if (videoEl) {
    const src = videoEl.currentSrc || videoEl.src;
    if (src && !src.startsWith('blob:')) {
      return src;
    }
    const source = videoEl.querySelector('source');
    if (source && source.src && !source.src.startsWith('blob:')) {
      return source.src;
    }
  }
  return null;
}

function fetchVideoUrl(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: getVideoUrl,
  }, (results) => {
    if (chrome.runtime.lastError || !results || !results.length) {
      callback(null);
    } else {
      callback(results[0].result);
    }
  });
}

downloadBtn.addEventListener("click", () => {
  mp4Btn.style.display = "block";
  gifBtn.style.display = "block";
});

mp4Btn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    fetchVideoUrl(tab.id, (videoUrl) => {
      if (videoUrl) {
        chrome.downloads.download({ url: videoUrl, filename: 'twitter-video.mp4' });
        showToast('Downloading MP4...');
      } else {
        showToast('Video URL not found.');
      }
    });
  });
});

gifBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    fetchVideoUrl(tab.id, (videoUrl) => {
      if (videoUrl) {
        const gifUrl = 'https://ezgif.com/video-to-gif?url=' + encodeURIComponent(videoUrl);
        chrome.tabs.create({ url: gifUrl });
        showToast('Opening GIF converter...');
      } else {
        showToast('Video URL not found.');
      }
    });
  });
});
