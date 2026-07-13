/* Dedicated adapter around the existing high-fidelity Pillars renderer. This
   preserves its exact visual path while moving dispatch behind the featured
   exhibit registry. */

import { buildPillarsOfCreation } from '../pillars.js';

export function buildPillarsFeatured({ entry, image }){
  if (!image || !image.file)
    throw new Error(entry.id + ': visible observation image is required');
  return buildPillarsOfCreation(entry, image.file);
}
