/* Async texture loader with cache + graceful failure. Planets build with a
   procedural canvas texture (instant, never a black screen), then swap in a
   real image once it arrives; if the fetch fails the procedural stays. */

import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map();

/* Free every cached real-imagery texture (the heavy 8K/PBR maps). Called when
   leaving a system so ~1 GB of Sol VRAM doesn't stay resident for the whole
   session; returning re-decodes from the browser's HTTP cache (no re-download).
   Procedural exoplanet worlds use canvas textures that never enter this cache. */
export function evictTextures(){
  for (const t of cache.values()) t.dispose();
  cache.clear();
}

export function loadTexture(path, onLoad, { srgb = true } = {}){
  const cached = cache.get(path);
  if (cached){ onLoad(cached); return; }
  loader.load(
    path,
    tex => {
      if (srgb && 'colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;                     // sharper at oblique/low-orbit angles
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      cache.set(path, tex);
      onLoad(tex);
    },
    undefined,
    () => { /* keep the procedural texture — never a black planet */ }
  );
}
