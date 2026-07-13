/* Dedicated dispatch boundary for the Crab Nebula. A filament-shell renderer
   can replace this adapter without touching scene routing or story controls. */

import { buildExhibit, buildImageVolume } from '../exhibits.js';

export function buildCrabFeatured({ entry, image }){
  return image && image.file
    ? buildImageVolume(entry, image.file)
    : buildExhibit(entry);
}
