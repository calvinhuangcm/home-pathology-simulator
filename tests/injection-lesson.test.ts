import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInjectionLessonState,
  findCrackIntersection,
  resetInjection,
  toggleInjection,
  updateInjectionLesson,
  updateLessonGeometry,
} from '../src/lesson/injectionLessonModel';

test('the default oblique bore intersects the modeled fracture inside the wall', () => {
  const state = createInjectionLessonState();
  const intersection = findCrackIntersection(state);
  assert.equal(intersection.connected, true);
  assert.ok(intersection.boreDepthCm > 12 && intersection.boreDepthCm < state.boreDepthCm);
  assert.ok(intersection.distanceCm < 1.8);
});

test('changing azimuth or stopping the bore short can miss the fracture', () => {
  const state = createInjectionLessonState();
  updateLessonGeometry(state, { ...state, azimuthDeg: 270 });
  assert.equal(findCrackIntersection(state).connected, false);
  updateLessonGeometry(state, { ...state, azimuthDeg: 105, boreDepthCm: 5, needleDepthCm: 5 });
  assert.equal(findCrackIntersection(state).connected, false);
});

test('injected material advances along a connected bore and then into the crack', () => {
  const state = createInjectionLessonState();
  assert.equal(toggleInjection(state), true);
  for (let i = 0; i < 120; i += 1) updateInjectionLesson(state, 1 / 60);
  assert.ok(state.injectedMl > 70);
  assert.equal(state.boreFlowFrontCm, state.boreDepthCm);
  assert.ok(state.crackFlowLengthCm > 1);
  assert.equal(toggleInjection(state), false);
  const volume = state.injectedMl;
  updateInjectionLesson(state, 1);
  assert.equal(state.injectedMl, volume);
});

test('an unconnected bore only fills its bore, and reset clears the teaching injection', () => {
  const state = createInjectionLessonState({ azimuthDeg: 270 });
  toggleInjection(state);
  for (let i = 0; i < 300; i += 1) updateInjectionLesson(state, 1 / 60);
  assert.ok(state.injectedMl > 0);
  assert.equal(state.crackFlowLengthCm, 0);
  resetInjection(state);
  assert.equal(state.injecting, false);
  assert.equal(state.injectedMl, 0);
  assert.equal(state.crackFlowLengthCm, 0);
});

test('geometry controls are bounded and needle depth cannot exceed hole depth', () => {
  const state = createInjectionLessonState({ boreDepthCm: 12, needleDepthCm: 25, tiltDeg: 89, azimuthDeg: 390 });
  assert.equal(state.boreDepthCm, 12);
  assert.equal(state.needleDepthCm, 12);
  assert.equal(state.tiltDeg, 85);
  assert.equal(state.azimuthDeg, 359);
});
