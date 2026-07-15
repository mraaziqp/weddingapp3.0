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
 */
export async function downloadElementAsImage(elementId: string, filename: string): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) throw new Error(`Element #${elementId} not found`);

  const rect = node.getBoundingClientRect();
  const pixelRatio = 3; // ≈300dpi at the card's on-screen size — sharp
  // enough to print, small enough to share over WhatsApp/email.

  const rasterize = async () => {
    const svgDataUrl = await toSvg(node, { pixelRatio, skipFonts: true, cacheBust: true });
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = rect.width * pixelRatio;
        canvas.height = rect.height * pixelRatio;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('no canvas context')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
