/**
 * ViewFrame utilities for converting world longitudes to screen angles.
 * This module integrates the orientation system from aphrodite-shared with the core renderer.
 */

import type {
  ViewFrame,
  AnchorTargetUnion,
  LockRule,
  AnchorLongitudeResolver,
  HouseNumber,
  SignNumber,
  AngleType,
  OrientationProgram,
  OrientationRule,
  OrientationRuntimeState,
  ChartSnapshot,
} from '@gaia-tools/aphrodite-shared/orientation';
import { getAnchorLongitude, worldToScreenAngle, lockRuleApplies, normalizeDeg } from '@gaia-tools/aphrodite-shared/orientation';

/**
 * Normalize angle to 0-360
 * Uses normalizeDeg from shared module
 */
const normalizeAngle = normalizeDeg;

/**
 * Chart data needed for orientation calculations
 */
export interface ChartDataForOrientation {
  /**
   * Planet longitudes: planet index -> longitude (0-360)
   */
  planetLongitudes?: Map<number | string, number>;

  /**
   * House cusps: house number (1-12) -> cusp longitude (0-360)
   */
  houseCusps?: Map<HouseNumber, number>;

  /**
   * Angle longitudes: angle type -> longitude (0-360)
   */
  angleLongitudes?: Map<AngleType, number>;
}

/**
 * Build chart data from RenderData for orientation calculations
 */
import type { RenderData, HouseData, PlanetData } from '../types/index.js';

export function buildChartDataFromRenderData(
  renderData: RenderData
): ChartDataForOrientation {
  const planetLongitudes = new Map<number | string, number>();
  const houseCusps = new Map<HouseNumber, number>();
  const angleLongitudes = new Map<AngleType, number>();

  // Extract planet longitudes
  if (renderData.planets) {
    for (const planet of renderData.planets) {
      planetLongitudes.set(planet.planet, planet.degree);
    }
  }

  // Extract house cusps (convert from 0-11 index to 1-12 house number)
  if (renderData.houses) {
    for (const house of renderData.houses) {
      const houseNumber = ((house.house + 1) % 12) || 12 as HouseNumber;
      houseCusps.set(houseNumber, house.cuspDegree);
    }
  }

  // Extract angles (ASC, MC, etc.)
  // Note: We need to calculate these from houses if not provided directly
  // ASC is typically House 1 cusp, MC is House 10 cusp
  if (renderData.houses && renderData.houses.length > 0) {
    const house1 = renderData.houses.find((h) => h.house === 0); // House 1 is index 0
    const house10 = renderData.houses.find((h) => h.house === 9); // House 10 is index 9

    if (house1) {
      angleLongitudes.set('ASC', house1.cuspDegree);
      // DESC is opposite ASC
      angleLongitudes.set('DESC', (house1.cuspDegree + 180) % 360);
    }
    if (house10) {
      angleLongitudes.set('MC', house10.cuspDegree);
      // IC is opposite MC
      angleLongitudes.set('IC', (house10.cuspDegree + 180) % 360);
    }
  }

  return {
    planetLongitudes,
    houseCusps,
    angleLongitudes,
  };
}

/**
 * Create an AnchorLongitudeResolver from chart data
 */
export function createAnchorResolver(
  data: ChartDataForOrientation
): AnchorLongitudeResolver {
  return {
    getObjectLongitude(objectId: number | string): number | null {
      return data.planetLongitudes?.get(objectId) ?? null;
    },
    getHouseCusp(houseNumber: HouseNumber): number | null {
      return data.houseCusps?.get(houseNumber) ?? null;
    },
    getSignStart(signNumber: SignNumber): number {
      // Signs always start at 0, 30, 60, ... 330
      return signNumber * 30;
    },
    getAngleLongitude(angleType: AngleType): number | null {
      return data.angleLongitudes?.get(angleType) ?? null;
    },
  };
}

/**
 * Convert a world longitude to screen angle using ViewFrame.
 * This is the main function used by renderers.
 */
export function convertToScreenAngle(
  worldLongitude: number,
  viewFrame: ViewFrame,
  chartData: ChartDataForOrientation
): number {
  const resolver = createAnchorResolver(chartData);
  const anchorLongitude = getAnchorLongitude(viewFrame.anchor, resolver);

  if (anchorLongitude === null) {
    // Fallback: use simple rotation if anchor can't be resolved
    // This maintains backward compatibility
    const offset = viewFrame.screenAngleDeg - 180; // Convert screen angle to rotation offset
    return normalizeAngle(180 - worldLongitude + offset);
  }

  return worldToScreenAngle(worldLongitude, viewFrame, anchorLongitude);
}

/**
 * Check if an element should be locked based on LockRules
 */
export function shouldLockElement(
  elementType: 'object' | 'house' | 'sign' | 'angle',
  elementId: number | string | HouseNumber | SignNumber | AngleType,
  locks: LockRule[]
): boolean {
  return locks.some((lock) => lockRuleApplies(lock, elementType, elementId));
}

/**
 * Get the lock frame for an element (if locked)
 */
export function getLockFrameForElement(
  elementType: 'object' | 'house' | 'sign' | 'angle',
  elementId: number | string | HouseNumber | SignNumber | AngleType,
  locks: LockRule[]
): LockFrame | null {
  const applicableLock = locks.find((lock) =>
    lockRuleApplies(lock, elementType, elementId)
  );
  return applicableLock?.frame ?? null;
}

/**
 * Calculate the effective longitude for an element considering locks.
 * If locked to 'screen', returns the current screen position.
 * If locked to 'follow-anchor', maintains offset from anchor.
 * Otherwise, uses world longitude.
 */
export function getEffectiveLongitude(
  worldLongitude: number,
  elementType: 'object' | 'house' | 'sign' | 'angle',
  elementId: number | string | HouseNumber | SignNumber | AngleType,
  viewFrame: ViewFrame,
  chartData: ChartDataForOrientation,
  locks: LockRule[]
): number {
  const lockFrame = getLockFrameForElement(elementType, elementId, locks);

  if (!lockFrame) {
    // Not locked, use world longitude
    return worldLongitude;
  }

  if (lockFrame === 'screen') {
    // Locked to screen - this means it should stay at its current screen position
    // For now, we'll use the world longitude converted to screen, then back
    // In practice, you might want to store the screen position separately
    const screenAngle = convertToScreenAngle(worldLongitude, viewFrame, chartData);
    // Convert back to world (this is a simplification - actual implementation
    // might need to track screen positions separately)
    return worldLongitude;
  }

  if (lockFrame === 'world') {
    // Locked to world coordinates - use as-is
    return worldLongitude;
  }

  // For 'houses' or 'signs' frame locks, we maintain relative position
  // This is handled by the ViewFrame conversion
  return worldLongitude;
}

/**
 * Get which house (1-12) a longitude falls in based on house cusps
 */
function getHouseForLongitude(
  longitude: number,
  houseCusps: Map<HouseNumber, number>
): number | null {
  if (!houseCusps || houseCusps.size === 0) {
    return null;
  }

  const normalizedLon = normalizeAngle(longitude);
  
  // Sort house cusps by longitude
  const sortedHouses = Array.from(houseCusps.entries())
    .map(([houseNum, cusp]) => ({ houseNum, cusp: normalizeAngle(cusp) }))
    .sort((a, b) => a.cusp - b.cusp);

  // Find which house contains this longitude
  for (let i = 0; i < sortedHouses.length; i++) {
    const current = sortedHouses[i];
    const next = sortedHouses[(i + 1) % sortedHouses.length];
    
    // Handle wrap-around case (house 12 to house 1)
    if (next.cusp < current.cusp) {
      // This is the last house before wrap
      if (normalizedLon >= current.cusp || normalizedLon < next.cusp) {
        return current.houseNum;
      }
    } else {
      // Normal case
      if (normalizedLon >= current.cusp && normalizedLon < next.cusp) {
        return current.houseNum;
      }
    }
  }

  // Fallback: return first house if we can't determine
  return sortedHouses[0]?.houseNum ?? null;
}

/**
 * Check if a rule should be triggered based on chart state
 */
function ruleTriggered(
  rule: OrientationRule,
  chart: ChartSnapshot,
  state: OrientationRuntimeState
): boolean {
  const { trigger } = rule;

  switch (trigger.type) {
    case 'ascLeavesHouse': {
      const ascLon = chart.angleLongitudes?.get('ASC');
      if (ascLon === undefined || !chart.houseCusps) {
        return false;
      }

      const currentHouse = getHouseForLongitude(ascLon, chart.houseCusps);
      const targetHouse = trigger.house;

      // Check if we've already applied this rule
      if (state.appliedRuleIds.has(rule.id)) {
        return false;
      }

      // Trigger when ASC moves from target house to next house
      if (currentHouse === targetHouse) {
        // Check previous state to see if it was in a different house
        const prevKey = `ASC:${targetHouse}`;
        const prevHouse = state.previousHousePositions?.get(prevKey);
        if (prevHouse !== undefined && prevHouse !== targetHouse) {
          // ASC was in target house, now check if it's moved to next
          const nextHouse = ((targetHouse % 12) + 1) as HouseNumber;
          // We'll update state when applying the rule
          return true;
        }
      }

      // Check if ASC just left the target house
      const prevKey = `ASC:${targetHouse}`;
      const prevHouse = state.previousHousePositions?.get(prevKey);
      if (prevHouse === targetHouse && currentHouse !== targetHouse) {
        return true;
      }

      return false;
    }

    case 'planetCrossesHouse': {
      const planetLon = chart.planetLongitudes?.get(trigger.planet);
      if (planetLon === undefined || !chart.houseCusps) {
        return false;
      }

      const currentHouse = getHouseForLongitude(planetLon, chart.houseCusps);
      const targetHouse = trigger.house as HouseNumber;

      // Check if planet just crossed into target house
      const prevKey = `${trigger.planet}:${targetHouse}`;
      const prevHouse = state.previousHousePositions?.get(prevKey);
      
      if (currentHouse === targetHouse && prevHouse !== targetHouse) {
        return true;
      }

      return false;
    }

    case 'planetCrossesAngle': {
      const planetLon = chart.planetLongitudes?.get(trigger.planet);
      const angleLon = chart.angleLongitudes?.get(trigger.angle);
      
      if (planetLon === undefined || angleLon === undefined) {
        return false;
      }

      // Check if planet is within a small orb of the angle (e.g., 1 degree)
      const orb = 1; // degrees
      const diff = Math.abs(normalizeDeg(planetLon - angleLon));
      const minDiff = Math.min(diff, 360 - diff);
      
      return minDiff <= orb;
    }

    case 'custom':
      // Custom triggers are handled by the application
      return false;

    default:
      return false;
  }
}

/**
 * Apply a rule's effect to the current frame
 */
function applyRule(
  rule: OrientationRule,
  frame: ViewFrame,
  locks: LockRule[],
  chart: ChartSnapshot,
  state: OrientationRuntimeState
): { frame: ViewFrame; extraLocks: LockRule[]; newState: OrientationRuntimeState } {
  const { effect } = rule;
  let newFrame = { ...frame };
  const extraLocks: LockRule[] = [];
  const newState: OrientationRuntimeState = {
    appliedRuleIds: new Set(state.appliedRuleIds),
    previousHousePositions: new Map(state.previousHousePositions),
  };

  // Mark rule as applied
  newState.appliedRuleIds.add(rule.id);

  // Update previous house positions
  if (!newState.previousHousePositions) {
    newState.previousHousePositions = new Map();
  }

  // Track current positions for next evaluation
  if (chart.houseCusps) {
    // Track ASC position
    const ascLon = chart.angleLongitudes?.get('ASC');
    if (ascLon !== undefined) {
      const ascHouse = getHouseForLongitude(ascLon, chart.houseCusps);
      if (ascHouse !== null) {
        newState.previousHousePositions.set(`ASC:${ascHouse}`, ascHouse);
      }
    }

    // Track planet positions
    if (chart.planetLongitudes) {
      for (const [planetId, lon] of chart.planetLongitudes.entries()) {
        const house = getHouseForLongitude(lon, chart.houseCusps);
        if (house !== null) {
          newState.previousHousePositions.set(`${planetId}:${house}`, house);
        }
      }
    }
  }

  switch (effect.type) {
    case 'rotate': {
      const delta = effect.delta;
      
      // Apply rotation by adjusting screenZero
      if (newFrame.worldZero !== undefined && newFrame.screenZero !== undefined) {
        // New model: adjust screenZero
        newFrame.screenZero = normalizeDeg(newFrame.screenZero + delta);
      } else {
        // Legacy model: adjust screenAngleDeg
        newFrame.screenAngleDeg = normalizeDeg(newFrame.screenAngleDeg + delta);
      }
      break;
    }

    case 'setViewFrame': {
      newFrame = effect.viewFrame;
      break;
    }

    case 'mirror': {
      // Toggle direction between 1 and -1
      if (newFrame.worldZero !== undefined && newFrame.screenZero !== undefined) {
        // New model: toggle direction
        newFrame.direction = (newFrame.direction === -1 ? 1 : -1) as 1 | -1;
      } else {
        // Legacy model: toggle between 'cw' and 'ccw'
        newFrame.direction = newFrame.direction === 'cw' ? 'ccw' : 'cw';
      }
      break;
    }
  }

  // Add rule-specific locks
  if (rule.locks) {
    extraLocks.push(...rule.locks);
  }

  return { frame: newFrame, extraLocks, newState };
}

/**
 * Evaluate an orientation program and return the resulting frame and locks
 */
export function evalOrientationProgram(
  program: OrientationProgram,
  chart: ChartSnapshot,
  previousState?: OrientationRuntimeState
): { frame: ViewFrame; locks: LockRule[]; state: OrientationRuntimeState } {
  const { baseFrame, locks = [], rules = [] } = program;
  
  let frame = baseFrame;
  let extraLocks: LockRule[] = [];
  let state: OrientationRuntimeState = previousState ?? {
    appliedRuleIds: new Set<string>(),
    previousHousePositions: new Map(),
  };

  // Evaluate each rule in order
  for (const rule of rules) {
    if (ruleTriggered(rule, chart, state)) {
      const result = applyRule(rule, frame, locks, chart, state);
      frame = result.frame;
      extraLocks.push(...result.extraLocks);
      state = result.newState;
    }
  }

  return {
    frame,
    locks: locks.concat(extraLocks),
    state,
  };
}

