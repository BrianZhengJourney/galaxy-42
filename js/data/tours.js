/* Authored tours: each step is a narration card plus an action performed
   with the app's own navigation API — tours are just choreographed use. */

export const TOURS = [
  {
    name: 'THE GRAND TOUR',
    desc: 'Sol system, inner worlds to the ice giants',
    steps: [
      { title: 'SOL SYSTEM', text: 'Eight worlds, one G-type star. Orbits run on real JPL ephemerides — the date readout is where the planets truly are. Time is running at ×20.',
        go: app => { app.goHome(); app.time.setRate(20); } },
      { title: 'MERCURY', text: 'A cratered iron world on the fastest, most eccentric inner orbit — one lap every 88 days. Watch it overtake everything else.',
        go: app => app.tourFocus('MERCURY') },
      { title: 'VENUS', text: 'Runaway greenhouse under permanent cloud. It rotates backwards, once every 243 days — longer than its year.',
        go: app => app.tourFocus('VENUS') },
      { title: 'EARTH', text: 'The reference world: 1 radius, 1 mass, 15 °C. The only orbit in the catalog with a confirmed biosphere.',
        go: app => app.tourFocus('EARTH') },
      { title: 'EARTH · LOW ORBIT', text: 'Dropping to low orbit. Terrain, ice caps and cloud decks are generated on the fly — every world in the galaxy can do this.',
        go: app => app.tourDescend('EARTH') },
      { title: 'MARS', text: 'Back up to the system frame. Mars runs a visibly eccentric orbit — perihelion summers in the south are short and hot.',
        go: app => app.tourFocus('MARS') },
      { title: 'JUPITER', text: 'More massive than every other planet combined. Four Galilean moons circle it here; the real count is 95.',
        go: app => app.tourFocus('JUPITER') },
      { title: 'SATURN', text: 'The rings span a quarter million kilometres but average just ten metres thick.',
        go: app => app.tourFocus('SATURN') },
      { title: 'NEPTUNE', text: 'One Neptune year is 165 Earth years. Since its discovery in 1846 it has completed a single orbit.',
        go: app => app.tourFocus('NEPTUNE') },
      { title: 'THE LONG VIEW', text: 'Full system at ×4 years per second. Inner planets blur; the ice giants barely creep. That speed ratio is real — 684:1, Mercury to Neptune.',
        go: app => { app.systemOverview(); app.time.setRate(1500); } }
    ]
  }
];
