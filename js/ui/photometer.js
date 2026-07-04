/* Photometer: a live transit light curve along the current line of sight.
   Flux = 1 − Σ (Rp/Rs)² for every planet crossing the stellar disc between
   the camera and the star — align a system edge-on and you watch the dips
   that revealed TRAPPIST-1's worlds. What you see is what it plots. */

const N_SAMPLES = 300;

export class Photometer {
  constructor(){
    this.canvas = document.getElementById('photoCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.readout = document.getElementById('photoReadout');
    this.samples = new Float32Array(N_SAMPLES).fill(1);
    this.head = 0;
    this.transiting = '';
  }

  reset(){ this.samples.fill(1); this.head = 0; }

  /* camera at c looking toward the star at the origin */
  sample(camera, star, planets){
    const c = camera.position;
    const clen = c.length();
    const Rs = star.cfg.coreRadius;
    let flux = 1;
    this.transiting = '';
    for (const p of planets){
      const r = p.group.position;
      // component of (r − c) along the sightline s = −c/|c|
      const t = -(r.x - c.x) * c.x / clen - (r.y - c.y) * c.y / clen - (r.z - c.z) * c.z / clen;
      if (t <= 0 || t >= clen) continue;               // not between camera and star
      // perpendicular distance from the sightline
      const fx = (r.x - c.x) + t * c.x / clen;
      const fy = (r.y - c.y) + t * c.y / clen;
      const fz = (r.z - c.z) + t * c.z / clen;
      const perp = Math.sqrt(fx * fx + fy * fy + fz * fz);
      if (perp >= Rs + p.r) continue;
      const depth = Math.min(1, (p.r * p.r) / (Rs * Rs));
      const graze = perp <= Rs - p.r ? 1
        : (Rs + p.r - perp) / (2 * p.r);               // linear ingress/egress
      flux -= depth * Math.max(0, Math.min(1, graze));
      this.transiting = this.transiting ? this.transiting + ' +' : p.name;
    }
    flux = Math.max(0, flux);
    this.samples[this.head] = flux;
    this.head = (this.head + 1) % N_SAMPLES;
    this._draw(flux);
  }

  _draw(current){
    const g = this.ctx, w = this.canvas.width, h = this.canvas.height;
    g.clearRect(0, 0, w, h);
    // find the window's min flux so dips auto-scale (never flatter than 2%)
    let mn = 1;
    for (let i = 0; i < N_SAMPLES; i++) mn = Math.min(mn, this.samples[i]);
    const span = Math.max(0.02, (1 - mn) * 1.25);
    const yOf = f => 6 + (1 - (f - (1 - span)) / span) * (h - 14);

    g.strokeStyle = 'rgba(98,230,255,0.15)';
    g.beginPath(); g.moveTo(0, yOf(1)); g.lineTo(w, yOf(1)); g.stroke();

    g.strokeStyle = current < 0.9995 ? '#ffb45e' : '#62e6ff';
    g.lineWidth = 1.2;
    g.beginPath();
    for (let i = 0; i < N_SAMPLES; i++){
      const f = this.samples[(this.head + i) % N_SAMPLES];
      const x = (i / (N_SAMPLES - 1)) * w, y = yOf(f);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();

    this.readout.textContent = this.transiting
      ? 'TRANSIT · ' + this.transiting + ' · ' + (current * 100).toFixed(2) + '%'
      : 'FLUX ' + (current * 100).toFixed(2) + '%';
    this.readout.style.color = this.transiting ? '#ffb45e' : 'rgba(207,238,247,.55)';
  }
}
