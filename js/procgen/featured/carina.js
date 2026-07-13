/* Dedicated dispatch boundary for Carina. The renderer is temporarily backed
   by the proven photo-volume implementation; its public lifecycle is already
   the same one the object-specific Cosmic Cliffs renderer will implement. */

import { buildExhibit, buildImageVolume } from '../exhibits.js';

export function buildCarinaFeatured({ entry, image }){
  return image && image.file
    ? buildImageVolume(entry, image.file)
    : buildExhibit(entry);
}
