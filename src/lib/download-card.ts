import { toSvg } from 'html-to-image';

/**
 * Rasterizes a DOM node to a downloadable PNG and triggers the browser's
 * save dialog. Shared by every "Download Card" button in the app.
 *
 * html-to-image's toPng()/toCanvas() hang indefinitely on cards like ours:
 * their createImage() helper calls HTMLImageElement.decode() on the
 * generated SVG, and decode() never resolves for SVGs built from
 * foreignObject-embedded HTML (a known Chromium quirk) — verified by
 * isolating each internal step. toSvg() itself works fine and fast, so we
 * take the SVG it produces and do the image-load + canvas-draw ourselves
 * with a plain onload handler instead of decode().
 *
 * The naive version of that (draw the natural-size SVG image stretched
 * into a larger canvas via drawImage's dWidth/dHeight) looks fine in code
 * but silently crops on real output: toSvg()'s `pixelRatio` option does
 * NOT enlarge the SVG's own declared width/height for foreignObject-based
 * captures like this one (verified live — it stayed at the node's native
 * 1x size), and Chromium's drawImage does not correctly upscale
 * foreignObject-embedded HTML when asked to stretch it into a bigger
 * destination rect — it paints the content at native size in the corner
 * and leaves the rest of the canvas blank. The fix is to never ask
 * drawImage to scale at all: make the captured SVG's own dimensions
 * already match the target resolution, using html-to-image's documented
 * high-DPI pattern (explicit width/height + a CSS transform: scale() on
 * the cloned root so its *layout* — and therefore the foreignObject
 * content — is actually produced at that size).
 */
export async function downloadElementAsImage(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element #${elementId} not found`);

  const rect = node.getBoundingClientRect();
  const pixelRatio = 3; // ≈300dpi at the card's on-screen size — sharp
  // enough to print, small enough to share over WhatsApp/email.
  const targetWidth = Math.round(rect.width * pixelRatio);
  const targetHeight = Math.round(rect.height * pixelRatio);

  const rasterize = async () => {
    const svgDataUrl = await toSvg(node, {
      width: targetWidth,
      height: targetHeight,
      style: {
        transform: `scale(${pixelRatio})`,
        transformOrigin: 'top left',
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      },
      skipFonts: true,
      cacheBust: true,
    });
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // The source image is now already targetWidth×targetHeight, so
        // this is a plain 1:1 copy — no scaling for drawImage to botch.
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no canvas context')); return; }
        // A solid white backing first: mix-blend-mode layers (the corner
        // flower overlays) can rasterize with soft partial alpha at their
        // edges instead of full opacity, which would otherwise show as a
        // faint see-through patch when opened outside a pure-white viewer.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('SVG failed to rasterize'));
      img.src = svgDataUrl;
    });
  };

  // Belt-and-braces timeout — every step above has tested fast and
  // reliable, but this guarantees the button can never hang forever.
  const dataUrl = await Promise.race([
    rasterize(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
  ]);

  const a = document.createElement('a');
  a.download = filename;
  a.href = dataUrl;
  a.click();
}
