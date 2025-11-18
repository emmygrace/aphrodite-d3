# @gaia-tools/aphrodite

TypeScript + D3 + SVG library for rendering astrological charts.

## Overview

Aphrodite is a framework-agnostic library for rendering astrological charts using D3.js and SVG. It provides a clean API for rendering signs, houses, planets, and aspects on chart wheels. The library is designed to be flexible, allowing you to customize colors, glyphs, and visual styling to match your application's design.

## Installation

```bash
npm install @gaia-tools/aphrodite
```

### Peer Dependencies

This package requires D3.js as a peer dependency:

```bash
npm install d3@^7.8.5
```

## Quick Start

```typescript
import { ChartRenderer } from '@gaia-tools/aphrodite';
import { Selection } from 'd3-selection';
import * as d3 from 'd3';

// Create an SVG container
const svg = d3.select('#chart-container')
  .append('svg')
  .attr('width', 800)
  .attr('height', 800);

const g = svg.append('g')
  .attr('transform', 'translate(400, 400)');

// Create renderer
const renderer = new ChartRenderer(g);

// Prepare chart data
const renderData = {
  signs: [
    { sign: 0, degree: 0 },   // Aries at 0°
    { sign: 1, degree: 30 },  // Taurus at 30°
    // ... more signs
  ],
  houses: [
    { house: 0, cuspDegree: 15 },  // 1st house cusp at 15°
    { house: 1, cuspDegree: 45 },  // 2nd house cusp at 45°
    // ... more houses
  ],
  planets: [
    { planet: 0, sign: 0, degree: 10, house: 0 },  // Sun in Aries
    { planet: 1, sign: 1, degree: 35, house: 1 },  // Moon in Taurus
    // ... more planets
  ],
  aspects: [
    { planet1: 0, planet2: 1, aspect: 'conjunction', orb: 2.5 },
    // ... more aspects
  ]
};

const indexes = {
  signs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  houses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  planets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
};

// Render chart
renderer.render(renderData, indexes, {
  centerX: 400,
  centerY: 400,
  rotationOffset: 0,
  visualConfig: {
    ringWidth: 30,
    ringSpacing: 10,
  },
  glyphConfig: {
    glyphSize: 12,
  },
  layerId: 'natal'
});
```

## ChartWheel (Primary API)

`ChartWheel` is the primary chart rendering class for working with `RenderResponse` data from the API. It's framework-agnostic and works with any JavaScript framework or vanilla JS.

### Usage

```typescript
import { ChartWheel } from '@gaia-tools/aphrodite-core';
import { convertEphemerisToRender, buildIndexes } from '@gaia-tools/coeus-api-client';

// Get ephemeris data from API
const ephemerisResponse = await api.render.render(request);

// Convert to render data
const renderData = convertEphemerisToRender(ephemerisResponse);
const indexes = buildIndexes(renderData);

// Render chart
const container = document.getElementById('chart');
const chart = new ChartWheel(container, {
  renderData,
  indexes,
  width: 800,
  height: 800,
  theme: 'traditional',
});
```

### ChartWheel Options

```typescript
interface ChartWheelOptions {
  renderData: RenderResponse;  // Chart data from API
  indexes: IndexesDTO;          // Lookup indexes
  width?: number;               // Chart width (default: 800)
  height?: number;              // Chart height (default: 800)
  centerX?: number;             // Center X (default: width/2)
  centerY?: number;             // Center Y (default: height/2)
  rotationOffset?: number;      // Rotation offset in degrees
  theme?: 'traditional' | 'modern';  // Theme preset
  visualConfig?: VisualConfig;   // Custom visual configuration
  glyphConfig?: GlyphConfig;    // Custom glyph configuration
  onItemClick?: (item: RingItemDTO, ring: RingDTO) => void;
  onAspectClick?: (aspect: AspectPairDTO) => void;
}
```

### Methods

- `update(options: Partial<ChartWheelOptions>)` - Update chart with new options
- `destroy()` - Clean up and remove chart

### Styling

Import the CSS file for default styles:

```typescript
import '@gaia-tools/aphrodite-core/src/ChartWheel.css';
```

## API Reference

### ChartRenderer (Legacy API)

Main class for rendering astrological charts using the legacy data format.

#### Constructor

```typescript
new ChartRenderer(container: Selection<SVGGElement, unknown, null, undefined>)
```

**Parameters:**
- `container` - A D3 selection of an SVG `<g>` element that will contain the chart

**Example:**
```typescript
const g = svg.append('g');
const renderer = new ChartRenderer(g);
```

#### Methods

##### `render(renderData, indexes, options)`

Renders a complete astrological chart with all specified rings (signs, houses, planets, aspects).

```typescript
render(
  renderData: RenderData,
  indexes: Indexes,
  options: ChartOptions
): void
```

**Parameters:**
- `renderData` - Chart data containing signs, houses, planets, and aspects
- `indexes` - Index arrays for signs, houses, and planets
- `options` - Rendering options including center position, rotation, and configuration

**Example:**
```typescript
renderer.render(renderData, indexes, {
  centerX: 400,
  centerY: 400,
  rotationOffset: 0,
  visualConfig: customVisualConfig,
  glyphConfig: customGlyphConfig,
  layerId: 'natal'
});
```

##### `renderRing(ring, renderData, indexes, options)`

Renders a single ring type (signs, houses, planets, or aspects).

```typescript
renderRing(
  ring: RingType,
  renderData: RenderData,
  indexes: Indexes,
  options: ChartOptions
): void
```

**Parameters:**
- `ring` - The type of ring to render: `'signs'`, `'houses'`, `'planets'`, or `'aspects'`
- `renderData` - Chart data
- `indexes` - Index arrays
- `options` - Rendering options

**Example:**
```typescript
// Render only the planets ring
renderer.renderRing('planets', renderData, indexes, options);
```

##### `clear()`

Clears all rendered content from the container.

```typescript
clear(): void
```

**Example:**
```typescript
renderer.clear();
```

## Type Definitions

### RenderData

Chart data structure containing all elements to render.

```typescript
interface RenderData {
  signs?: SignData[];
  houses?: HouseData[];
  planets?: PlanetData[];
  aspects?: AspectData[];
}
```

### SignData

Data for a single zodiac sign.

```typescript
interface SignData {
  sign: SignIndex;      // 0-11 (Aries through Pisces)
  degree: number;       // Degree position (0-360)
}
```

### HouseData

Data for a single house cusp.

```typescript
interface HouseData {
  house: HouseIndex;    // 0-11 (1st through 12th house)
  cuspDegree: number;   // Cusp degree position (0-360)
}
```

### PlanetData

Data for a single planet.

```typescript
interface PlanetData {
  planet: PlanetIndex;  // Planet index (0=Sun, 1=Moon, etc.)
  sign: SignIndex;      // Sign the planet is in (0-11)
  degree: number;       // Degree within the sign (0-30)
  house?: HouseIndex;   // Optional house position (0-11)
}
```

### AspectData

Data for an aspect between two planets.

```typescript
interface AspectData {
  planet1: PlanetIndex;  // First planet index
  planet2: PlanetIndex;  // Second planet index
  aspect: string;        // Aspect type (e.g., 'conjunction', 'opposition')
  orb: number;           // Orb in degrees
}
```

### Indexes

Index arrays for efficient lookup of chart elements.

```typescript
interface Indexes {
  signs?: SignIndex[];    // Array of sign indices [0, 1, 2, ..., 11]
  houses?: HouseIndex[];   // Array of house indices [0, 1, 2, ..., 11]
  planets?: PlanetIndex[]; // Array of planet indices
}
```

### ChartOptions

Options for rendering a chart.

```typescript
interface ChartOptions {
  centerX: number;              // X coordinate of chart center
  centerY: number;              // Y coordinate of chart center
  /**
   * @deprecated Use viewFrame instead. This is kept for backward compatibility.
   * If viewFrame is provided, rotationOffset is ignored.
   */
  rotationOffset?: number;       // Rotation offset in degrees
  /**
   * ViewFrame for orientation. If provided, overrides rotationOffset.
   * See Orientation section below for details.
   */
  viewFrame?: ViewFrame;
  /**
   * Lock rules for animation. Only used if viewFrame is provided.
   * See Orientation section below for details.
   */
  locks?: LockRule[];
  visualConfig?: VisualConfig;  // Visual styling configuration
  glyphConfig?: GlyphConfig;     // Glyph configuration
  layerId?: string;             // Optional layer identifier for grouping
}
```

### VisualConfig

Visual styling configuration for chart elements.

```typescript
interface VisualConfig {
  ringWidth?: number;                    // Width of each ring in pixels
  ringSpacing?: number;                  // Spacing between rings in pixels
  signColors?: string[];                 // Array of 12 colors for zodiac signs
  houseColors?: string[];                // Array of 12 colors for houses
  planetColors?: string[];               // Array of colors for planets
  aspectColors?: Record<string, string>;  // Map of aspect types to colors
  aspectStrokeWidth?: number;            // Stroke width for aspect lines
  backgroundColor?: string;              // Background color
  strokeColor?: string;                  // Default stroke color
  strokeWidth?: number;                  // Default stroke width
}
```

**Default Values:**
- `ringWidth`: 30
- `ringSpacing`: 10
- `signColors`: Predefined array of 12 colors
- `houseColors`: Predefined array of 12 grayscale colors
- `planetColors`: Predefined array of planet colors
- `aspectColors`: Predefined map with colors for common aspects
- `aspectStrokeWidth`: 2
- `backgroundColor`: '#FFFFFF'
- `strokeColor`: '#000000'
- `strokeWidth`: 1

### GlyphConfig

Configuration for glyphs (symbols) used in the chart.

```typescript
interface GlyphConfig {
  signGlyphs?: Partial<Record<SignIndex, string>>;  // Map of sign indices to glyphs
  planetGlyphs?: Record<PlanetIndex, string>;      // Map of planet indices to glyphs
  aspectGlyphs?: Record<string, string>;           // Map of aspect types to glyphs
  glyphSize?: number;                               // Size of glyphs in pixels
  glyphFont?: string;                                // Font family for glyphs
}
```

**Default Values:**
- `signGlyphs`: Unicode zodiac symbols (♈, ♉, ♊, etc.)
- `planetGlyphs`: Unicode planet symbols (☉, ☽, ☿, etc.)
- `aspectGlyphs`: Unicode aspect symbols (☌, ☍, △, etc.)
- `glyphSize`: 12
- `glyphFont`: 'Arial'

### Type Aliases

```typescript
type SignIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
type HouseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
type PlanetIndex = number;
type RingType = 'signs' | 'houses' | 'planets' | 'aspects' | 'outer';
type D3Selection = Selection<SVGGElement, unknown, null, undefined>;
```

## Configuration Examples

### Custom Visual Configuration

```typescript
import { VisualConfig } from '@gaia-tools/aphrodite';

const customVisualConfig: VisualConfig = {
  ringWidth: 40,
  ringSpacing: 15,
  signColors: [
    '#FF6B6B', // Aries - Red
    '#FFA07A', // Taurus - Light Salmon
    '#FFD700', // Gemini - Gold
    '#98D8C8', // Cancer - Mint
    '#FF6347', // Leo - Tomato
    '#F0E68C', // Virgo - Khaki
    '#87CEEB', // Libra - Sky Blue
    '#9370DB', // Scorpio - Medium Purple
    '#FFA500', // Sagittarius - Orange
    '#2F4F4F', // Capricorn - Dark Slate Gray
    '#00CED1', // Aquarius - Dark Turquoise
    '#FF69B4', // Pisces - Hot Pink
  ],
  houseColors: Array(12).fill('#E8E8E8'), // All houses same color
  planetColors: [
    '#FFD700', // Sun - Gold
    '#C0C0C0', // Moon - Silver
    '#FF6347', // Mercury - Tomato
    '#FFA500', // Venus - Orange
    '#FF4500', // Mars - Orange Red
    '#FFD700', // Jupiter - Gold
    '#9370DB', // Saturn - Medium Purple
    '#00CED1', // Uranus - Dark Turquoise
    '#4169E1', // Neptune - Royal Blue
    '#8B4513', // Pluto - Saddle Brown
  ],
  aspectColors: {
    conjunction: '#FF0000',  // Red
    opposition: '#0000FF',   // Blue
    trine: '#00FF00',        // Green
    square: '#FF0000',       // Red
    sextile: '#FFFF00',      // Yellow
  },
  aspectStrokeWidth: 3,
  backgroundColor: '#F5F5F5',
  strokeColor: '#333333',
  strokeWidth: 2,
};
```

### Custom Glyph Configuration

```typescript
import { GlyphConfig } from '@gaia-tools/aphrodite';

const customGlyphConfig: GlyphConfig = {
  signGlyphs: {
    0: '♈', // Aries
    1: '♉', // Taurus
    2: '♊', // Gemini
    // ... customize as needed
  },
  planetGlyphs: {
    0: '☉', // Sun
    1: '☽', // Moon
    2: '☿', // Mercury
    // ... customize as needed
  },
  aspectGlyphs: {
    conjunction: '☌',
    opposition: '☍',
    trine: '△',
    square: '□',
    sextile: '⚹',
  },
  glyphSize: 16,
  glyphFont: 'Georgia, serif',
};
```

### Multiple Chart Layers

You can render multiple charts in the same container using the `layerId` option:

```typescript
// Render natal chart
renderer.render(natalData, natalIndexes, {
  centerX: 400,
  centerY: 400,
  rotationOffset: 0,
  layerId: 'natal'
});

// Render transit chart on top
renderer.render(transitData, transitIndexes, {
  centerX: 400,
  centerY: 400,
  rotationOffset: 0,
  layerId: 'transits'
});

// Clear only the transits layer
renderer.container.select('g.layer-transits').remove();
```

## Usage Examples

### Basic Chart

```typescript
import { ChartRenderer } from '@gaia-tools/aphrodite';
import * as d3 from 'd3';

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', 800)
  .attr('height', 800);

const g = svg.append('g')
  .attr('transform', 'translate(400, 400)');

const renderer = new ChartRenderer(g);

renderer.render(renderData, indexes, {
  centerX: 0,
  centerY: 0,
  rotationOffset: 0
});
```

### Chart with Custom Styling

```typescript
renderer.render(renderData, indexes, {
  centerX: 0,
  centerY: 0,
  rotationOffset: 0,
  visualConfig: {
    ringWidth: 50,
    ringSpacing: 20,
    signColors: myCustomColors,
  },
  glyphConfig: {
    glyphSize: 18,
    glyphFont: 'Times New Roman',
  }
});
```

### Rotated Chart (Legacy)

```typescript
// Rotate chart 90 degrees (e.g., for different house systems)
// Note: This uses the legacy rotationOffset. See Orientation section for modern approach.
renderer.render(renderData, indexes, {
  centerX: 0,
  centerY: 0,
  rotationOffset: 90
});
```

## Orientation System

Aphrodite provides a flexible orientation system that allows you to control how charts are displayed and what elements remain fixed during animations. This system replaces the simple `rotationOffset` with a more powerful `ViewFrame` and `LockRule` system.

### ViewFrame

A `ViewFrame` defines how world longitudes are mapped to screen angles. It specifies:
- **Reference Frame**: The coordinate system to use (`'ecliptic'`, `'houses'`, `'signs'`, or `'angles'`)
- **Anchor**: Which element (object, house, sign, or angle) is pinned to a specific screen position
- **Screen Angle**: Where the anchor appears (0° = 3 o'clock, 90° = 12 o'clock, 180° = 9 o'clock, 270° = 6 o'clock)
- **Direction**: Clockwise (`'cw'`) or counterclockwise (`'ccw'`) sign order
- **Optional flips**: Radial and angular flips for mirroring

### LockRules

`LockRule`s define what elements remain visually fixed vs. moving during animation:
- **Subject**: What to lock (objects, houses, signs, or angles)
- **Frame**: The coordinate system for the lock (`'world'`, `'houses'`, `'signs'`, or `'screen'`)
- **Mode**: `'exact'` (lock to exact position) or `'follow-anchor'` (maintain offset from anchor)

### Using Presets

The easiest way to use the orientation system is with presets:

```typescript
import { presetAscLeft, presetMcTop, presetAriesTop } from '@gaia-tools/aphrodite-shared/orientation';

// ASC at 9 o'clock (traditional Western astrology)
renderer.render(renderData, indexes, {
  centerX: 400,
  centerY: 400,
  viewFrame: presetAscLeft.frame,
  locks: presetAscLeft.locks,
});

// MC at top (12 o'clock)
renderer.render(renderData, indexes, {
  centerX: 400,
  centerY: 400,
  viewFrame: presetMcTop.frame,
  locks: presetMcTop.locks,
});

// Aries at top (zodiac-centric view)
renderer.render(renderData, indexes, {
  centerX: 400,
  centerY: 400,
  viewFrame: presetAriesTop.frame,
  locks: presetAriesTop.locks,
});
```

### Custom ViewFrame

You can also create custom ViewFrames:

```typescript
import type { ViewFrame } from '@gaia-tools/aphrodite-shared/orientation';

const customFrame: ViewFrame = {
  referenceFrame: 'houses',
  anchor: { kind: 'angle', type: 'ASC' },
  screenAngleDeg: 180, // 9 o'clock
  direction: 'ccw',
};

renderer.render(renderData, indexes, {
  centerX: 400,
  centerY: 400,
  viewFrame: customFrame,
});
```

### Available Presets

- `presetAscLeft` - ASC at 9 o'clock, houses fixed
- `presetAscRight` - ASC at 3 o'clock, houses fixed
- `presetMcTop` - MC at 12 o'clock, houses follow MC
- `presetAriesTop` - Aries at 12 o'clock, signs fixed
- `presetFixedHouses` - Houses locked to screen
- `presetFixedSigns` - Signs locked to screen
- `presetSunLocked` - Sun centered, other planets animate
- `presetBiwheelNatalTransit` - Template for biwheel charts

See `@gaia-tools/aphrodite-shared/orientation` for the full preset catalog.

### Updating a Chart

```typescript
// Clear existing chart
renderer.clear();

// Render new data
renderer.render(newRenderData, newIndexes, options);
```

## Version Compatibility

- **D3.js**: Requires version ^7.8.5 or higher
- **TypeScript**: Compatible with TypeScript 5.0+
- **Node.js**: Compatible with Node.js 18+ (for development)
- **Browsers**: Compatible with modern browsers that support ES2020

## Development

### Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist` directory with type declarations and source maps.

### Testing

```bash
npm test
```

Run tests with Jest.

```bash
npm run test:watch
```

Run tests in watch mode for development.

### Linting

```bash
npm run lint
```

Check code for linting errors.

```bash
npm run lint:fix
```

Automatically fix linting errors where possible.

## Troubleshooting

### Chart Not Rendering

**Problem**: Chart appears blank or nothing is rendered.

**Solutions**:
- Ensure the D3 selection contains a valid SVG `<g>` element
- Verify that `renderData` contains the expected data structures
- Check that `indexes` arrays match the data in `renderData`
- Verify D3.js is installed and imported correctly
- Check browser console for JavaScript errors

### Type Errors

**Problem**: TypeScript errors when using the library.

**Solutions**:
- Ensure you have `@types/d3` installed as a dev dependency
- Verify TypeScript version is 5.0 or higher
- Check that all required types are imported correctly

### Glyphs Not Displaying

**Problem**: Glyphs (symbols) appear as boxes or don't render.

**Solutions**:
- Ensure the font specified in `glyphConfig` supports the Unicode characters
- Try using a different font that includes astrological symbols
- Verify the glyph characters are correct Unicode values
- Check that the `glyphSize` is appropriate for your display

### Colors Not Applying

**Problem**: Custom colors aren't being used.

**Solutions**:
- Ensure `visualConfig` is passed in `ChartOptions`
- Verify color arrays have the correct length (12 for signs/houses)
- Check that color values are valid CSS color strings
- Use `mergeVisualConfig` if you need to merge with defaults

### Performance Issues

**Problem**: Chart rendering is slow or causes lag.

**Solutions**:
- Reduce the number of aspects rendered
- Use `renderRing` to render only necessary rings
- Consider using `layerId` to manage multiple charts efficiently
- Clear and re-render only when data changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests: `npm test`

## License

MIT

## Links

- [GitHub Repository](https://github.com/emmygrace/aphrodite-core)
- [Issue Tracker](https://github.com/emmygrace/aphrodite-core/issues)
