/* Dedicated dispatch boundary for the Pale Blue Dot. Keeping the source image
   flat avoids inventing photographic depth while the Voyager context scene is
   developed behind this stable contract. */

import { buildExhibit, buildImagePlate } from '../exhibits.js';

export function buildPaleBlueDotFeatured({ entry, image }){
  return image && image.file
    ? buildImagePlate(entry, image.file)
    : buildExhibit(entry);
}
