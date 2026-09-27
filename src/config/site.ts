export const site = {
  name: "MATAEV",
  meta: "Photography — NO",
  links: {
    portfolio: "https://mataev.no",
    github: "https://github.com/Blal95",
    email: "bilal@mataev.no",
  },
} as const

export const PAGE_SIZE = 24

// CARTO raster basemap. The key is public by design (it ships in every tile
// request); without it CARTO serves "API key required" watermark tiles.
export const MAP_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_4033_1_2ca6d9cecd1ec7e0c8ca2e01"
