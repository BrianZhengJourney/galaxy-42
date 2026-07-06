/* Canvas image processing for planet relief.
   deriveNormalMap: Sobel-filters an albedo/height image into a tangent-space
   normal map — gives cratered bodies real terminator relief when no dedicated
   elevation map is available. invertToRoughness: turns an ocean-specular mask
   (white seas) into a roughness map (smooth seas, matte land). */

import * as THREE from 'three';

function drawScaled(image, maxW){
  const w = Math.min(image.width || maxW, maxW);
  const h = Math.min(image.height || maxW / 2, maxW / 2);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0, w, h);
  return { c, g, w, h };
}

export function deriveNormalMap(image, strength = 2.2, maxW = 2048){
  const { c, g, w, h } = drawScaled(image, maxW);
  const src = g.getImageData(0, 0, w, h).data;
  const out = g.createImageData(w, h);
  const o = out.data;
  const lum = (x, y) => {
    x = (x + w) % w;                                    // wrap longitude
    y = Math.max(0, Math.min(h - 1, y));                // clamp latitude
    const i = (y * w + x) * 4;
    return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
  };
  for (let y = 0; y < h; y++){
    for (let x = 0; x < w; x++){
      const dx = (lum(x - 1, y) - lum(x + 1, y)) * strength;
      const dy = (lum(x, y - 1) - lum(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      o[i]     = (dx / len * 0.5 + 0.5) * 255;
      o[i + 1] = (dy / len * 0.5 + 0.5) * 255;
      o[i + 2] = (1 / len * 0.5 + 0.5) * 255;
      o[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

export function invertToRoughness(image, maxW = 2048){
  const { c, g, w, h } = drawScaled(image, maxW);
  const d = g.getImageData(0, 0, w, h);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4){
    // white (ocean) → 0 roughness (glossy); black (land) → high roughness
    const inv = 255 - (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114);
    p[i] = p[i + 1] = p[i + 2] = inv; p[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
