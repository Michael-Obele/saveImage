export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let active = false;
    let styleEl: HTMLStyleElement | null = null;
    let hoveredImg: HTMLImageElement | null = null;

    // ponytail: inline styles, no CSS files
    const HOVER_CLASS = "sip-hover"; // sip = save-image-picker

    browser.runtime.onMessage.addListener((msg: any) => {
      if (msg.type === "toggle-picker") {
        msg.active ? activate() : deactivate();
        return Promise.resolve({ active });
      }
      if (msg.type === "get-state") {
        return Promise.resolve({ active });
      }
    });

    function injectStyles() {
      if (styleEl) return;
      styleEl = document.createElement("style");
      styleEl.textContent = `
        .${HOVER_CLASS} { outline: 3px solid #4CAF50 !important; outline-offset: 2px !important; cursor: crosshair !important; }
      `;
      document.head.appendChild(styleEl);
    }

    function activate() {
      if (active) return;
      active = true;
      injectStyles();
      // ponytail: capture-phase document listeners + preventDefault cover click blocking; no overlay needed
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("mouseout", onMouseOut, true);
      document.addEventListener("click", onClick, true);
    }

    function deactivate() {
      if (!active) return;
      active = false;

      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseout", onMouseOut, true);
      document.removeEventListener("click", onClick, true);

      document
        .querySelectorAll(`.${HOVER_CLASS}`)
        .forEach((el) => el.classList.remove(HOVER_CLASS));
    }

    // ponytail: closest() only walks ancestors; Instagram wraps <img> in <a>, so target is the link.
    // composedPath gives the full event path — find the img anywhere in it.
    function findImg(e: Event): HTMLImageElement | null {
      for (const node of e.composedPath()) {
        if (node instanceof HTMLImageElement) return node;
      }
      return null;
    }

    function getImageSrc(img: HTMLImageElement): string | null {
      // ponytail: try src first, then data-src for lazy images
      let src = img.currentSrc || img.src;
      if (src && !src.startsWith("data:")) return src;
      src = img.getAttribute("data-src") || "";
      if (src && !src.startsWith("data:")) return src;
      return null;
    }

    function resolveUrl(url: string): string {
      try {
        return new URL(url, location.href).href;
      } catch {
        return url;
      }
    }

    // ponytail: MIME → ext; covers the formats browsers actually render. Add when needed.
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
    };
    const DEFAULT_EXT = "jpg";

    function extFromUrl(url: string): string | null {
      // ponytail: last path segment after stripping query/hash, must look like name.ext
      const m = url.match(/\/([^/?#]+)(?:\?|#|$)/);
      const tail = m?.[1] ?? "";
      const dot = tail.lastIndexOf(".");
      if (dot < 1 || dot === tail.length - 1) return null;
      const ext = tail.slice(dot + 1).toLowerCase();
      return /^[a-z0-9]{2,5}$/.test(ext) ? ext : null;
    }

    async function extFromHeaders(url: string): Promise<string> {
      try {
        const res = await fetch(url, { method: "HEAD" });
        const ct =
          res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ??
          "";
        return MIME_TO_EXT[ct] ?? DEFAULT_EXT;
      } catch {
        return DEFAULT_EXT;
      }
    }

    async function buildFilename(url: string, ext: string): Promise<string> {
      const m = url.match(/\/([^/?#]+)(?=\?|#|$)/);
      const tail = m?.[1] ?? "";
      const dot = tail.lastIndexOf(".");
      const hasName = dot > 0;
      if (hasName) {
        // ponytail: sanitize to avoid path separators in saved filename
        return tail.slice(0, dot).replace(/[\\/:*?"<>|]/g, "_") + "." + ext;
      }
      return `image-${Date.now()}.${ext}`;
    }

    function onMouseOver(e: MouseEvent) {
      const img = findImg(e);
      if (img && getImageSrc(img)) {
        hoveredImg = img;
        img.classList.add(HOVER_CLASS);
      }
    }

    function onMouseOut(e: MouseEvent) {
      const img = findImg(e);
      if (img) {
        img.classList.remove(HOVER_CLASS);
        if (hoveredImg === img) hoveredImg = null;
      }
    }

    async function onClick(e: MouseEvent) {
      const img = findImg(e);
      if (!img) return;

      const src = getImageSrc(img);
      if (!src) return;

      e.preventDefault();
      e.stopPropagation();
      deactivate();

      const url = resolveUrl(src);
      const ext = extFromUrl(url) ?? (await extFromHeaders(url));
      const filename = await buildFilename(url, ext);

      browser.runtime.sendMessage({ type: "download-image", url, filename });
    }
  },
});
