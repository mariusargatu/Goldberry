/**
 * Placeholder product illustrations, rendered as SVG data URIs so the mock
 * catalog needs no image files and works offline. One flat figure per piece,
 * drawn on a 400 × 400 stage that stands everything on the same shadow.
 */

type Figure = 'kaiju' | 'ghost' | 'oni' | 'rabbit'

export type ToyArt = {
  background: string
  body: string
  accent: string
  figure: Figure
}

/** Eyes and mouths on light bodies. */
const INK = '#1d1c14'

/** A white (or black) layer that lightens (or shades) whatever is under it. */
const tint = (color: '#fff' | '#000', opacity: number) =>
  `fill="${color}" fill-opacity="${opacity}"`

/** A four-point sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`

const FIGURES: Record<Figure, (art: ToyArt) => string> = {
  // A faceted kaiju: angular planes, a gold crest and gold eyes.
  kaiju: ({ body, accent }) => `
    <path d="M262 300 L352 336 L262 340 Z" fill="${body}"/>
    <path d="M142 342 L130 236 L168 186 L236 186 L274 238 L264 342 Z" fill="${body}"/>
    <path d="M142 342 L130 236 L168 186 L200 186 L196 342 Z" ${tint('#fff', 0.08)}/>
    <path d="M172 262 L200 240 L228 262 L220 316 L180 316 Z" fill="${accent}" fill-opacity=".85"/>
    <path d="M128 248 L108 270 L132 274 Z M272 248 L292 270 L268 274 Z" fill="${body}"/>
    <path d="M168 104 L182 58 L198 98 Z M196 96 L212 44 L226 96 Z M226 100 L244 62 L248 108 Z" fill="${accent}"/>
    <path d="M148 194 L156 116 L204 88 L252 116 L258 194 L200 212 Z" fill="${body}"/>
    <path d="M148 194 L156 116 L204 88 L204 212 Z" ${tint('#fff', 0.1)}/>
    <path d="M166 146 L194 154 L190 166 L168 160 Z M240 146 L212 154 L216 166 L238 160 Z" fill="${accent}"/>
    <path d="M176 184 L188 194 L200 184 L212 194 L224 184" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>`,

  // A porcelain ghost, leaning, with a celadon glaze pooled at its hem.
  ghost: ({ body, accent }) => `
    <g transform="rotate(-7 200 340)">
      <path d="M132 334 L132 196 A68 68 0 0 1 268 196 L268 334 Q251 316 234 334 Q217 352 200 334 Q183 316 166 334 Q149 352 132 334 Z" fill="${body}"/>
      <path d="M132 290 Q200 304 268 286 L268 334 Q251 316 234 334 Q217 352 200 334 Q183 316 166 334 Q149 352 132 334 Z" fill="${accent}" fill-opacity=".75"/>
      <path d="M134 232 Q106 238 110 264 Q124 252 134 254 Z M266 232 Q294 238 290 264 Q276 252 266 254 Z" fill="${body}"/>
      <ellipse cx="164" cy="160" rx="12" ry="24" transform="rotate(-24 164 160)" ${tint('#fff', 0.85)}/>
      <ellipse cx="180" cy="200" rx="9" ry="14" fill="${INK}"/>
      <ellipse cx="222" cy="200" rx="9" ry="14" fill="${INK}"/>
      <ellipse cx="201" cy="232" rx="7" ry="9" fill="${INK}"/>
      <ellipse cx="160" cy="224" rx="12" ry="7" fill="${accent}" fill-opacity=".6"/>
      <ellipse cx="242" cy="224" rx="12" ry="7" fill="${accent}" fill-opacity=".6"/>
    </g>`,

  // An oni mask: curved gold horns, a scowl and a fanged grin.
  oni: ({ body, accent }) => `
    <path d="M144 150 C118 112 122 70 152 46 C152 90 166 116 184 130 Z" fill="${accent}"/>
    <path d="M256 150 C282 112 278 70 248 46 C248 90 234 116 216 130 Z" fill="${accent}"/>
    <path d="M118 160 Q118 106 200 102 Q282 106 282 160 L274 252 Q262 326 200 336 Q138 326 126 252 Z" fill="${body}"/>
    <path d="M118 160 Q118 106 200 102 L200 336 Q138 326 126 252 Z" ${tint('#fff', 0.12)}/>
    <path d="M142 168 L190 184 L186 196 L138 182 Z M258 168 L210 184 L214 196 L262 182 Z" fill="${INK}"/>
    <path d="M150 200 L188 208 L182 224 L156 220 Z M250 200 L212 208 L218 224 L244 220 Z" fill="${accent}"/>
    <ellipse cx="190" cy="248" rx="6" ry="4" ${tint('#000', 0.35)}/>
    <ellipse cx="210" cy="248" rx="6" ry="4" ${tint('#000', 0.35)}/>
    <path d="M144 270 Q200 322 256 270 Q200 292 144 270 Z" fill="${INK}"/>
    <path d="M160 280 L170 300 L178 284 Z M240 280 L230 300 L222 284 Z" fill="#fff"/>
    <path d="M134 214 L150 230 M266 214 L250 230" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>`,

  // A gold rabbit with long ears and a gold-leaf shine.
  rabbit: ({ body, accent }) => `
    <path d="${sparkle(96, 96, 16)} ${sparkle(318, 138, 11)} ${sparkle(310, 286, 8)}" fill="${body}"/>
    <ellipse cx="168" cy="96" rx="20" ry="64" transform="rotate(-10 168 96)" fill="${body}"/>
    <ellipse cx="232" cy="96" rx="20" ry="64" transform="rotate(10 232 96)" fill="${body}"/>
    <ellipse cx="168" cy="100" rx="8" ry="46" transform="rotate(-10 168 100)" fill="${accent}" fill-opacity=".55"/>
    <ellipse cx="232" cy="100" rx="8" ry="46" transform="rotate(10 232 100)" fill="${accent}" fill-opacity=".55"/>
    <ellipse cx="200" cy="282" rx="74" ry="68" fill="${body}"/>
    <ellipse cx="164" cy="340" rx="30" ry="14" fill="${body}"/>
    <ellipse cx="236" cy="340" rx="30" ry="14" fill="${body}"/>
    <circle cx="200" cy="182" r="58" fill="${body}"/>
    <path d="M160 150 Q176 128 198 126 L172 196 Q154 178 160 150 Z M150 270 Q156 238 182 226 L170 312 Q150 300 150 270 Z" ${tint('#fff', 0.35)}/>
    <circle cx="180" cy="176" r="7" fill="${accent}"/>
    <circle cx="220" cy="176" r="7" fill="${accent}"/>
    <path d="M193 198 L207 198 L200 207 Z" fill="${accent}"/>
    <path d="M186 210 L150 204 M186 214 L152 220 M214 210 L250 204 M214 214 L248 220" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>`,
}

function toySvg(art: ToyArt, mirrored: boolean): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
    `<rect width="400" height="400" fill="${art.background}"/>`,
    '<ellipse cx="200" cy="350" rx="112" ry="14" fill="#000" fill-opacity=".12"/>',
    mirrored ? '<g transform="matrix(-1 0 0 1 400 0)">' : '<g>',
    FIGURES[art.figure](art).replace(/\s*\n\s*/g, ''),
    '</g></svg>',
  ].join('')
}

/** `mirrored` turns the figure around, for a second gallery view. */
export function toyArtUrl(art: ToyArt, mirrored = false): string {
  return `data:image/svg+xml,${encodeURIComponent(toySvg(art, mirrored))}`
}
