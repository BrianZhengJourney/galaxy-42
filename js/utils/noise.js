/* Seeded 3D value noise + fBm for terrain displacement. Deterministic:
   the same planet always grows the same mountains. */

function latticeHash(x, y, z, seed){
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^
          Math.imul(z, 1274126177) ^ Math.imul(seed, 974711);
  n = Math.imul(n ^ (n >>> 13), 1103515245);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smooth(t){ return t * t * (3 - 2 * t); }

export function makeNoise3D(seed){
  function noise(px, py, pz){
    const x0 = Math.floor(px), y0 = Math.floor(py), z0 = Math.floor(pz);
    const fx = smooth(px - x0), fy = smooth(py - y0), fz = smooth(pz - z0);
    let v = 0;
    for (let dx = 0; dx <= 1; dx++)
      for (let dy = 0; dy <= 1; dy++)
        for (let dz = 0; dz <= 1; dz++){
          const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
          v += w * latticeHash(x0 + dx, y0 + dy, z0 + dz, seed);
        }
    return v;
  }
  /* fractal Brownian motion, 0..1-ish */
  return function fbm(x, y, z, octaves = 4){
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++){
      sum += amp * noise(x * freq + o * 19.7, y * freq + o * 7.3, z * freq + o * 31.1);
      norm += amp;
      amp *= 0.5; freq *= 2.05;
    }
    return sum / norm;
  };
}
