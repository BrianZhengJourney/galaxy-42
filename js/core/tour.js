/* Tour engine: steps advance manually (NEXT / END), each step runs a
   navigation action and shows a narration card. Any manual navigation
   mid-tour just becomes part of the tour — the engine holds no locks. */

function $(id){ return document.getElementById(id); }

export class TourEngine {
  constructor(app){
    this.app = app;
    this.tour = null;
    this.i = 0;
    $('tourNext').addEventListener('click', () => this.next());
    $('tourEnd').addEventListener('click', () => this.stop());
  }

  start(tour){
    this.tour = tour;
    this.i = -1;
    this.next();
  }

  next(){
    if (!this.tour) return;
    this.i++;
    if (this.i >= this.tour.steps.length) return this.stop();
    const step = this.tour.steps[this.i];
    try{ step.go(this.app); }catch(e){ console.error('tour step failed:', e); }
    $('tourTitle').textContent = step.title;
    $('tourText').textContent = step.text;
    $('tourProgress').textContent = (this.i + 1) + ' / ' + this.tour.steps.length;
    $('tourNext').textContent = this.i + 1 >= this.tour.steps.length ? 'FINISH' : 'NEXT ▸';
    $('tourCard').classList.add('show');
  }

  stop(){
    this.tour = null;
    $('tourCard').classList.remove('show');
  }

  get active(){ return !!this.tour; }
}
