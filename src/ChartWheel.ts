// Optimized D3 imports - only import what we need
import { select, Selection, BaseType } from 'd3-selection';
import { zoom, ZoomBehavior, zoomIdentity, zoomTransform } from 'd3-zoom';
import { arc } from 'd3-shape';
import { transition, Transition } from 'd3-transition';
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
} from '@gaia-tools/iris-core';

// Note: CSS should be imported separately by the consumer
// import './ChartWheel.css';

export type Theme = 'traditional' | 'modern' | 'light' | 'high-contrast' | 'colorblind';

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
  showTooltips?: boolean; // Enable/disable tooltips (default: true)
  tooltipFormatter?: (item: RingItemDTO, ring: RingDTO) => string; // Custom tooltip formatter
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
 * Light mode traditional theme - bright colors on light background
 */
const lightTraditionalTheme: VisualConfig = {
  signColors: [
    '#DC143C', // Aries - crimson
    '#8B4513', // Taurus - saddle brown
    '#FFD700', // Gemini - gold
    '#87CEEB', // Cancer - sky blue
    '#FFA500', // Leo - orange
    '#90EE90', // Virgo - light green
    '#FFB6C1', // Libra - light pink
    '#8B0000', // Scorpio - dark red
    '#FFD700', // Sagittarius - gold
    '#696969', // Capricorn - dim gray
    '#00CED1', // Aquarius - dark turquoise
    '#9370DB', // Pisces - medium purple
  ],
  houseColors: [
    '#E0E0E0', // Light gray
    '#D0D0D0',
    '#C0C0C0',
    '#B0B0B0',
    '#A0A0A0',
    '#909090',
    '#E0E0E0',
    '#D0D0D0',
    '#C0C0C0',
    '#B0B0B0',
    '#A0A0A0',
    '#909090',
  ],
  planetColors: [
    '#FFD700', // Sun - gold
    '#C0C0C0', // Moon - silver
    '#8B7355', // Mercury - brown
    '#FFC0CB', // Venus - pink
    '#DC143C', // Mars - crimson
    '#FFA500', // Jupiter - orange
    '#808080', // Saturn - gray
    '#87CEEB', // Uranus - sky blue
    '#4169E1', // Neptune - royal blue
    '#2F4F4F', // Pluto - dark slate gray
  ],
  aspectColors: {
    conjunction: '#DC143C',
    opposition: '#4169E1',
    trine: '#228B22',
    square: '#FF0000',
    sextile: '#FFA500',
    semisextile: '#8B4513',
    semisquare: '#FF6347',
    sesquiquadrate: '#FF6347',
    quincunx: '#2F4F4F',
  },
  backgroundColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 1,
  aspectStrokeWidth: 2,
};

/**
 * High contrast theme - maximum contrast for accessibility
 */
const highContrastTheme: VisualConfig = {
  signColors: [
    '#FF0000', // Aries - red
    '#FF8000', // Taurus - orange
    '#FFFF00', // Gemini - yellow
    '#00FF00', // Cancer - green
    '#00FFFF', // Leo - cyan
    '#0080FF', // Virgo - blue
    '#8000FF', // Libra - purple
    '#FF0080', // Scorpio - magenta
    '#FF8040', // Sagittarius - orange-red
    '#808080', // Capricorn - gray
    '#40FF80', // Aquarius - green-cyan
    '#8040FF', // Pisces - purple-blue
  ],
  houseColors: [
    '#FFFFFF', // White
    '#000000', // Black
    '#FFFFFF',
    '#000000',
    '#FFFFFF',
    '#000000',
    '#FFFFFF',
    '#000000',
    '#FFFFFF',
    '#000000',
    '#FFFFFF',
    '#000000',
  ],
  planetColors: [
    '#FFFF00', // Sun - yellow
    '#FFFFFF', // Moon - white
    '#FF0000', // Mercury - red
    '#00FF00', // Venus - green
    '#FF0000', // Mars - red
    '#FF8000', // Jupiter - orange
    '#000000', // Saturn - black
    '#00FFFF', // Uranus - cyan
    '#0000FF', // Neptune - blue
    '#800080', // Pluto - purple
  ],
  aspectColors: {
    conjunction: '#FF0000',
    opposition: '#0000FF',
    trine: '#00FF00',
    square: '#FF0000',
    sextile: '#FFFF00',
    semisextile: '#FF8000',
    semisquare: '#FF0000',
    sesquiquadrate: '#FF0000',
    quincunx: '#800080',
  },
  backgroundColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 2,
  aspectStrokeWidth: 3,
};

/**
 * Colorblind-friendly theme - uses shapes and patterns in addition to color
 */
const colorblindTheme: VisualConfig = {
  signColors: [
    '#E69F00', // Aries - orange
    '#56B4E9', // Taurus - sky blue
    '#009E73', // Gemini - bluish green
    '#F0E442', // Cancer - yellow
    '#0072B2', // Leo - blue
    '#D55E00', // Virgo - vermillion
    '#CC79A7', // Libra - reddish purple
    '#000000', // Scorpio - black
    '#E69F00', // Sagittarius - orange
    '#56B4E9', // Capricorn - sky blue
    '#009E73', // Aquarius - bluish green
    '#F0E442', // Pisces - yellow
  ],
  houseColors: [
    '#E8E8E8', // Light gray
    '#D0D0D0',
    '#B8B8B8',
    '#A0A0A0',
    '#888888',
    '#707070',
    '#E8E8E8',
    '#D0D0D0',
    '#B8B8B8',
    '#A0A0A0',
    '#888888',
    '#707070',
  ],
  planetColors: [
    '#E69F00', // Sun - orange
    '#56B4E9', // Moon - sky blue
    '#009E73', // Mercury - bluish green
    '#F0E442', // Venus - yellow
    '#D55E00', // Mars - vermillion
    '#0072B2', // Jupiter - blue
    '#CC79A7', // Saturn - reddish purple
    '#000000', // Uranus - black
    '#E69F00', // Neptune - orange
    '#56B4E9', // Pluto - sky blue
  ],
  aspectColors: {
    conjunction: '#D55E00',
    opposition: '#0072B2',
    trine: '#009E73',
    square: '#D55E00',
    sextile: '#E69F00',
    semisextile: '#F0E442',
    semisquare: '#CC79A7',
    sesquiquadrate: '#CC79A7',
    quincunx: '#000000',
  },
  backgroundColor: '#FFFFFF',
  strokeColor: '#000000',
  strokeWidth: 2,
  aspectStrokeWidth: 2.5,
};

/**
 * Get theme colors based on theme name
 */
function getThemeColors(theme: Theme): VisualConfig {
  switch (theme) {
    case 'traditional':
      return darkTraditionalTheme;
    case 'modern':
      return darkModernTheme;
    case 'light':
      return lightTraditionalTheme;
    case 'high-contrast':
      return highContrastTheme;
    case 'colorblind':
      return colorblindTheme;
    default:
      return darkTraditionalTheme;
  }
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
    const themeConfig = getThemeColors(theme);
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
  private svg: Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private zoom: ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private options: ChartWheelOptions;
  private isUpdating: boolean = false;
  private transitionDuration: number = 750; // milliseconds
  private resizeObserver: ResizeObserver | null = null;
  private autoResize: boolean = false;
  private tooltip: Selection<HTMLDivElement, unknown, HTMLElement, unknown> | null = null;

  constructor(container: HTMLElement, options: ChartWheelOptions) {
    this.container = container;
    this.options = options;
    
    // Check if auto-resize should be enabled (when width/height are not specified)
    this.autoResize = !options.width && !options.height;
    
    this.render();
    
    // Set up ResizeObserver for responsive behavior
    if (this.autoResize && typeof ResizeObserver !== 'undefined') {
      this.setupResizeObserver();
    }
  }

  /**
   * Set up ResizeObserver to automatically resize chart when container size changes
   */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.update({ width, height });
        }
      }
    });
    
    this.resizeObserver.observe(this.container);
  }

  /**
   * Show tooltip at specified position with content
   */
  private showTooltip(event: MouseEvent, content: string): void {
    if (!this.tooltip || this.options.showTooltips === false) return;
    
    this.tooltip
      .html(content)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 10}px`)
      .transition()
      .duration(200)
      .style('opacity', 1);
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    if (!this.tooltip) return;
    
    this.tooltip
      .transition()
      .duration(200)
      .style('opacity', 0);
  }

  /**
   * Format tooltip content for an item
   */
  private formatTooltip(item: RingItemDTO, ring: RingDTO): string {
    if (this.options.tooltipFormatter) {
      return this.options.tooltipFormatter(item, ring);
    }

    if (item.kind === 'planet') {
      const planetItem = item as PlanetRingItem;
      const objectInfo = getObjectInfo(planetItem.planetId);
      return `${objectInfo.label}<br/>${formatDegreesMinutes(planetItem.lon, true)}`;
    } else if (item.kind === 'houseCusp') {
      const houseItem = item as HouseRingItem;
      return `House ${houseItem.houseIndex}<br/>${formatSignDegreesMinutes(houseItem.lon, true)}`;
    } else if (item.kind === 'sign') {
      const signItem = item as SignRingItem;
      return `${signItem.label || signItem.id}<br/>${formatDegreesMinutes(signItem.startLon, true)} - ${formatDegreesMinutes(signItem.endLon, true)}`;
    }

    return item.id;
  }

  /**
   * Validate renderData structure
   */
  private validateRenderData(renderData: RenderResponse): void {
    if (!renderData) {
      throw new Error('ChartWheel: renderData is required');
    }
    if (!renderData.wheel) {
      throw new Error('ChartWheel: renderData.wheel is required');
    }
    if (!Array.isArray(renderData.wheel.rings)) {
      throw new Error('ChartWheel: renderData.wheel.rings must be an array');
    }
    if (!renderData.wheel.radius || typeof renderData.wheel.radius.outer !== 'number') {
      throw new Error('ChartWheel: renderData.wheel.radius.outer must be a number');
    }
    if (renderData.wheel.radius.outer <= 0) {
      throw new Error('ChartWheel: renderData.wheel.radius.outer must be greater than 0');
    }
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

      // Validate renderData before rendering
      this.validateRenderData(renderData);

      // Validate dimensions
      if (width <= 0 || height <= 0) {
        throw new Error(`ChartWheel: Invalid dimensions: width=${width}, height=${height}`);
      }

      // Clear container
      this.container.innerHTML = '';

      // Create SVG element with accessibility attributes
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('width', width.toString());
      svgElement.setAttribute('height', height.toString());
      svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgElement.setAttribute('role', 'img');
      svgElement.setAttribute('aria-label', 'Astrological chart wheel');
      svgElement.setAttribute('tabindex', '0');
      svgElement.style.display = 'block';
      this.container.style.overflow = 'hidden';
      this.container.appendChild(svgElement);

      const svg = select(svgElement);
      this.svg = svg;

      // Create tooltip element if not exists
      if (!this.tooltip) {
        this.tooltip = select('body')
          .append('div')
          .attr('class', 'chart-wheel-tooltip')
          .style('position', 'absolute')
          .style('padding', '8px 12px')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', '#fff')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .style('z-index', '1000')
          .style('max-width', '200px');
      }

      const cx = centerX ?? width / 2;
      const cy = centerY ?? height / 2;

      // Merge configs with defaults and theme
      // If visualConfig is provided, it overrides theme
      // Otherwise, use theme if provided, or default to dark traditional
      const mergedVisualConfig = mergeVisualConfig(visualConfig, theme);
      const mergedGlyphConfig = mergeGlyphConfig(glyphConfig);

      // Set background color FIRST so it's behind everything
      const backgroundRect = svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', mergedVisualConfig.backgroundColor || '#f0f0f0');
      
      // Animate background color change if updating
      if (this.isUpdating) {
        backgroundRect
          .attr('fill', '#f0f0f0') // Start from default
          .transition(this.getTransition())
          .attr('fill', mergedVisualConfig.backgroundColor || '#f0f0f0');
      }

      // Create a container group for zoom/pan
      // This will be transformed by the zoom behavior
      const container = svg
        .append('g')
        .attr('class', 'chart-container')
        .attr('role', 'group')
        .attr('aria-label', 'Chart content');

      // Create the main chart group
      // Translate to center: chart elements are drawn relative to (0,0), so we translate to center them
      const g = container
        .append('g')
        .attr('class', 'chart-content')
        .attr('transform', `translate(${cx}, ${cy})`)
        .attr('role', 'group')
        .attr('aria-label', 'Chart wheel elements');

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
          signItems.forEach((signItem: SignRingItem) => {
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
              // Use displayAngle if collision detection adjusted it, otherwise use original lon
              const displayLon = planetItem.displayAngle !== undefined ? planetItem.displayAngle : planetItem.lon;
              const angle = astroToSvgAngle(displayLon, rotationOffset);
              const { x, y } = polarToCartesian(angle, centerRadius);
              
              // If displayAngle is set, calculate original position for visual indicator
              let originalPosition: { x: number; y: number } | null = null;
              if (planetItem.displayAngle !== undefined) {
                const originalAngle = astroToSvgAngle(planetItem.lon, rotationOffset);
                originalPosition = polarToCartesian(originalAngle, centerRadius);
              }

              // Get object info (index, label, glyph)
              const objectInfo = getObjectInfo(planetItem.planetId);
              const planetIndex = objectInfo.index;
              
              // Get color - use index-based color if available, otherwise use default
              const planetColor = planetIndex !== null && mergedVisualConfig.planetColors?.[planetIndex]
                ? mergedVisualConfig.planetColors[planetIndex]
                : mergedVisualConfig.strokeColor || '#333';

              // Draw visual indicator line from original to adjusted position if collision was resolved
              if (originalPosition) {
                itemsGroup
                  .append('line')
                  .attr('x1', originalPosition.x)
                  .attr('y1', originalPosition.y)
                  .attr('x2', x)
                  .attr('y2', y)
                  .attr('stroke', mergedVisualConfig.strokeColor || '#999')
                  .attr('stroke-width', 0.5)
                  .attr('stroke-dasharray', '2,2')
                  .attr('opacity', 0.5)
                  .attr('class', 'collision-indicator');
              }

              // Draw planet indicator
              const planetGroup = itemsGroup
                .append('g')
                .attr('class', `planet planet-${planetItem.planetId}`)
                .attr('transform', `translate(${x}, ${y})`)
                .attr('role', 'button')
                .attr('tabindex', '0')
                .attr('aria-label', `${objectInfo.label} at ${formatDegreesMinutes(planetItem.lon, true)}`)
                .attr('aria-describedby', `planet-${planetItem.planetId}-desc`);

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

              // Add hover tooltip
              planetGroup
                .on('mouseenter', (event: MouseEvent) => {
                  this.showTooltip(event, this.formatTooltip(item, ring));
                  planetGroup.style('opacity', 0.8);
                })
                .on('mouseleave', () => {
                  this.hideTooltip();
                  planetGroup.style('opacity', 1);
                })
                .on('mousemove', (event: MouseEvent) => {
                  if (this.tooltip) {
                    this.tooltip
                      .style('left', `${event.pageX + 10}px`)
                      .style('top', `${event.pageY - 10}px`);
                  }
                });

              if (onItemClick) {
                planetGroup
                  .on('click', () => onItemClick(item, ring))
                  .on('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onItemClick(item, ring);
                    }
                  });
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
                .attr('class', `house-cusp house-${houseItem.houseIndex}`)
                .attr('role', 'button')
                .attr('tabindex', '0')
                .attr('aria-label', `House ${houseItem.houseIndex} cusp at ${formatSignDegreesMinutes(houseItem.lon, true)}`);

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

              // Add hover tooltip
              lineGroup
                .on('mouseenter', (event: MouseEvent) => {
                  this.showTooltip(event, this.formatTooltip(item, ring));
                  lineGroup.style('opacity', 0.9);
                })
                .on('mouseleave', () => {
                  this.hideTooltip();
                  lineGroup.style('opacity', 0.6);
                })
                .on('mousemove', (event: MouseEvent) => {
                  if (this.tooltip) {
                    this.tooltip
                      .style('left', `${event.pageX + 10}px`)
                      .style('top', `${event.pageY - 10}px`);
                  }
                });

              if (onItemClick) {
                lineGroup
                  .on('click', () => onItemClick(item, ring))
                  .on('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onItemClick(item, ring);
                    }
                  });
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
              
              const arcGenerator = arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius)
                .startAngle(startRad)
                .endAngle(endRad);

              const signGroup = itemsGroup
                .append('g')
                .attr('class', `sign sign-${signItem.id}`)
                .attr('role', 'button')
                .attr('tabindex', '0')
                .attr('aria-label', `${signItem.label || signItem.id} sign from ${formatDegreesMinutes(signItem.startLon, true)} to ${formatDegreesMinutes(signItem.endLon, true)}`);

              // Draw sign segment with color
              const arcPath = arcGenerator();
              if (arcPath !== null) {
                signGroup
                  .append('path')
                  .attr('d', arcPath)
                  .attr('fill', 'none')
                  .attr('stroke', signColor)
                  .attr('stroke-width', mergedVisualConfig.strokeWidth || 0.5)
                  .attr('opacity', 0.4);
              }

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
                signGroup
                  .on('click', () => onItemClick(item, ring))
                  .on('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onItemClick(item, ring);
                    }
                  });
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

      // Debug visualization mode
      if (this.options.debug) {
        const debugGroup = g.append('g').attr('class', 'debug-overlay');
        
        // Draw center point
        debugGroup
          .append('circle')
          .attr('r', 5)
          .attr('fill', '#ff0000')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
        
        // Draw radius lines for each ring
        wheel.rings.forEach((ring) => {
          const innerRadius = ring.radius.inner * scale;
          const outerRadius = ring.radius.outer * scale;
          
          // Draw inner radius line
          debugGroup
            .append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', innerRadius)
            .attr('y2', 0)
            .attr('stroke', '#00ff00')
            .attr('stroke-width', 1)
            .attr('opacity', 0.5);
          
          // Draw outer radius line
          debugGroup
            .append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', outerRadius)
            .attr('y2', 0)
            .attr('stroke', '#0000ff')
            .attr('stroke-width', 1)
            .attr('opacity', 0.5);
        });
        
        // Add debug text showing rendering stats
        const debugText = debugGroup
          .append('text')
          .attr('x', -maxRadius)
          .attr('y', -maxRadius - 20)
          .attr('fill', '#fff')
          .attr('font-size', '12px')
          .attr('font-family', 'monospace');
        
        const stats = [
          `Rings: ${wheel.rings.length}`,
          `Total items: ${wheel.rings.reduce((sum, r) => sum + (r.items?.length || 0), 0)}`,
          `Scale: ${scale.toFixed(2)}`,
          `Max radius: ${maxRadius.toFixed(0)}`,
        ];
        debugText.text(stats.join(' | '));
        
        // Draw angle markers every 30 degrees
        for (let angle = 0; angle < 360; angle += 30) {
          const svgAngle = astroToSvgAngle(angle, rotationOffset);
          const { x, y } = polarToCartesian(svgAngle, maxRadius);
          debugGroup
            .append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', x)
            .attr('y2', y)
            .attr('stroke', '#ffff00')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.3);
          
          // Add angle label
          const labelPos = polarToCartesian(svgAngle, maxRadius + 20);
          debugGroup
            .append('text')
            .attr('x', labelPos.x)
            .attr('y', labelPos.y)
            .attr('fill', '#ffff00')
            .attr('font-size', '10px')
            .attr('text-anchor', 'middle')
            .text(`${angle}°`);
        }
      }

      // Set up zoom behavior (following pattern from frontend/src/components/WheelCanvas.tsx)
      const zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 4]) // Allow zoom from 0.5x to 4x
        .translateExtent([[-width * 2, -height * 2], [width * 3, height * 3]]) // Allow panning beyond viewport
        .on('zoom', (event) => {
          // Apply zoom transform to container
          container.attr('transform', event.transform.toString());
        })
        // Improve touch interactions for mobile
        .filter((event: Event) => {
          // Allow all mouse events, but filter touch events to prevent conflicts
          if (event.type === 'wheel') return true;
          if (event.type.startsWith('mouse')) return true;
          // For touch events, allow single touch for pan, two touches for zoom
          if (event.type.startsWith('touch')) {
            const touchEvent = event as TouchEvent;
            // Allow single touch for panning
            if (touchEvent.touches.length === 1) return true;
            // Allow two touches for pinch zoom
            if (touchEvent.touches.length === 2) return true;
            return false;
          }
          return true;
        });

      // Apply zoom to the SVG
      svg.call(zoomBehavior);
      
      // Set initial transform to identity (chart-content's translate centers it)
      const initialTransform = zoomIdentity;
      svg.call(zoomBehavior.transform, initialTransform);

      // Improve touch interactions - add touch-friendly hit areas
      // Make interactive elements larger on touch devices
      if ('ontouchstart' in window) {
        // Increase hit area for touch devices
        svgElement.style.touchAction = 'pan-x pan-y pinch-zoom';
        
        // Add touch event handlers for better mobile experience
        let touchStartDistance = 0;
        let touchStartScale = 1;
        
        svgElement.addEventListener('touchstart', (event: TouchEvent) => {
          if (event.touches.length === 2) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            touchStartDistance = Math.hypot(
              touch2.clientX - touch1.clientX,
              touch2.clientY - touch1.clientY
            );
            const currentTransform = zoomTransform(svgElement);
            touchStartScale = currentTransform.k;
          }
        }, { passive: true });
        
        svgElement.addEventListener('touchmove', (event: TouchEvent) => {
          if (event.touches.length === 2) {
            event.preventDefault();
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(
              touch2.clientX - touch1.clientX,
              touch2.clientY - touch1.clientY
            );
            const scale = touchStartScale * (currentDistance / touchStartDistance);
            const currentTransform = zoomTransform(svgElement);
            const newTransform = currentTransform.scale(scale / currentTransform.k);
            svg.call(zoomBehavior.transform, newTransform);
          }
        }, { passive: false });
      }

      // Add keyboard navigation for arrow keys
      svgElement.addEventListener('keydown', (event: KeyboardEvent) => {
        const currentTransform = zoomTransform(svgElement);
        let newTransform = currentTransform;
        const panStep = 50;

        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            newTransform = currentTransform.translate(0, panStep);
            break;
          case 'ArrowDown':
            event.preventDefault();
            newTransform = currentTransform.translate(0, -panStep);
            break;
          case 'ArrowLeft':
            event.preventDefault();
            newTransform = currentTransform.translate(panStep, 0);
            break;
          case 'ArrowRight':
            event.preventDefault();
            newTransform = currentTransform.translate(-panStep, 0);
            break;
          case '+':
          case '=':
            event.preventDefault();
            newTransform = currentTransform.scale(1.2);
            break;
          case '-':
          case '_':
            event.preventDefault();
            newTransform = currentTransform.scale(0.8);
            break;
          case '0':
            event.preventDefault();
            newTransform = zoomIdentity;
            break;
        }

        if (newTransform !== currentTransform) {
          svg.call(zoomBehavior.transform, newTransform);
        }
      });

      // Store zoom reference for cleanup
      this.zoom = zoomBehavior;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('ChartWheel: Error in render:', error);
      
      // Display error message to user
      this.container.innerHTML = `
        <div style="padding: 20px; color: #e74c3c; font-family: Arial, sans-serif;">
          <h3 style="margin: 0 0 10px 0;">Chart Rendering Error</h3>
          <p style="margin: 0;">${errorMessage}</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #7f8c8d;">
            Please check the console for more details.
          </p>
        </div>
      `;
      
      // Re-throw for caller to handle if needed
      throw error;
    }
  }

  /**
   * Update chart with new options
   */
  update(options: Partial<ChartWheelOptions>): void {
    this.isUpdating = true;
    this.options = { ...this.options, ...options };
    this.render();
    this.isUpdating = false;
  }

  /**
   * Get transition for animated updates
   */
  private getTransition(): Transition<BaseType, unknown, null, undefined> {
    return transition().duration(this.isUpdating ? this.transitionDuration : 0);
  }

  /**
   * Export chart as SVG string
   */
  exportSVG(): string {
    if (!this.svg || !this.svg.node()) {
      throw new Error('ChartWheel: Cannot export - chart not rendered');
    }

    const svgNode = this.svg.node() as SVGSVGElement;
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgNode);
  }

  /**
   * Export chart as PNG image
   * @param width Optional width for the exported image (defaults to current width)
   * @param height Optional height for the exported image (defaults to current height)
   * @returns Promise that resolves to a data URL string
   */
  async exportPNG(width?: number, height?: number): Promise<string> {
    if (!this.svg || !this.svg.node()) {
      throw new Error('ChartWheel: Cannot export - chart not rendered');
    }

    const svgNode = this.svg.node() as SVGSVGElement;
    const currentWidth = width || parseInt(svgNode.getAttribute('width') || '800', 10);
    const currentHeight = height || parseInt(svgNode.getAttribute('height') || '800', 10);

    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgNode.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('width', currentWidth.toString());
    clonedSvg.setAttribute('height', currentHeight.toString());

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('ChartWheel: Cannot get canvas context'));
          return;
        }

        // Fill background if needed
        ctx.fillStyle = this.options.visualConfig?.backgroundColor || '#1a1a1a';
        ctx.fillRect(0, 0, currentWidth, currentHeight);

        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('ChartWheel: Failed to load SVG for PNG export'));
      };
      img.src = url;
    });
  }

  /**
   * Export chart data as JSON
   */
  exportData(): string {
    return JSON.stringify(this.options.renderData, null, 2);
  }

  /**
   * Destroy the chart instance and clean up
   */
  destroy(): void {
    // Disconnect ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    if (this.zoom && this.svg) {
      this.svg.on('.zoom', null);
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    // Remove tooltip
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
    
    this.svg = null;
    this.zoom = null;
  }
}

