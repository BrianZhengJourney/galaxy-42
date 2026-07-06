# Texture credits

## Solar System Scope pack — CC BY 4.0

Planet/Sun albedo, Earth night lights & clouds, and the Saturn ring are from the
**Solar System Scope** texture pack by INOVE, licensed **CC BY 4.0**.

- Source: https://www.solarsystemscope.com/textures/
- License: https://creativecommons.org/licenses/by/4.0/

`8k_earth_daymap.jpg`, `8k_earth_nightmap.jpg`, `8k_earth_clouds.jpg`,
`8k_mars.jpg`, `8k_jupiter.jpg`, `8k_saturn.jpg`, `8k_sun.jpg`,
`8k_saturn_ring_alpha.png`, `2k_mercury.jpg`, `2k_moon.jpg`,
`2k_venus_atmosphere.jpg`, `2k_uranus.jpg`, `2k_neptune.jpg`.

## three.js examples — MIT

Earth's tangent-space **normal map** and **ocean specular** mask:

- `earth_normal_2048.jpg`, `earth_specular_2048.jpg`
- Source: https://github.com/mrdoob/three.js (examples/textures/planets)

## NASA — public domain

Real lunar relief: **NASA SVS "CGI Moon Kit"** LDEM (merged LOLA + SELENE/Kaguya
elevation), 4 px/deg, converted from 16-bit TIFF to PNG for the browser.

- `moon_dem.png` (used as the Moon's bump/relief map)
- Source: https://svs.gsfc.nasa.gov/4720/

## Derived at runtime

Mercury and Mars relief is derived from the 8K/2K albedo luminance (Sobel) at
load time — no dedicated web-decodable elevation map is freely available for
them. Procedurally generated exoplanet worlds use runtime canvas textures only.
