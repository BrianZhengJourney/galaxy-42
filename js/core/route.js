/* Hash routing kept dependency-free so old links and geological-epoch links
   can be regression-tested without a browser. */

export function parseAtlasHash(hash = ''){
  const raw = String(hash).replace(/^#/, '');
  const q = raw.indexOf('?');
  const path = (q < 0 ? raw : raw.slice(0, q)).replace(/^\/+/, '');
  const params = new URLSearchParams(q < 0 ? '' : raw.slice(q + 1));
  const parts = path.split('/').filter(Boolean);
  const t = params.get('t');
  const parsedTime = t == null ? undefined : Number(t);

  if (parts[0] === 'landmark')
    return { type: 'landmark', landmarkId: parts[1] || '', params };
  if (!parts.length || parts[0] === 'galaxy')
    return { type: 'galaxy', params };
  return {
    type: 'system',
    starSlug: parts[0],
    bodySlug: parts[1] || null,
    view: parts[2] === 'orbit' || parts[2] === 'sky' ? parts[2] : null,
    simDays: Number.isFinite(parsedTime) ? parsedTime : undefined,
    epoch: params.get('epoch') || null,
    params,
  };
}
