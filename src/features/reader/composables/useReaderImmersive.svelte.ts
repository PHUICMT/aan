// Auto-hide top toolbar after mouse-idle. Also publishes
// data-reader-controls on <html> so Reader.svelte topbar can mirror visibility.
const IMMERSIVE_HIDE_MS = 2500;

function loadPref(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export function useReaderImmersive() {
  let immersiveOn = $state<boolean>(loadPref('aan.reader.immersive', 'on') === 'on');
  let controlsVisible = $state(true);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleHide() {
    if (!immersiveOn) return;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { controlsVisible = false; }, IMMERSIVE_HIDE_MS);
  }
  function nudgeControls() {
    controlsVisible = true;
    scheduleHide();
  }
  function toggleImmersive() {
    immersiveOn = !immersiveOn;
    try { localStorage.setItem('aan.reader.immersive', immersiveOn ? 'on' : 'off'); } catch {}
    if (immersiveOn) scheduleHide();
    else {
      if (hideTimer) clearTimeout(hideTimer);
      controlsVisible = true;
    }
  }
  function cleanup() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  }

  $effect(() => {
    document.documentElement.dataset.readerControls = controlsVisible ? 'visible' : 'hidden';
    return () => { delete document.documentElement.dataset.readerControls; };
  });

  return {
    get immersiveOn() { return immersiveOn; },
    get controlsVisible() { return controlsVisible; },
    scheduleHide,
    nudgeControls,
    toggleImmersive,
    cleanup,
  };
}
