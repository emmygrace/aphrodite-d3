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

## ChartWheel API

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

## Usage Examples

### Basic Chart with ChartWheel

```typescript
import { ChartWheel } from '@gaia-tools/aphrodite-core';
import { convertEphemerisToRender, buildIndexes } from '@gaia-tools/coeus-api-client';

// Get data from API
const ephemerisResponse = await api.render.render(request);
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

### Chart with Custom Styling

```typescript
const chart = new ChartWheel(container, {
  renderData,
  indexes,
  width: 800,
  height: 800,
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

### Rotated Chart

```typescript
const chart = new ChartWheel(container, {
  renderData,
  indexes,
  width: 800,
  height: 800,
  rotationOffset: 90, // Rotate chart 90 degrees
});
```

### Updating a Chart

```typescript
// Update chart with new options
chart.update({
  theme: 'modern',
  rotationOffset: 45,
});

// Clean up when done
chart.destroy();
```

## Orientation System (Legacy)

Note: The orientation system with `ViewFrame` and `LockRule` was part of the legacy `ChartRenderer` API. `ChartWheel` currently supports `rotationOffset` for basic rotation. Full orientation system support may be added to `ChartWheel` in the future.

For reference, the orientation system utilities are still available in `@gaia-tools/aphrodite-shared/orientation` if needed for other purposes.

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
- Ensure the container element exists and is a valid HTML element
- Verify that `renderData` contains the expected `RenderResponse` structure from the API
- Check that `indexes` match the data in `renderData`
- Verify D3.js is installed and imported correctly (peer dependency)
- Check browser console for JavaScript errors
- Ensure the CSS file is imported: `import '@gaia-tools/aphrodite-core/src/ChartWheel.css'`

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
- Ensure `visualConfig` is passed in `ChartWheelOptions`
- Verify color arrays have the correct length (12 for signs/houses)
- Check that color values are valid CSS color strings
- Note: `visualConfig` will be merged with theme defaults automatically

### Performance Issues

**Problem**: Chart rendering is slow or causes lag.

**Solutions**:
- Reduce the number of aspects or items in the render data
- Use `chart.update()` to update existing charts instead of creating new ones
- Call `chart.destroy()` when charts are no longer needed to free resources
- Only update charts when data actually changes

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
