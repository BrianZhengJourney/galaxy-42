/* Real imagery + PBR maps for the Sol system (files under textures/).
   Resolution follows the device tier (see core/quality.js): 'high' loads 8K
   albedo/night/clouds, 'low' loads 2K — so phones and weak GPUs download and
   hold a fraction of the bytes/VRAM. Normal/specular/ring/DEM are already
   small and shared by both tiers.

   Albedo/night/clouds/ring: Solar System Scope, CC BY 4.0.
   Earth normal + ocean specular: three.js examples, MIT.
   Moon relief: NASA SVS "CGI Moon Kit" LDEM (LOLA/Kaguya), public domain.
   Mercury/Mars relief is derived at load from the albedo luminance.
   Missing files degrade to the procedural texture (utils/assets.js).

   Per-body keys: map · night · clouds · normal(+normalScale) · bump(+bumpScale)
   · deriveBump · specular · ring · atmosphere(+atmoStrength+atmoScale). */

import { TEX_TIER } from '../core/quality.js';

const T = 'textures/';
const hi = TEX_TIER === 'high';
const res = name => T + (hi ? '8k_' : '2k_') + name + '.jpg';   // tiered albedo

export const PLANET_TEXTURES = {
  MERCURY: { map: T + '2k_mercury.jpg', deriveBump: 2.8 },      // only 2K published
  VENUS:   { map: T + '2k_venus_atmosphere.jpg',
             atmosphere: '#f0d69a', atmoStrength: 1.7, atmoScale: 1.10 },
  EARTH:   { map: res('earth_daymap'),
             night: res('earth_nightmap'),
             clouds: res('earth_clouds'),
             normal: T + 'earth_normal_2048.jpg', normalScale: 1.4,
             specular: T + 'earth_specular_2048.jpg',
             atmosphere: '#6db8ff', atmoStrength: 1.15, atmoScale: 1.06 },
  MARS:    { map: res('mars'), deriveBump: 2.2,
             atmosphere: '#e6a06a', atmoStrength: 0.5, atmoScale: 1.05 },
  JUPITER: { map: res('jupiter'),
             atmosphere: '#d8c49a', atmoStrength: 0.55, atmoScale: 1.03 },
  SATURN:  { map: res('saturn'), ring: T + '8k_saturn_ring_alpha.png',
             atmosphere: '#e6d8b0', atmoStrength: 0.5, atmoScale: 1.03 },
  URANUS:  { map: T + '2k_uranus.jpg',                          // only 2K published
             atmosphere: '#a8e0e8', atmoStrength: 0.6, atmoScale: 1.05 },
  NEPTUNE: { map: T + '2k_neptune.jpg',
             atmosphere: '#6f9be8', atmoStrength: 0.6, atmoScale: 1.05 }
};

export const MOON_TEXTURE = T + '2k_moon.jpg';
export const MOON_BUMP    = T + 'moon_dem.png';   // real LOLA/Kaguya elevation
export const SUN_TEXTURE  = res('sun');

/* the Moon as a descendable body: albedo + strong real-elevation relief */
export const MOON_SURFACE = { map: MOON_TEXTURE, bump: MOON_BUMP, bumpScale: 0.32 };
