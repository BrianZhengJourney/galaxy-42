import { createFeaturedExhibit } from './contract.js';
import { buildPillarsFeatured } from './pillars.js';
import { buildCarinaFeatured } from './carina.js';
import { buildCrabFeatured } from './crab.js';
import { buildM87Featured } from './m87.js';
import { buildPaleBlueDotFeatured } from './paleBlueDot.js';

/* One stable dispatch point for the curated field stories. Keeping each entry
   in its own module lets the dedicated visuals evolve independently. */
const FEATURED_BUILDERS = new Map([
  ['pillars-of-creation', {
    renderer: 'pillars-hybrid', build: buildPillarsFeatured,
  }],
  ['carina-nebula', {
    renderer: 'carina-multi-state', build: buildCarinaFeatured,
  }],
  ['crab-nebula', {
    renderer: 'crab-observation-volume', build: buildCrabFeatured,
  }],
  ['m87-black-hole-image', {
    renderer: 'm87-observation-adapter', build: buildM87Featured,
  }],
  ['pale-blue-dot', {
    renderer: 'pale-blue-dot-observation-adapter', build: buildPaleBlueDotFeatured,
  }],
]);

export const FEATURED_EXHIBIT_IDS = Object.freeze([...FEATURED_BUILDERS.keys()]);

export function hasFeaturedExhibit(id){
  return FEATURED_BUILDERS.has(id);
}
/* Returns null for archive landmarks so callers can preserve the existing
   category/vizStyle fallback without another ID switch. */
export function buildFeaturedExhibit(context){
  const id = context && context.entry && context.entry.id;
  const record = FEATURED_BUILDERS.get(id);
  if (!record) return null;
  return createFeaturedExhibit(id, record.renderer, record.build(context));
}
