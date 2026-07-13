/* Visual epochs for the Solar System exhibit.
   These states change appearance only; the live orbital clock remains separate.
   Ancient surfaces and ring systems are reconstructions, not observations. */

export const DEFAULT_SOL_EPOCH = 'present';

export const SOL_BODY_NAMES = Object.freeze([
  'MERCURY',
  'VENUS',
  'EARTH',
  'MARS',
  'JUPITER',
  'SATURN',
  'URANUS',
  'NEPTUNE',
]);

const PRESENT_BODY_APPEARANCE = {
  MERCURY: {
    surface: 'present', nightStrength: 0, cloudOpacity: 0,
    atmosphereStrength: 0, atmosphereColor: '#000000',
    ringVisible: false, ringOpacity: 0, ringUncertain: false,
  },
  VENUS: {
    surface: 'present', nightStrength: 0, cloudOpacity: 1,
    atmosphereStrength: 1, atmosphereColor: '#f4cf83',
    ringVisible: false, ringOpacity: 0, ringUncertain: false,
  },
  EARTH: {
    surface: 'present', nightStrength: 1, cloudOpacity: .72,
    atmosphereStrength: 1, atmosphereColor: '#6ca9ff',
    ringVisible: false, ringOpacity: 0, ringUncertain: false,
  },
  MARS: {
    surface: 'present', nightStrength: 0, cloudOpacity: .05,
    atmosphereStrength: .16, atmosphereColor: '#d88557',
    ringVisible: false, ringOpacity: 0, ringUncertain: false,
  },
  JUPITER: {
    surface: 'present', nightStrength: 0, cloudOpacity: 1,
    atmosphereStrength: .42, atmosphereColor: '#d8b98e',
    ringVisible: true, ringOpacity: .10, ringUncertain: false,
  },
  SATURN: {
    surface: 'present', nightStrength: 0, cloudOpacity: 1,
    atmosphereStrength: .38, atmosphereColor: '#ead49f',
    ringVisible: true, ringOpacity: .90, ringUncertain: false,
  },
  URANUS: {
    surface: 'present', nightStrength: 0, cloudOpacity: .90,
    atmosphereStrength: .42, atmosphereColor: '#a9e1e5',
    ringVisible: true, ringOpacity: .34, ringUncertain: false,
  },
  NEPTUNE: {
    surface: 'present', nightStrength: 0, cloudOpacity: .92,
    atmosphereStrength: .46, atmosphereColor: '#5878e0',
    ringVisible: true, ringOpacity: .23, ringUncertain: false,
  },
};

function completeBodies(overrides = {}) {
  return Object.fromEntries(SOL_BODY_NAMES.map((name) => [
    name,
    { ...PRESENT_BODY_APPEARANCE[name], ...(overrides[name] || {}) },
  ]));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const SOL_EPOCHS = deepFreeze([
  {
    id: '1000ma',
    label: '1.0 GA',
    ageMa: 1000,
    date: 'ABOUT 1 BILLION YEARS AGO',
    kind: 'SCHEMATIC RECONSTRUCTION',
    phase: 'MODEL · PHASE UNKNOWN',
    title: 'RODINIA UNDER A YOUNGER SUN',
    text: 'Earth gathers much of its land into Rodinia. The Sun is dimmer, cities do not exist, and the asteroid belt is already ancient.',
    legend: 'PULSING AMBER RINGS = UNKNOWN HISTORY',
    evidence: 'This artist-built schematic is inspired by published full-plate models; it does not ingest their GIS data, and Rodinia coastlines remain uncertain.',
    caveat: 'Exact orbital phases are unknowable at 1 Ga, so the separate live orbit clock is not a deep-time snapshot. Jupiter weather is re-seeded; ghosted rings show uncertainty, not known absence.',
    source: 'https://doi.org/10.1016/j.earscirev.2020.103477',
    sourceLabel: 'EARTH MAP SOURCE',
    star: { luminosityScale: .92 },
    belt: { visible: true, opacity: .75 },
    bodies: completeBodies({
      EARTH: {
        surface: 'rodinia', nightStrength: 0, cloudOpacity: .58,
        atmosphereStrength: .74, atmosphereColor: '#75a9d8',
      },
      JUPITER: {
        surface: 'modeled-weather', ringVisible: true,
        ringOpacity: .06, ringUncertain: true,
      },
      SATURN: { ringVisible: true, ringOpacity: .18, ringUncertain: true },
      URANUS: { ringVisible: true, ringOpacity: .16, ringUncertain: true },
      NEPTUNE: { ringVisible: true, ringOpacity: .11, ringUncertain: true },
    }),
  },
  {
    id: '5ma',
    label: '5 MA',
    ageMa: 5,
    date: 'ABOUT 5 MILLION YEARS AGO',
    kind: 'SCHEMATIC RECONSTRUCTION',
    phase: 'MODEL · PHASE NOT SHOWN',
    title: 'A PLIOCENE EARTH',
    text: 'The continents are close to their modern positions, but Earth is warmer and still entirely dark on the artificial-light layer.',
    legend: 'PULSING AMBER RINGS = MODEL UNCERTAINTY',
    evidence: 'This artist-built schematic is inspired by PaleoDEM research rather than derived from its raster; exact coastlines and vegetation remain model-dependent.',
    caveat: 'The asteroid belt remains visible. The live orbit clock is not a 5 Ma integration; Jupiter weather is re-seeded and historical ring detail is reconstructed.',
    source: 'https://doi.org/10.5281/zenodo.5460860',
    sourceLabel: 'EARTH MAP SOURCE',
    star: { luminosityScale: .9996 },
    belt: { visible: true, opacity: .75 },
    bodies: completeBodies({
      EARTH: {
        surface: 'pliocene', nightStrength: 0, cloudOpacity: .68,
        atmosphereStrength: .96, atmosphereColor: '#70adff',
      },
      JUPITER: {
        surface: 'modeled-weather', ringVisible: true,
        ringOpacity: .08, ringUncertain: true,
      },
      SATURN: { ringVisible: true, ringOpacity: .90, ringUncertain: false },
      URANUS: { ringVisible: true, ringOpacity: .28, ringUncertain: true },
      NEPTUNE: { ringVisible: true, ringOpacity: .18, ringUncertain: true },
    }),
  },
  {
    id: 'present',
    label: 'NOW',
    ageMa: 0,
    date: 'PRESENT DAY',
    kind: 'OBSERVATION',
    phase: 'OBSERVED · JPL ORBITS',
    title: 'THE SOLAR SYSTEM NOW',
    text: 'Modern surface maps, Earth city lights and the observed ring systems return together.',
    legend: 'RINGS = PRESENT-DAY OBSERVATIONS',
    evidence: 'Spacecraft and telescopes directly constrain the present surfaces, atmosphere, rings and asteroid-belt population represented here.',
    caveat: 'Sizes and distances remain compressed for navigation; this state changes appearance, not the live orbital clock.',
    source: 'https://science.nasa.gov/solar-system/',
    sourceLabel: 'SOLAR SYSTEM SOURCE',
    star: { luminosityScale: 1 },
    belt: { visible: true, opacity: .75 },
    bodies: completeBodies(),
  },
]);

const SOL_EPOCH_BY_ID = new Map(SOL_EPOCHS.map((epoch) => [epoch.id, epoch]));

export function resolveSolEpoch(id = DEFAULT_SOL_EPOCH) {
  const key = typeof id === 'string' ? id.toLowerCase() : DEFAULT_SOL_EPOCH;
  return SOL_EPOCH_BY_ID.get(key) || SOL_EPOCH_BY_ID.get(DEFAULT_SOL_EPOCH);
}
