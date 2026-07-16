import html2canvas from 'html2canvas-pro';

/**
 * Rasterizes a DOM node to a downloadable PNG and triggers the browser's
 * save dialog. Shared by every "Download Card" button in the app.
 *
 * This used to go through html-to-image's toSvg() (DOM → SVG string with
 * the whole subtree embedded in a <foreignObject> → <img> → canvas). That
 * chain broke in several different, hard-to-predict ways for a card this
 * complex (verified live, at every step, by reading the raw captured SVG
 * string and sampling actual rendered canvas pixels — not by eyeballing
 * output, since every failure mode below looked completely fine in code):
 *
 * - toSvg()'s pixelRatio option doesn't enlarge the SVG's own dimensions
 *   for foreignObject captures, so naive upscale-via-drawImage crops to
 *   the corner (Chromium doesn't correctly stretch foreignObject content).
 * - The documented workaround for that (explicit width/height + a CSS
 *   `transform: scale()`) trades it for a worse bug: foreignObject
 *   rasterization clips to the element's PRE-transform layout box.
 * - Making the clone actually lay out at full resolution (real
 *   width/height, so this card's `cqw`-based typography — see
 *   invitation-card.tsx — recomputes correctly) fixed the crop, but some
 *   motion.div wrappers kept a stale pre-animation `opacity: 0` from
 *   Framer Motion's Web-Animations-API-driven entrance transitions,
 *   which cloneNode() copies verbatim even though the compositor shows
 *   the finished, fully-visible state.
 * - Even after fixing every one of those (confirmed correct in the raw
 *   SVG markup: right text, right 3x font sizes, right colors, opacity 1
 *   everywhere), the actual rasterized PNG still came out blank —
 *   Chromium's `<img>` decode for a large foreignObject-embedded SVG is a
 *   known, unresolved bug (the image's `onload` fires and reports correct
 *   dimensions, but the underlying bitmap decode that `drawImage` needs
 *   either never completes or hangs the draw call outright, depending on
 *   whether the image is attached to the DOM). No sequence of options
 *   fixed this because it isn't a configuration problem — it's Chromium
 *   failing to decode this category of image at all.
 *
 * html2canvas-pro sidesteps all of that by never producing an SVG or a
 * foreignObject in the first place — it walks the live, already-rendered
 * DOM directly and paints each element's background/border/text/image
 * onto the canvas itself. Slower and very slightly less pixel-perfect for
 * a handful of exotic CSS features than a "real" SVG capture would be,
 * but it actually works.
 */
export async function downloadElementAsImage(
  elementId: string, 
  filename: string,
  options?: { width?: number; height?: number }
): Promise<void> {
  const original = document.getElementById(elementId);
  if (!original) throw new Error(`Element #${elementId} not found`);

  // Default target dimensions to print-ready A5 size (1748 x 2480 pixels @ 300 DPI)
  const targetWidth = options?.width || 1748;
  const targetHeight = options?.height || 2480;

  // Clone into the real, live page (off-screen — the guest never sees
  // this) and resize the CLONE to the full export resolution there, so
  // its cqw-based typography recomputes against the browser's real
  // container-query engine before html2canvas ever reads it.
  const clone = original.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id'); // avoid a transient duplicate #invitation-print-card
  
  // Strip layout class constraints so the clone sizes freely to target A5 pixels
  clone.classList.remove('invitation-aspect');
  clone.style.position = 'fixed';
  clone.style.top = '0';
  clone.style.left = '-99999px';
  clone.style.margin = '0';
  clone.style.width = `${targetWidth}px`;
  clone.style.height = `${targetHeight}px`;
  clone.style.maxWidth = 'none';
  clone.style.maxHeight = 'none';
  clone.style.minWidth = '0';
  clone.style.minHeight = '0';
  clone.style.aspectRatio = 'auto';

  // Clear every cloned element's stale pre-animation opacity/transform —
  // Framer Motion's entrance animations are long finished by the time a
  // guest can click "Download", but they're driven by the Web Animations
  // API, which can leave the DOM's own style attribute holding the stale
  // pre-animation value even while the compositor shows the finished
  // result. cloneNode() only copies that stale attribute, so without
  // this the exported card comes out with every animated section
  // invisible.
  clone.querySelectorAll<HTMLElement>('*').forEach(el => {
    el.style.opacity = '';
    el.style.transform = '';
  });
  document.body.appendChild(clone);

  const rasterize = async () => {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: 1, // clone is already laid out at the target resolution
    });
    return canvas.toDataURL('image/png');
  };

  let dataUrl: string;
  try {
    // Belt-and-braces timeout — every step above has tested fast and
    // reliable, but this guarantees the button can never hang forever.
    dataUrl = await Promise.race([
      rasterize(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
    ]);
  } finally {
    clone.remove();
  }

  const a = document.createElement('a');
  a.download = filename;
  a.href = dataUrl;
  a.click();
}
