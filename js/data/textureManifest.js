/* Real imagery for the Sol system — maps body → texture files under textures/.
   Images: Solar System Scope texture pack, CC BY 4.0
   (https://www.solarsystemscope.com/textures). Procedural exoplanets don't
   appear here; they keep their generated surfaces. Missing files degrade
   gracefully to the procedural texture (see utils/assets.js). */

const T = 'textures/';

export const PLANET_TEXTURES = {
  MERCURY: { map: T + '2k_mercury.jpg' },
  VENUS:   { map: T + '2k_venus_atmosphere.jpg' },
  EARTH:   { map: T + '2k_earth_daymap.jpg', clouds: T + '2k_earth_clouds.jpg' },
  MARS:    { map: T + '2k_mars.jpg' },
  JUPITER: { map: T + '2k_jupiter.jpg' },
  SATURN:  { map: T + '2k_saturn.jpg', ring: T + '2k_saturn_ring_alpha.png' },
  URANUS:  { map: T + '2k_uranus.jpg' },
  NEPTUNE: { map: T + '2k_neptune.jpg' }
};

export const MOON_TEXTURE = T + '2k_moon.jpg';
export const SUN_TEXTURE  = T + '2k_sun.jpg';
