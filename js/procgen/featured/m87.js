/* Dedicated dispatch boundary for M87*. The observation remains a truthful
   flat data product until the scientific 3D explainer replaces this adapter. */

import { buildExhibit, buildImagePlate } from '../exhibits.js';

export function buildM87Featured({ entry, image }){
  return image && image.file
    ? buildImagePlate(entry, image.file)
    : buildExhibit(entry);
}
