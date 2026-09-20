import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { HazardEffects } from '../src/scene/HazardEffects';
import { SimulationMarkers } from '../src/scene/SimulationMarkers';
import { NetworkNodes } from '../src/scene/NetworkNodes';
import { MeshLinks } from '../src/scene/MeshLinks';
import { HazardZones } from '../src/scene/HazardZones';

console.log('=== FineLynk Phase 2 State Machine & Leak Test ===');

// Setup mock scene dependencies
const hazardZones = new HazardZones();
const hazardEffects = new HazardEffects(hazardZones);
const networkNodes = new NetworkNodes();
const meshLinks = new MeshLinks(networkNodes);
const markers = new SimulationMarkers(networkNodes, meshLinks);
const engine = new SimulationEngine(networkNodes, hazardEffects, markers);

const eventsEmitted: string[] = [];
engine.events.on('*', (e) => {
  eventsEmitted.push(`${e.type}:${e.hazardType}`);
});

// Test A: Trigger Flood
console.log('Testing single Flood lifecycle...');
const started = engine.triggerHazard('flood');
if (!started) throw new Error('Failed to start Flood simulation');

// Repeated click guard test
const duplicate = engine.triggerHazard('flood');
if (duplicate) throw new Error('Repeated click guard failed: allowed duplicate flood simulation');

// Fast-forward simulation through time steps
let time = 0;
const dt = 0.05;
const maxSteps = 150; // 7.5 seconds
for (let step = 0; step < maxSteps; step++) {
  time += dt;
  engine.update(dt);
  hazardEffects.update(dt, time);
}

// Verify events fired
console.log('Events emitted during flood cycle:', eventsEmitted);
const expectedEvents = [
  'HAZARD_DETECTED:flood',
  'BROADCAST_STARTED:flood',
  'BROADCAST_COMPLETED:flood',
  'RESCUE_DISPATCHED:flood',
  'RESCUE_ARRIVED:flood',
  'HAZARD_RESOLVED:flood',
];
for (const ev of expectedEvents) {
  if (!eventsEmitted.includes(ev)) {
    throw new Error(`Expected event ${ev} was not emitted!`);
  }
}

// Verify engine is back to idle for flood
if (engine.isHazardActive('flood')) {
  throw new Error('Flood should have completed and returned to idle');
}
console.log('Flood cycle completed successfully and returned to IDLE.');

// Test B: Multi-Hazard Concurrent Execution
console.log('Testing simultaneous Flood + Fire + Industrial...');
eventsEmitted.length = 0;
const s1 = engine.triggerHazard('flood');
const s2 = engine.triggerHazard('fire');
const s3 = engine.triggerHazard('industrial');
if (!s1 || !s2 || !s3) {
  throw new Error('Failed to start all 3 concurrent simulations');
}

for (let step = 0; step < maxSteps; step++) {
  time += dt;
  engine.update(dt);
  hazardEffects.update(dt, time);
}

if (engine.isHazardActive('flood') || engine.isHazardActive('fire') || engine.isHazardActive('industrial')) {
  throw new Error('All 3 simulations should have resolved and returned to idle');
}
console.log('All 3 concurrent simulations resolved and returned to IDLE cleanly.');

// Test C: Resource Cleanup & Leak Verification (Repeated Fire Cycles)
console.log('Testing repeated Fire cycles for memory leaks...');
for (let cycle = 0; cycle < 5; cycle++) {
  engine.triggerHazard('fire');
  for (let step = 0; step < maxSteps; step++) {
    time += dt;
    engine.update(dt);
    hazardEffects.update(dt, time);
  }
}
// Check that fire effect group has 0 lingering children
if (hazardEffects.group.children.length !== 0) {
  throw new Error(`Memory leak detected: ${hazardEffects.group.children.length} lingering objects in hazardEffects group!`);
}
console.log('Repeated fire cycles verified: exactly 0 lingering objects in memory.');

// Test D: Resource Cleanup & Leak Verification (Repeated Industrial Cycles)
console.log('Testing repeated Industrial cycles for memory leaks...');
for (let cycle = 0; cycle < 5; cycle++) {
  engine.triggerHazard('industrial');
  for (let step = 0; step < maxSteps; step++) {
    time += dt;
    engine.update(dt);
    hazardEffects.update(dt, time);
  }
}
if (hazardEffects.group.children.length !== 0) {
  throw new Error(`Memory leak detected: ${hazardEffects.group.children.length} lingering objects in hazardEffects group!`);
}
console.log('Repeated industrial cycles verified: exactly 0 lingering objects in memory.');

console.log('=== All Simulation Engine Tests Passed 100% ===');
