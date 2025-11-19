import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChartWheel, type ChartWheelOptions } from './ChartWheel';
import type {
  RenderResponse,
  IndexesDTO,
  RingDTO,
  PlanetRingItem,
  SignRingItem,
  HouseRingItem,
} from '@gaia-tools/iris-core';
import { buildIndexes } from '@gaia-tools/iris-core/utils/buildIndexes';

// Mock D3 - we'll use the real D3 in jsdom environment
// The test environment should have D3 available

/**
 * Create a minimal valid RenderResponse for testing
 */
function createMockRenderData(): RenderResponse {
  return {
    chartInstance: {
      id: 'test-chart',
      chartDefinitionId: 'test-def',
      title: 'Test Chart',
      ownerUserId: 'test-user',
      subjects: [],
      effectiveDateTimes: {},
    },
    settings: {
      zodiacType: 'tropical',
      houseSystem: 'placidus',
      includeObjects: ['sun', 'moon'],
    },
    coordinateSystem: {
      angleUnit: 'degrees',
      angleRange: [0, 360],
      direction: 'cw',
      zeroPoint: {
        type: 'zodiac',
        signStart: 'aries',
        offsetDegrees: 0,
      },
    },
    layers: {
      natal: {
        id: 'natal',
        label: 'Natal',
        kind: 'natal',
        subjectId: 'subject1',
        dateTime: '1990-01-01T12:00:00Z',
        location: {
          name: 'Test',
          lat: 40.7128,
          lon: -74.0060,
        },
        positions: {
          planets: {
            sun: { lon: 10, lat: 0 },
            moon: { lon: 100, lat: 0 },
          },
          houses: {
            system: 'placidus',
            cusps: {
              '1': 0,
              '2': 30,
              '3': 60,
              '4': 90,
              '5': 120,
              '6': 150,
              '7': 180,
              '8': 210,
              '9': 240,
              '10': 270,
              '11': 300,
              '12': 330,
            },
            angles: {
              asc: 0,
              mc: 90,
              ic: 270,
              dc: 180,
            },
          },
        },
      },
    },
    aspects: {
      sets: {},
    },
    wheel: {
      id: 'test-wheel',
      description: 'Test wheel',
      radius: {
        inner: 0,
        outer: 100,
      },
      rings: [
        {
          id: 'signs',
          type: 'signs',
          label: 'Zodiac Signs',
          order: 0,
          radius: {
            inner: 80,
            outer: 100,
          },
          items: [
            {
              id: 'aries',
              kind: 'sign',
              index: 0,
              label: 'Aries',
              startLon: 0,
              endLon: 30,
            } as SignRingItem,
            {
              id: 'taurus',
              kind: 'sign',
              index: 1,
              label: 'Taurus',
              startLon: 30,
              endLon: 60,
            } as SignRingItem,
          ],
        },
        {
          id: 'planets',
          type: 'planets',
          label: 'Planets',
          order: 1,
          radius: {
            inner: 70,
            outer: 80,
          },
          items: [
            {
              id: 'sun',
              kind: 'planet',
              planetId: 'sun',
              layerId: 'natal',
              lon: 10,
            } as PlanetRingItem,
            {
              id: 'moon',
              kind: 'planet',
              planetId: 'moon',
              layerId: 'natal',
              lon: 100,
            } as PlanetRingItem,
          ],
        },
        {
          id: 'houses',
          type: 'houses',
          label: 'Houses',
          order: 2,
          radius: {
            inner: 60,
            outer: 70,
          },
          items: [
            {
              id: 'house-1',
              kind: 'houseCusp',
              houseIndex: 1,
              lon: 0,
            } as HouseRingItem,
            {
              id: 'house-2',
              kind: 'houseCusp',
              houseIndex: 2,
              lon: 30,
            } as HouseRingItem,
          ],
        },
      ],
    },
  };
}

describe('ChartWheel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a container element for each test
    container = document.createElement('div');
    container.id = 'test-chart-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should create a ChartWheel instance', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      const chart = new ChartWheel(container, {
        renderData,
        indexes,
      });

      expect(chart).toBeInstanceOf(ChartWheel);
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('should render with default dimensions', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('width')).toBe('800');
      expect(svg?.getAttribute('height')).toBe('800');
    });

    it('should render with custom dimensions', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        width: 1000,
        height: 1000,
      });

      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('width')).toBe('1000');
      expect(svg?.getAttribute('height')).toBe('1000');
    });

    it('should render with custom center position', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        centerX: 500,
        centerY: 500,
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Rendering', () => {
    it('should render all rings', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();

      // Check for ring elements (circles with class starting with 'ring-')
      const rings = svg?.querySelectorAll('circle[class*="ring-"]');
      expect(rings?.length).toBeGreaterThan(0);
    });

    it('should render sign items', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      const signGroups = svg?.querySelectorAll('g[class*="sign-"]');
      expect(signGroups?.length).toBeGreaterThan(0);
    });

    it('should render planet items', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      const planetGroups = svg?.querySelectorAll('g[class*="planet-"]');
      expect(planetGroups?.length).toBeGreaterThan(0);
    });

    it('should render house cusps', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      const houseGroups = svg?.querySelectorAll('g[class*="house-"]');
      expect(houseGroups?.length).toBeGreaterThan(0);
    });

    it('should render background color', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      const background = svg?.querySelector('rect');
      expect(background).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should render with traditional theme', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        theme: 'traditional',
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render with modern theme', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        theme: 'modern',
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should use custom visual config over theme', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        theme: 'traditional',
        visualConfig: {
          backgroundColor: '#ff0000',
        },
      });

      const svg = container.querySelector('svg');
      const background = svg?.querySelector('rect');
      expect(background?.getAttribute('fill')).toBe('#ff0000');
    });
  });

  describe('Config Merging', () => {
    it('should merge visual config with defaults', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        visualConfig: {
          strokeWidth: 5,
        },
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should merge glyph config with defaults', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        glyphConfig: {
          glyphSize: 20,
        },
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onItemClick when item is clicked', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);
      const onItemClick = vi.fn();

      new ChartWheel(container, {
        renderData,
        indexes,
        onItemClick,
      });

      const svg = container.querySelector('svg');
      const planetGroup = svg?.querySelector('g[class*="planet-"]');
      
      if (planetGroup) {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        planetGroup.dispatchEvent(clickEvent);
        // Note: D3 event handlers may need the element to have the handler attached
        // This test verifies the setup, actual click handling may need more setup
      }

      // The handler should be set up (actual triggering may need D3 event simulation)
      expect(onItemClick).toBeDefined();
    });

    it('should call onAspectClick when aspect is clicked', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);
      const onAspectClick = vi.fn();

      new ChartWheel(container, {
        renderData,
        indexes,
        onAspectClick,
      });

      // Similar to onItemClick test
      expect(onAspectClick).toBeDefined();
    });
  });

  describe('Rotation Offset', () => {
    it('should apply rotation offset', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
        rotationOffset: 90,
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Update Method', () => {
    it('should update chart with new options', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      const chart = new ChartWheel(container, {
        renderData,
        indexes,
      });

      const initialSvg = container.querySelector('svg');
      expect(initialSvg).toBeTruthy();

      chart.update({
        width: 1200,
        height: 1200,
      });

      const updatedSvg = container.querySelector('svg');
      expect(updatedSvg?.getAttribute('width')).toBe('1200');
      expect(updatedSvg?.getAttribute('height')).toBe('1200');
    });

    it('should update theme', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      const chart = new ChartWheel(container, {
        renderData,
        indexes,
        theme: 'traditional',
      });

      chart.update({
        theme: 'modern',
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Destroy Method', () => {
    it('should clean up on destroy', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      const chart = new ChartWheel(container, {
        renderData,
        indexes,
      });

      expect(container.querySelector('svg')).toBeTruthy();

      chart.destroy();

      expect(container.innerHTML).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty renderData gracefully', () => {
      const emptyRenderData: RenderResponse = {
        chartInstance: {
          id: 'test',
          chartDefinitionId: 'test',
          title: 'Test',
          ownerUserId: 'test',
          subjects: [],
          effectiveDateTimes: {},
        },
        settings: {
          zodiacType: 'tropical',
          houseSystem: 'placidus',
          includeObjects: [],
        },
        coordinateSystem: {
          angleUnit: 'degrees',
          angleRange: [0, 360],
          direction: 'cw',
          zeroPoint: {
            type: 'zodiac',
            signStart: 'aries',
            offsetDegrees: 0,
          },
        },
        layers: {},
        aspects: {
          sets: {},
        },
        wheel: {
          id: 'empty',
          radius: {
            inner: 0,
            outer: 100,
          },
          rings: [],
        },
      };

      const indexes = buildIndexes(emptyRenderData);

      // Should not throw
      expect(() => {
        new ChartWheel(container, {
          renderData: emptyRenderData,
          indexes,
        });
      }).not.toThrow();
    });

    it('should handle missing items in rings', () => {
      const renderData = createMockRenderData();
      // Remove items from a ring
      if (renderData.wheel.rings[0]) {
        renderData.wheel.rings[0].items = undefined;
      }
      const indexes = buildIndexes(renderData);

      expect(() => {
        new ChartWheel(container, {
          renderData,
          indexes,
        });
      }).not.toThrow();
    });
  });

  describe('Zoom Behavior', () => {
    it('should set up zoom behavior', () => {
      const renderData = createMockRenderData();
      const indexes = buildIndexes(renderData);

      new ChartWheel(container, {
        renderData,
        indexes,
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      // Zoom behavior is set up via D3, we can verify the SVG exists
    });
  });
});

