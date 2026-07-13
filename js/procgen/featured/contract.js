import { ResourceScope } from './resourceScope.js';

/* Normalize every dedicated featured renderer to one explicit lifecycle. The
   current adapters delegate to proven generic builders; future object-specific
   renderers can use the same contract without changing LandmarkView. */
export function createFeaturedExhibit(id, renderer, delegate){
  if (!id || !renderer) throw new TypeError('Featured exhibit requires id and renderer');
  if (!delegate || !delegate.group)
    throw new TypeError(id + ': featured builder must return a group');

  const scope = new ResourceScope('featured:' + id);
  if (typeof delegate.dispose === 'function')
    scope.defer(() => delegate.dispose());

  const group = delegate.group;
  group.userData.featuredExhibitId = id;
  group.userData.featuredRenderer = renderer;
  group.userData.featuredMoment = null;

  const exhibit = {
    ...delegate,
    group,
    renderer,
    update(dt, camera){
      if (!scope.disposed && typeof delegate.update === 'function')
        delegate.update(dt, camera);
    },
    setMoment(visual){
      if (scope.disposed || !visual) return;
      group.userData.featuredMoment = visual.state || visual.moment || null;
      if (typeof delegate.setMoment === 'function'){
        delegate.setMoment(visual);
      } else if (visual.wavelength && typeof delegate.setIR === 'function'){
        delegate.setIR(visual.wavelength === 'infrared');
      }
    },
    setIR(on){
      if (!scope.disposed && typeof delegate.setIR === 'function')
        delegate.setIR(on);
    },
    dispose(){ scope.dispose(); },
  };

  return exhibit;
}
