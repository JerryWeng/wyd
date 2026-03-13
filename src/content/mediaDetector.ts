let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function sendMediaState(isPlaying: boolean) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ action: "mediaPlayingState", isPlaying });
  }, 50);
}

function isAnyMediaPlaying(): boolean {
  const elements = document.querySelectorAll<HTMLMediaElement>("video, audio");
  return Array.from(elements).some((el) => !el.paused && !el.ended);
}

function attachListeners(el: HTMLMediaElement) {
  el.addEventListener("play", () => sendMediaState(true), { capture: true });
  el.addEventListener("pause", () => sendMediaState(isAnyMediaPlaying()), { capture: true });
  el.addEventListener("ended", () => sendMediaState(isAnyMediaPlaying()), { capture: true });
}

// Attach to all media elements already in the DOM
document.querySelectorAll<HTMLMediaElement>("video, audio").forEach(attachListeners);

// Report initial state
sendMediaState(isAnyMediaPlaying());

// Watch for dynamically added media elements
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLMediaElement) {
        attachListeners(node);
        if (!node.paused && !node.ended) sendMediaState(true);
      } else if (node instanceof Element) {
        node.querySelectorAll<HTMLMediaElement>("video, audio").forEach((el) => {
          attachListeners(el);
          if (!el.paused && !el.ended) sendMediaState(true);
        });
      }
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
