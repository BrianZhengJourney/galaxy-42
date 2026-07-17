/* Editorial navigation for the public Explore collection. The generated
   landmark catalog remains the complete research archive; this file defines
   the smaller set whose interactive renderers meet the current fidelity bar. */

function card(id, badges, imagePosition = 'center'){
  return Object.freeze({
    id, kind: 'landmark', badges: Object.freeze([...badges]), imagePosition,
  });
}

function system(id, target, name, designation, badges, coverFile){
  return Object.freeze({
    id,
    kind: 'system',
    target,
    name,
    designation,
    badges: Object.freeze([...badges]),
    coverFile,
  });
}

function section(id, label, kicker, intro, color, items){
  return Object.freeze({
    id, label, kicker, intro, color,
    items: Object.freeze(items),
  });
}

export const EXPLORE_SECTIONS = Object.freeze([
  section(
    'world-systems',
    'WORLD SYSTEMS',
    'PLANETS NEAR & FAR',
    'Drop into real planetary systems—from our eight-world home to compact red-dwarf families, a pulsar’s survivor worlds, and the first hot Jupiter.',
    '#79e6c4',
    [
      system('system-sol', 'SOL', 'SOL', '8 PLANETS · OUR HOME SYSTEM',
        ['LIVE ORBITS', 'WORLDS THROUGH TIME'], 'images/systems/sol.png'),
      system('system-trappist-1', 'TRAPPIST-1', 'TRAPPIST-1', '7 EARTH-SIZED WORLDS',
        ['CONFIRMED SYSTEM', 'TRANSIT PHOTOMETER'], 'images/systems/trappist-1.png'),
      system('system-proxima-centauri', 'PROXIMA CENTAURI', 'PROXIMA CENTAURI', '2 CONFIRMED WORLDS · 4.24 LY',
        ['CLOSEST STAR', 'CONFIRMED SYSTEM'], 'images/systems/proxima-centauri.png'),
      system('system-kepler-186', 'KEPLER-186', 'KEPLER-186', '5 KNOWN WORLDS · KEPLER-186 f',
        ['CONFIRMED SYSTEM', 'EARTH-SIZE OUTER WORLD'], 'images/systems/kepler-186.png'),
      system('system-psr-b1257-12', 'PSR B1257+12', 'PSR B1257+12', '3 WORLDS AROUND A PULSAR',
        ['FIRST EXOPLANETS', 'PULSAR SYSTEM'], 'images/systems/psr-b1257-12.png'),
      system('system-51-pegasi', '51 PEGASI', '51 PEGASI', '51 PEGASI b · 4.23-DAY ORBIT',
        ['FIRST SUN-LIKE HOST', 'HOT JUPITER'], 'images/systems/51-pegasi.png'),
    ],
  ),
  section(
    'nebulae',
    'NEBULAE',
    'STAR BIRTH & STELLAR REMAINS',
    'Enter sculpted clouds, shells, dust lanes and ionization fronts reconstructed from landmark observations.',
    '#d47bf0',
    [
      card('pillars-of-creation', ['3D MODEL', 'TIMELINE']),
      card('orion-nebula', ['3D MODEL', 'OBSERVATION']),
      card('carina-nebula', ['3D MODEL', 'TIMELINE']),
      card('horsehead-nebula', ['3D MODEL', 'OBSERVATION']),
      card('ring-nebula', ['3D MODEL', 'OBSERVATION']),
      card('helix-nebula', ['3D MODEL', 'OBSERVATION']),
      card('lagoon-nebula', ['3D MODEL', 'OBSERVATION']),
      card('cats-eye-nebula', ['3D MODEL', 'OBSERVATION']),
      card('trifid-nebula', ['3D MODEL', 'OBSERVATION']),
    ],
  ),
  section(
    'black-holes',
    'BLACK HOLES',
    'RELATIVISTIC ENGINES',
    'Compare four physically distinct systems through lensing, accretion, stellar orbits, jets and spacetime waves.',
    '#ffd27a',
    [
      card('cygnus-x-1', ['3D MODEL', 'BINARY SYSTEM']),
      card('sagittarius-a-star', ['3D MODEL', 'STELLAR ORBITS']),
      card('m87-star', ['3D MODEL', 'RELATIVISTIC JET']),
      card('gw150914', ['3D MODEL', 'MERGER']),
    ],
  ),
  section(
    'remnants',
    'SUPERNOVAE & REMNANTS',
    'AFTER THE EXPLOSION',
    'Trace expanding shock fronts and the compact stellar engines left behind after massive stars die.',
    '#ff8a68',
    [
      card('crab-nebula-sn-1054', ['3D MODEL', 'TIMELINE']),
      card('sn-1987a', ['3D MODEL', 'OBSERVATION']),
      card('cassiopeia-a', ['3D MODEL', 'OBSERVATION']),
      card('veil-nebula', ['3D MODEL', 'OBSERVATION']),
    ],
  ),
  section(
    'missions',
    'DISCOVERIES & MISSIONS',
    'HOW WE CAME TO KNOW',
    'Follow an observation whose scale changed humanity’s view of its place in the cosmos.',
    '#71ddff',
    [
      card('pale-blue-dot', ['MISSION', 'TIMELINE'], '62% center'),
    ],
  ),
]);

export const EXPLORE_LANDMARK_IDS = Object.freeze(
  EXPLORE_SECTIONS.flatMap(sectionRecord => sectionRecord.items)
    .filter(item => item.kind === 'landmark')
    .map(item => item.id),
);

export const EXPLORE_SYSTEM_TARGETS = Object.freeze(
  EXPLORE_SECTIONS.flatMap(sectionRecord => sectionRecord.items)
    .filter(item => item.kind === 'system')
    .map(item => item.target),
);
