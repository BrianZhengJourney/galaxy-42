/* Real imagery + PBR maps for the Sol system (files under textures/).
   Albedo/night/clouds/ring: Solar System Scope pack, CC BY 4.0.
   Earth normal + ocean specular: three.js examples, MIT.
   Moon relief: NASA SVS "CGI Moon Kit" LDEM (LOLA/Kaguya), public domain.
   Mercury/Mars relief is derived at load from the 8K albedo luminance
   (no web-decodable DEM is freely available for them). See textures/CREDITS.md.

   Per-body keys:
     map         base albedo (required)
     night       city-lights emissive, gated to the dark side by sun direction
     clouds      translucent cloud sphere
     normal      tangent-space normal map (relief)  · normalScale
     bump        grayscale height map               · bumpScale
     deriveBump  derive a normal map from albedo luminance (strength)
     specular    ocean mask → inverted to a roughness map
     ring        Saturn ring strip (alpha)
     atmosphere  limb-glow colour · atmoStrength · atmoScale
   Missing files degrade to the procedural texture (utils/assets.js). */

const T = 'textures/';

export const PLANET_TEXTURES = {
  MERCURY: { map: T + '2k_mercury.jpg', deriveBump: 2.8 },
  VENUS:   { map: T + '2k_venus_atmosphere.jpg',
             atmosphere: '#f0d69a', atmoStrength: 1.7, atmoScale: 1.10 },
  EARTH:   { map: T + '8k_earth_daymap.jpg',
             night: T + '8k_earth_nightmap.jpg',
             clouds: T + '8k_earth_clouds.jpg',
             normal: T + 'earth_normal_2048.jpg', normalScale: 1.4,
             specular: T + 'earth_specular_2048.jpg',
             atmosphere: '#6db8ff', atmoStrength: 1.15, atmoScale: 1.06 },
  MARS:    { map: T + '8k_mars.jpg', deriveBump: 2.2,
             atmosphere: '#e6a06a', atmoStrength: 0.5, atmoScale: 1.05 },
  JUPITER: { map: T + '8k_jupiter.jpg',
             atmosphere: '#d8c49a', atmoStrength: 0.55, atmoScale: 1.03 },
  SATURN:  { map: T + '8k_saturn.jpg', ring: T + '8k_saturn_ring_alpha.png',
             atmosphere: '#e6d8b0', atmoStrength: 0.5, atmoScale: 1.03 },
  URANUS:  { map: T + '2k_uranus.jpg',
             atmosphere: '#a8e0e8', atmoStrength: 0.6, atmoScale: 1.05 },
  NEPTUNE: { map: T + '2k_neptune.jpg',
             atmosphere: '#6f9be8', atmoStrength: 0.6, atmoScale: 1.05 }
};

export const MOON_TEXTURE = T + '2k_moon.jpg';
export const MOON_BUMP    = T + 'moon_dem.png';   // real LOLA/Kaguya elevation
export const SUN_TEXTURE  = T + '8k_sun.jpg';
