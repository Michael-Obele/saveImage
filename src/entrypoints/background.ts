export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: any) => {
    if (msg.type === 'download-image') {
      return browser.downloads.download({
        url: msg.url,
        filename: msg.filename,
        saveAs: true,
      });
    }
  });
});
