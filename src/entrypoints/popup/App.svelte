<script lang="ts">
  let active = $state(false);
  let statusText = $state('Click to start picking images');
  let loading = $state(false);

  async function toggle() {
    loading = true;
    const next = !active;

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (!tabId) {
      statusText = 'No active tab found';
      loading = false;
      return;
    }

    try {
      await browser.tabs.sendMessage(tabId, { type: 'toggle-picker', active: next });
      active = next;
      statusText = active
        ? 'Picker active — click any image to download'
        : 'Picker off';
    } catch {
      statusText = 'Error: reload the page and try again';
    }
    loading = false;
  }
</script>

<main>
  <h1>Save Image</h1>

  <button onclick={toggle} disabled={loading}>
    {loading ? '…' : active ? '● Deactivate' : '○ Activate Picker'}
  </button>

  <p class="status">{statusText}</p>

  <p class="hint">Click any image on the page to download it.</p>
</main>

<style>
  main {
    width: 220px;
    padding: 1rem;
    text-align: center;
    font-family: system-ui, sans-serif;
  }
  h1 {
    font-size: 1.1rem;
    margin: 0 0 0.75rem;
  }
  button {
    width: 100%;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border-radius: 6px;
    border: 1px solid #555;
    background: #2a2a2a;
    color: #fff;
    cursor: pointer;
    font-weight: 600;
  }
  button:hover:not(:disabled) {
    background: #3a3a3a;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .status {
    font-size: 0.8rem;
    margin: 0.5rem 0;
    color: #aaa;
  }
  .hint {
    font-size: 0.7rem;
    color: #666;
    margin: 0;
  }
</style>
