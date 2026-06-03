-- Reformat all slugs to the new scheme: {media_type}-{last8ofId}
-- Matches the upload route logic: `${mediaType}-${id.slice(-8).toLowerCase()}`
UPDATE photos SET slug = media_type || '-' || LOWER(SUBSTR(id, -8));
