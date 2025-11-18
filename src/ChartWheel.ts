import * as d3 from 'd3';
import type { VisualConfig, GlyphConfig } from './types/index.js';
import type {
  RenderResponse,
  IndexesDTO,
  RingItemDTO,
  RingDTO,
  AspectPairDTO,
  PlanetRingItem,
  HouseRingItem,
  SignRingItem,
} from '@gaia-tools/coeus-api-client';

// Note: CSS should be imported separately by the consumer
// import './ChartWheel.css';

export type Theme = 'traditional' | 'modern';

export interface ChartWheelOptions {
  renderData: RenderResponse;
  indexes: IndexesDTO;
  width?: number;
  height?: number;
  centerX?: number;
  centerY?: number;
  rotationOffset?: number;
  theme?: Theme;
  visualConfig?: VisualConfig;
  glyphConfig?: GlyphConfig;
  onItemClick?: (item: RingItemDTO, ring: RingDTO) => void;
  onAspectClick?: (aspect: AspectPairDTO) => void;
}

/**
 * Convert astronomical angle (0-360, clockwise from 0° Aries) to SVG angle (0-360, counter-clockwise from top)
 */
function astroToSvgAngle(astroAngle: number, rotationOffset: number = 0): number {
  // Astronomical: 0° = Aries, clockwise
  // SVG: 0° = top, counter-clockwise
  // Formula: svg = 90 - (astro + rotationOffset)
  let angle = 90 - (astroAngle + rotationOffset);
  // Normalize to 0-360 range
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

/**
 * Convert angle and radius to cartesian coordinates
 * SVG: 0° = top (12 o'clock), angles increase clockwise
 * Math: 0° = right (3 o'clock), angles increase counter-clockwise
 */
function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  // Convert SVG angle (0° = top) to math angle (0° = right)
  // SVG 0° (top) = Math 90° (counter-clockwise from right)
  const mathAngle = (90 - angleDeg) * (Math.PI / 180);
  return {
    x: radius * Math.cos(mathAngle),
    y: radius * Math.sin(mathAngle), // SVG Y increases downward, so positive Y is down
  };
}

/**
 * Format longitude as degrees and minutes
 * @param lon Longitude in degrees (0-360)
 * @param showMinutes Whether to show minutes (default: true)
 * @returns Formatted string like "15°23'" or "15°"
 */
function formatDegreesMinutes(lon: number, showMinutes: boolean = true): string {
  const normalizedLon = lon % 360;
  const degrees = Math.floor(normalizedLon);
  
  if (!showMinutes) {
    return `${degrees}°`;
  }
  
  const minutes = Math.floor((normalizedLon - degrees) * 60);
  if (minutes === 0) {
    return `${degrees}°`;
  }
  
  return `${degrees}°${minutes < 10 ? '0' : ''}${minutes}'`;
}

/**
 * Format longitude as sign degrees and minutes (0-29 degrees within sign)
 * @param lon Longitude in degrees (0-360)
 * @param showMinutes Whether to show minutes (default: true)
 * @returns Formatted string like "15°23'" or "15°"
 */
function formatSignDegreesMinutes(lon: number, showMinutes: boolean = true): string {
  const signDegrees = Math.floor(lon % 30);
  
  if (!showMinutes) {
    return `${signDegrees}°`;
  }
  
  const minutes = Math.floor((lon % 1) * 60);
  if (minutes === 0) {
    return `${signDegrees}°`;
  }
  
  return `${signDegrees}°${minutes < 10 ? '0' : ''}${minutes}'`;
}

/**
 * Map planet/object ID to display info (index for glyph lookup, label, glyph)
 * Planet indices: 0=Sun, 1=Moon, 2=Mercury, 3=Venus, 4=Mars, 5=Jupiter, 6=Saturn, 7=Uranus, 8=Neptune, 9=Pluto
 */
function getObjectInfo(objectId: string): { index: number | null; label: string; glyph: string | null } {
  const objectIdLower = objectId.toLowerCase();
  
  // Standard planets with indices
  const planetMap: Record<string, { index: number; label: string; glyph: string }> = {
    sun: { index: 0, label: 'Sun', glyph: '☉' },
    moon: { index: 1, label: 'Moon', glyph: '☽' },
    mercury: { index: 2, label: 'Mercury', glyph: '☿' },
    venus: { index: 3, label: 'Venus', glyph: '♀' },
    mars: { index: 4, label: 'Mars', glyph: '♂' },
    jupiter: { index: 5, label: 'Jupiter', glyph: '♃' },
    saturn: { index: 6, label: 'Saturn', glyph: '♄' },
    uranus: { index: 7, label: 'Uranus', glyph: '♅' },
    neptune: { index: 8, label: 'Neptune', glyph: '♆' },
    pluto: { index: 9, label: 'Pluto', glyph: '♇' },
  };
  
  // Special objects (no index, but have labels and glyphs)
  const specialObjects: Record<string, { label: string; glyph: string }> = {
    chiron: { label: 'Chiron', glyph: '⚷' },
    north_node: { label: 'North Node', glyph: '☊' },
    south_node: { label: 'South Node', glyph: '☋' },
    asc: { label: 'Asc', glyph: 'Asc' },
    mc: { label: 'MC', glyph: 'MC' },
    ic: { label: 'IC', glyph: 'IC' },
    dc: { label: 'DC', glyph: 'DC' },
  };
  
  if (planetMap[objectIdLower]) {
    const obj = planetMap[objectIdLower];
    return { index: obj.index, label: obj.label, glyph: obj.glyph };
  }
  
  if (specialObjects[objectIdLower]) {
    const obj = specialObjects[objectIdLower];
    return { index: null, label: obj.label, glyph: obj.glyph };
  }
  
  // Fallback: use the object ID as label
  return { index: null, label: objectId, glyph: null };
}

/**
 * Map sign index to sign name for glyph lookup
 */
function getSignIndex(signName: string): number | null {
  const signMap: Record<string, number> = {
    aries: 0,
    taurus: 1,
    gemini: 2,
    cancer: 3,
    leo: 4,
    virgo: 5,
    libra: 6,
    scorpio: 7,
    sagittarius: 8,
    capricorn: 9,
    aquarius: 10,
    pisces: 11,
  };
  return signMap[signName.toLowerCase()] ?? null;
}

/**
 * Dark mode traditional theme - warm earth tones, gold accents
 */
const darkTraditionalTheme: VisualConfig = {
  signColors: [
    '#C0392B', // Aries - deep red
    '#D68910', // Taurus - golden brown
    '#F39C12', // Gemini - amber
    '#85C1E2', // Cancer - soft blue
    '#F7DC6F', // Leo - golden yellow
    '#82E0AA', // Virgo - sage green
    '#F8C471', // Libra - peach
    '#8B4513', // Scorpio - sienna
    '#F1C40F', // Sagittarius - bright gold
    '#5D6D7E', // Capricorn - slate gray
    '#3498DB', // Aquarius - sky blue
    '#9B59B6', // Pisces - lavender
  ],
  houseColors: [
    '#3A3A3A', // Dark gray with warm tint
    '#404040',
    '#454545',
    '#4A4A4A',
    '#505050',
    '#555555',
    '#3A3A3A',
    '#404040',
    '#454545',
    '#4A4A4A',
    '#505050',
    '#555555',
  ],
  planetColors: [
    '#F39C12', // Sun - golden
    '#F7DC6F', // Moon - pale gold
    '#D68910', // Mercury - bronze
    '#F8C471', // Venus - peach
    '#C0392B', // Mars - deep red
    '#F1C40F', // Jupiter - bright gold
    '#5D6D7E', // Saturn - slate
    '#85C1E2', // Uranus - sky blue
    '#3498DB', // Neptune - blue
    '#8B4513', // Pluto - sienna
  ],
  aspectColors: {
    conjunction: '#C0392B',
    opposition: '#3498DB',
    trine: '#27AE60',
    square: '#E74C3C',
    sextile: '#F39C12',
    semisextile: '#D68910',
    semisquare: '#E67E22',
    sesquiquadrate: '#E67E22',
    quincunx: '#8B4513',
  },
  backgroundColor: '#1a1a1a',
  strokeColor: '#d4af37', // Gold
  strokeWidth: 1,
  aspectStrokeWidth: 2,
};

/**
 * Dark mode modern theme - cooler contemporary colors
 */
const darkModernTheme: VisualConfig = {
  signColors: [
    '#E63946', // Aries - modern red
    '#F77F00', // Taurus - warm orange
    '#FCBF49', // Gemini - golden yellow
    '#06A77D', // Cancer - teal
    '#D62828', // Leo - deep red
    '#A8DADC', // Virgo - light blue-green
    '#A8DADC', // Libra - light blue
    '#457B9D', // Scorpio - blue-gray
    '#1D3557', // Sagittarius - navy
    '#2A2D34', // Capricorn - dark gray
    '#4A90E2', // Aquarius - bright blue
    '#E91E63', // Pisces - pink
  ],
  houseColors: [
    '#2A2A2A', // Neutral dark grays
    '#333333',
    '#3A3A3A',
    '#404040',
    '#474747',
    '#4D4D4D',
    '#2A2A2A',
    '#333333',
    '#3A3A3A',
    '#404040',
    '#474747',
    '#4D4D4D',
  ],
  planetColors: [
    '#FFB800', // Sun - bright yellow
    '#E0E0E0', // Moon - light gray
    '#FF6B6B', // Mercury - coral
    '#4ECDC4', // Venus - turquoise
    '#FF4757', // Mars - red
    '#FFA502', // Jupiter - orange
    '#5F27CD', // Saturn - purple
    '#00D2D3', // Uranus - cyan
    '#3742FA', // Neptune - blue
    '#2F3542', // Pluto - dark gray
  ],
  aspectColors: {
    conjunction: '#FF4757',
    opposition: '#4A90E2',
    trine: '#06A77D',
    square: '#E63946',
    sextile: '#FCBF49',
    semisextile: '#F77F00',
    semisquare: '#FF6B6B',
    sesquiquadrate: '#FF6B6B',
    quincunx: '#5F27CD',
  },
  backgroundColor: '#0f0f0f',
  strokeColor: '#e0e0e0',
  strokeWidth: 1,
  aspectStrokeWidth: 2,
};

/**
 * Get dark mode theme colors
 */
function getDarkModeTheme(theme: Theme): VisualConfig {
  return theme === 'traditional' ? darkTraditionalTheme : darkModernTheme;
}

/**
 * Default visual config values - now using dark mode traditional as default
 */
const defaultVisualConfig: Required<VisualConfig> = {
  ringWidth: 30,
  ringSpacing: 10,
  ...getDarkModeTheme('traditional'),
};

/**
 * Default glyph config values
 */
const defaultGlyphConfig: Required<GlyphConfig> = {
  signGlyphs: {
    0: '♈', 1: '♉', 2: '♊', 3: '♋', 4: '♌', 5: '♍',
    6: '♎', 7: '♏', 8: '♐', 9: '♑', 10: '♒', 11: '♓',
  },
  planetGlyphs: {
    0: '☉', 1: '☽', 2: '☿', 3: '♀', 4: '♂', 5: '♃',
    6: '♄', 7: '♅', 8: '♆', 9: '♇',
  },
  aspectGlyphs: {},
  glyphSize: 12,
  glyphFont: 'Arial',
};

/**
 * Merge visual config with defaults and theme
 */
function mergeVisualConfig(config?: VisualConfig, theme?: Theme): Required<VisualConfig> {
  // If explicit visualConfig is provided, use it (overrides theme)
  if (config) {
    return {
      ...defaultVisualConfig,
      ...config,
      signColors: config.signColors || defaultVisualConfig.signColors,
      houseColors: config.houseColors || defaultVisualConfig.houseColors,
      planetColors: config.planetColors || defaultVisualConfig.planetColors,
      aspectColors: { ...defaultVisualConfig.aspectColors, ...(config.aspectColors || {}) },
    };
  }
  
  // If theme is provided, use theme colors
  if (theme) {
    const themeConfig = getDarkModeTheme(theme);
    return {
      ...defaultVisualConfig,
      ...themeConfig,
      ringWidth: defaultVisualConfig.ringWidth,
      ringSpacing: defaultVisualConfig.ringSpacing,
      signColors: themeConfig.signColors || defaultVisualConfig.signColors,
      houseColors: themeConfig.houseColors || defaultVisualConfig.houseColors,
      planetColors: themeConfig.planetColors || defaultVisualConfig.planetColors,
      aspectColors: { ...defaultVisualConfig.aspectColors, ...(themeConfig.aspectColors || {}) },
    };
  }
  
  // Default: use dark traditional
  return defaultVisualConfig;
}

/**
 * Merge glyph config with defaults
 */
function mergeGlyphConfig(config?: GlyphConfig): Required<GlyphConfig> {
  if (!config) return defaultGlyphConfig;
  return {
    ...defaultGlyphConfig,
    ...config,
    signGlyphs: { ...defaultGlyphConfig.signGlyphs, ...(config.signGlyphs || {}) },
    planetGlyphs: { ...defaultGlyphConfig.planetGlyphs, ...(config.planetGlyphs || {}) },
    aspectGlyphs: { ...defaultGlyphConfig.aspectGlyphs, ...(config.aspectGlyphs || {}) },
  };
}

/**
 * ChartWheel class - renders a chart wheel from RenderResponse
 * 
 * Framework-agnostic class that uses D3 to render astrological charts.
 * Can be used from React, Vue, vanilla JS, or any other framework.
 */
export class ChartWheel {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private options: ChartWheelOptions;

  constructor(container: HTMLElement, options: ChartWheelOptions) {
    this.container = container;
    this.options = options;
    this.render();
  }

  /**
   * Render the chart
   */
  render(): void {
    try {
      const {
        renderData,
        indexes,
        width = 800,
        height = 800,
        centerX,
        centerY,
        rotationOffset = 0,
        theme,
        visualConfig,
        glyphConfig,
        onItemClick,
        onAspectClick,
      } = this.options;

      // Clear container
      this.container.innerHTML = '';

      // Create SVG element
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('width', width.toString());
      svgElement.setAttribute('height', height.toString());
      svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElement.style.display = 'block';
      this.container.style.overflow = 'hidden';
      this.container.appendChild(svgElement);

      const svg = d3.select(svgElement);
      this.svg = svg;

      const cx = centerX ?? width / 2;
      const cy = centerY ?? height / 2;

      // Merge configs with defaults and theme
      // If visualConfig is provided, it overrides theme
      // Otherwise, use theme if provided, or default to dark traditional
      const mergedVisualConfig = mergeVisualConfig(visualConfig, theme);
      const mergedGlyphConfig = mergeGlyphConfig(glyphConfig);

      // Set background color FIRST so it's behind everything
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', mergedVisualConfig.backgroundColor || '#f0f0f0');

      // Create a container group for zoom/pan
      // This will be transformed by the zoom behavior
      const container = svg
        .append('g')
        .attr('class', 'chart-container');

      // Create the main chart group
      // Translate to center: chart elements are drawn relative to (0,0), so we translate to center them
      const g = container
        .append('g')
        .attr('class', 'chart-content')
        .attr('transform', `translate(${cx}, ${cy})`);

      const wheel = renderData.wheel;
      const maxRadius = Math.min(width, height) / 2 - 20;
      
      // Scale radii from RenderResponse to fit our canvas
      const responseMaxRadius = wheel.radius.outer;
      const scale = maxRadius / responseMaxRadius;

      // Debug: Log all rings and their items
      console.log('[ChartWheel] Rendering wheel with rings:', wheel.rings.length);
      wheel.rings.forEach((ring, ringIdx) => {
        const signItems = ring.items?.filter(item => item.kind === 'sign') || [];
        console.log(`[ChartWheel] Ring ${ringIdx} (${ring.id}): ${ring.items?.length || 0} items, ${signItems.length} signs`);
        if (signItems.length > 0) {
          signItems.forEach((signItem: any) => {
            console.log(`  - Sign: ${signItem.id}, label: ${signItem.label}, index: ${signItem.index}, startLon: ${signItem.startLon}, endLon: ${signItem.endLon}`);
          });
        }
      });

      // Draw rings structure
      wheel.rings.forEach((ring) => {
        const innerRadius = ring.radius.inner * scale;
        const outerRadius = ring.radius.outer * scale;
        
        // Draw ring band
        g.append('circle')
          .attr('r', outerRadius)
          .attr('fill', 'none')
          .attr('stroke', mergedVisualConfig.strokeColor || '#ddd')
          .attr('stroke-width', mergedVisualConfig.strokeWidth || 1)
          .attr('opacity', 0.3)
          .attr('class', `ring-${ring.id}`);

        // Render ring items
        if (ring.items && ring.items.length > 0) {
          const itemsGroup = g.append('g').attr('class', `ring-items-${ring.id}`);
          const centerRadius = (innerRadius + outerRadius) / 2;

          ring.items.forEach((item) => {
            if (item.kind === 'planet') {
              const planetItem = item as PlanetRingItem;
              const angle = astroToSvgAngle(planetItem.lon, rotationOffset);
              const { x, y } = polarToCartesian(angle, centerRadius);

              // Get object info (index, label, glyph)
              const objectInfo = getObjectInfo(planetItem.planetId);
              const planetIndex = objectInfo.index;
              
              // Get color - use index-based color if available, otherwise use default
              const planetColor = planetIndex !== null && mergedVisualConfig.planetColors?.[planetIndex]
                ? mergedVisualConfig.planetColors[planetIndex]
                : mergedVisualConfig.strokeColor || '#333';

              // Draw planet indicator
              const planetGroup = itemsGroup
                .append('g')
                .attr('class', `planet planet-${planetItem.planetId}`)
                .attr('transform', `translate(${x}, ${y})`);

              // Draw planet glyph or circle
              const glyphSize = mergedGlyphConfig.glyphSize || 12;
              let hasGlyph = false;
              
              // Try to use glyph from config if index is available
              if (planetIndex !== null && mergedGlyphConfig.planetGlyphs?.[planetIndex]) {
                planetGroup
                  .append('text')
                  .attr('x', 0)
                  .attr('y', 0)
                  .attr('font-size', `${glyphSize}px`)
                  .attr('font-family', mergedGlyphConfig.glyphFont || 'Arial')
                  .attr('fill', planetColor)
                  .text(mergedGlyphConfig.planetGlyphs[planetIndex]);
                hasGlyph = true;
              } else if (objectInfo.glyph) {
                // Use glyph from object info (for special objects)
                planetGroup
                  .append('text')
                  .attr('x', 0)
                  .attr('y', 0)
                  .attr('font-size', `${glyphSize}px`)
                  .attr('font-family', mergedGlyphConfig.glyphFont || 'Arial')
                  .attr('fill', planetColor)
                  .text(objectInfo.glyph);
                hasGlyph = true;
              }
              
              if (!hasGlyph) {
                // Fallback: draw circle
                planetGroup
                  .append('circle')
                  .attr('r', glyphSize / 2)
                  .attr('fill', planetColor)
                  .attr('stroke', mergedVisualConfig.strokeColor || '#fff')
                  .attr('stroke-width', 1);
              }

              // Add planet label below glyph
              const labelY = glyphSize + 4;
              planetGroup
                .append('text')
                .attr('class', 'planet-label')
                .attr('x', 0)
                .attr('y', labelY)
                .attr('fill', mergedVisualConfig.strokeColor || '#333')
                .text(objectInfo.label);

              // Add degrees and minutes below label
              const degreesText = formatDegreesMinutes(planetItem.lon, true);
              planetGroup
                .append('text')
                .attr('class', 'planet-degrees')
                .attr('x', 0)
                .attr('y', labelY + 12)
                .attr('fill', mergedVisualConfig.strokeColor || '#666')
                .text(degreesText);

              if (onItemClick) {
                planetGroup.on('click', () => onItemClick(item, ring));
              }
            } else if (item.kind === 'houseCusp') {
              const houseItem = item as HouseRingItem;
              const angle = astroToSvgAngle(houseItem.lon, rotationOffset);
              
              // Get house color
              const houseColor = mergedVisualConfig.houseColors?.[houseItem.houseIndex - 1]
                ? mergedVisualConfig.houseColors[houseItem.houseIndex - 1]
                : mergedVisualConfig.strokeColor || '#999';
              
              // Draw house cusp line
              const lineGroup = itemsGroup
                .append('g')
                .attr('class', `house-cusp house-${houseItem.houseIndex}`);

              const start = polarToCartesian(angle, innerRadius);
              const end = polarToCartesian(angle, outerRadius);

              lineGroup
                .append('line')
                .attr('x1', start.x)
                .attr('y1', start.y)
                .attr('x2', end.x)
                .attr('y2', end.y)
                .attr('stroke', houseColor)
                .attr('stroke-width', mergedVisualConfig.strokeWidth || 1)
                .attr('opacity', 0.6);

              // Add house number and degrees
              const labelPos = polarToCartesian(angle, centerRadius);
              
              // House number
              lineGroup
                .append('text')
                .attr('class', 'house-number')
                .attr('x', labelPos.x)
                .attr('y', labelPos.y - 6)
                .attr('fill', houseColor)
                .text(houseItem.houseIndex.toString());
              
              // Degrees and minutes (sign degrees)
              const cuspDegreesText = formatSignDegreesMinutes(houseItem.lon, true);
              lineGroup
                .append('text')
                .attr('class', 'house-degrees')
                .attr('x', labelPos.x)
                .attr('y', labelPos.y + 8)
                .attr('fill', houseColor)
                .attr('opacity', 0.8)
                .text(cuspDegreesText);

              if (onItemClick) {
                lineGroup.on('click', () => onItemClick(item, ring));
              }
            } else if (item.kind === 'sign') {
              const signItem = item as SignRingItem;
              const startAngle = astroToSvgAngle(signItem.startLon, rotationOffset);
              const endAngle = astroToSvgAngle(signItem.endLon, rotationOffset);
              
              // Get sign index and color
              const signIndex = signItem.index !== null && signItem.index !== undefined
                ? signItem.index
                : getSignIndex(signItem.id);
              const signColor = signIndex !== null && mergedVisualConfig.signColors?.[signIndex]
                ? mergedVisualConfig.signColors[signIndex]
                : mergedVisualConfig.strokeColor || '#ccc';
              
              // Debug logging for Cancer sign
              if (signItem.id.toLowerCase().includes('cancer') || signItem.label?.toLowerCase().includes('cancer')) {
                console.log('[ChartWheel] Rendering Cancer sign:', {
                  id: signItem.id,
                  label: signItem.label,
                  index: signItem.index,
                  startLon: signItem.startLon,
                  endLon: signItem.endLon,
                  startAngle,
                  endAngle,
                  signIndex,
                  signColor,
                  innerRadius,
                  outerRadius,
                  centerRadius,
                });
              }
              
              // Create arc for sign segment
              // Convert angles to radians and handle wrap-around cases
              let startRad = (startAngle * Math.PI) / 180;
              let endRad = (endAngle * Math.PI) / 180;
              
              // Handle wrap-around: if endAngle < startAngle, the arc crosses the 0/360 boundary
              // For signs (which are 30° each), this should be rare but can happen with rotation offsets
              // d3.arc() can handle endRad < startRad, but it will draw the long way around
              // For a 30° sign, we want the short arc, so we normalize endRad
              if (endRad < startRad) {
                // The sign wraps around 0/360, so we add 2π to endRad to get the correct end position
                // This ensures we draw the arc in the correct direction
                endRad += 2 * Math.PI;
              }
              
              const arc = d3
                .arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startRad)
                .endAngle(endRad);

              const signGroup = itemsGroup
                .append('g')
                .attr('class', `sign sign-${signItem.id}`);

              // Draw sign segment with color
              signGroup
                .append('path')
                .attr('d', arc as any)
                .attr('fill', 'none')
                .attr('stroke', signColor)
                .attr('stroke-width', mergedVisualConfig.strokeWidth || 0.5)
                .attr('opacity', 0.4);

              // Sign cusp degrees (at start of sign)
              const cuspDegreesText = formatSignDegreesMinutes(signItem.startLon, true);
              const cuspAngle = astroToSvgAngle(signItem.startLon, rotationOffset);
              const cuspPos = polarToCartesian(cuspAngle, centerRadius);
              
              // Add sign glyph or label at center
              // Calculate mid-angle properly handling wrap-around cases
              // For signs, we always want the midpoint of the shorter arc (30° for each sign)
              // The most reliable way is to calculate from the astronomical longitude midpoint
              // and convert to SVG angle, rather than trying to average SVG angles that might wrap
              const astroMidLon = (signItem.startLon + signItem.endLon) / 2;
              const midAngle = astroToSvgAngle(astroMidLon, rotationOffset);
              const labelPos = polarToCartesian(midAngle, centerRadius);
              
              // Debug logging for Cancer sign - log calculated positions
              if (signItem.id.toLowerCase().includes('cancer') || signItem.label?.toLowerCase().includes('cancer')) {
                console.log('[ChartWheel] Cancer sign calculated positions:', {
                  startLon: signItem.startLon,
                  endLon: signItem.endLon,
                  astroMidLon,
                  midAngle,
                  startAngle,
                  endAngle,
                  labelPos,
                  cuspAngle,
                  cuspPos,
                  glyph: signIndex !== null && mergedGlyphConfig.signGlyphs && signIndex in mergedGlyphConfig.signGlyphs 
                    ? mergedGlyphConfig.signGlyphs[signIndex as keyof typeof mergedGlyphConfig.signGlyphs]
                    : 'none',
                });
              }
              
              if (signIndex !== null && mergedGlyphConfig.signGlyphs && signIndex in mergedGlyphConfig.signGlyphs) {
                // Use glyph
                const glyph = mergedGlyphConfig.signGlyphs[signIndex as keyof typeof mergedGlyphConfig.signGlyphs];
                if (glyph) {
                  // Render glyph with improved visibility - add stroke for better contrast
                  const glyphText = signGroup
                    .append('text')
                    .attr('x', labelPos.x)
                    .attr('y', labelPos.y)
                    .attr('font-size', `${(mergedGlyphConfig.glyphSize || 12) * 0.8}px`)
                    .attr('font-family', mergedGlyphConfig.glyphFont || 'Arial')
                    .attr('fill', signColor)
                    .attr('opacity', 1) // Ensure full opacity for glyph
                    .attr('pointer-events', 'none') // Prevent glyph from blocking interactions
                    .text(glyph);
                  
                  // Add stroke for better visibility against background
                  glyphText
                    .attr('stroke', mergedVisualConfig.backgroundColor || '#FFFFFF')
                    .attr('stroke-width', 0.5)
                    .attr('paint-order', 'stroke fill'); // Stroke first, then fill
                } else {
                  // Fallback: use label
                  signGroup
                    .append('text')
                    .attr('class', 'sign-label')
                    .attr('x', labelPos.x)
                    .attr('y', labelPos.y)
                    .attr('fill', signColor)
                    .attr('opacity', 1)
                    .text(signItem.label || signItem.id);
                }
              } else {
                // Fallback: use label
                signGroup
                  .append('text')
                  .attr('class', 'sign-label')
                  .attr('x', labelPos.x)
                  .attr('y', labelPos.y)
                  .attr('fill', signColor)
                  .attr('opacity', 1)
                  .text(signItem.label || signItem.id);
              }
              
              // Add sign cusp degrees at the start of the sign
              signGroup
                .append('text')
                .attr('class', 'sign-cusp')
                .attr('x', cuspPos.x)
                .attr('y', cuspPos.y)
                .attr('fill', signColor)
                .attr('opacity', 0.7)
                .text(cuspDegreesText);

              if (onItemClick) {
                signGroup.on('click', () => onItemClick(item, ring));
              }
            }
          });
        }
      });

      // Draw outer circle
      g.append('circle')
        .attr('r', maxRadius)
        .attr('fill', 'none')
        .attr('stroke', mergedVisualConfig.strokeColor || '#000')
        .attr('stroke-width', mergedVisualConfig.strokeWidth || 2)
        .attr('class', 'wheel-outline');

      // Set up zoom behavior (following pattern from frontend/src/components/WheelCanvas.tsx)
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 4]) // Allow zoom from 0.5x to 4x
        .translateExtent([[-width * 2, -height * 2], [width * 3, height * 3]]) // Allow panning beyond viewport
        .on('zoom', (event) => {
          // Apply zoom transform to container
          container.attr('transform', event.transform.toString());
        });

      // Apply zoom to the SVG
      svg.call(zoom);
      
      // Set initial transform to identity (chart-content's translate centers it)
      const initialTransform = d3.zoomIdentity;
      svg.call(zoom.transform, initialTransform);

      // Store zoom reference for cleanup
      this.zoom = zoom;
    } catch (error) {
      console.error('ChartWheel: Error in render:', error);
    }
  }

  /**
   * Update chart with new options
   */
  update(options: Partial<ChartWheelOptions>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }

  /**
   * Destroy the chart instance and clean up
   */
  destroy(): void {
    if (this.zoom && this.svg) {
      this.svg.on('.zoom', null);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.svg = null;
    this.zoom = null;
  }
}

