/* Captain's log: which systems this pilot has actually visited.
   Persisted in localStorage, so discovery survives reloads — the fog of
   war lifts once per star, permanently. */

const KEY = 'fable-galaxy-journal-v1';

export class Journal {
  constructor(){
    this.data = {};
    try{
      this.data = JSON.parse(localStorage.getItem(KEY) || '{}');
    }catch(e){ this.data = {}; }
  }

  markVisited(name, simDate){
    const rec = this.data[name] || { visits: 0, first: simDate };
    rec.visits += 1;
    rec.last = simDate;
    this.data[name] = rec;
    try{ localStorage.setItem(KEY, JSON.stringify(this.data)); }catch(e){ /* private mode */ }
  }

  isVisited(name){ return !!this.data[name]; }
  visitCount(name){ return this.data[name] ? this.data[name].visits : 0; }
  surveyed(){ return Object.keys(this.data).length; }
}
