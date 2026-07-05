/* Async texture loader with cache + graceful failure. Planets build with a
   procedural canvas texture (instant, never a black screen), then swap in a
   real image once it arrives; if the fetch fails the procedural stays. */

import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const cache = new Map();

export function loadTexture(path, onLoad, { srgb = true } = {}){
  const cached = cache.get(path);
  if (cached){ onLoad(cached); return; }
  loader.load(
    path,
    tex => {
      if (srgb && 'colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      cache.set(path, tex);
      onLoad(tex);
    },
    undefined,
    () => { /* keep the procedural texture — never a black planet */ }
  );
}
