import test from 'node:test';
import assert from 'node:assert/strict';
import { flightTime, pourPoint, flowRadius } from '../src/pour-physics.js';

test('stream stays attached to the lip and reaches the liquid surface', () => {
  for (const height of [.05,.2,.7,1.5,2.5]) {
    const start={x:.2,y:height-.6,z:.305},surface=-.6;
    assert.deepEqual(pourPoint(start,surface,-.22,0),start);
    const end=pourPoint(start,surface,-.22,1);
    assert.ok(Math.abs(end.y-surface)<1e-10);
    assert.equal(end.z,start.z);
    assert.ok(Number.isFinite(end.x));
    let previous=start.y;
    for(let step=1;step<=48;step++){
      const point=pourPoint(start,surface,-.22,step/48);
      assert.ok(point.y<previous);previous=point.y;
    }
  }
});

test('accelerating flow narrows while conserving cross-sectional flow', () => {
  for(const height of [.1,1,2.5]){
    const initial=flowRadius(0,height)**2*.48;
    for(const fraction of [.25,.5,.75,1]){
      const speed=.48+8.8*flightTime(height)*fraction;
      assert.ok(flowRadius(fraction,height)<flowRadius(0,height));
      assert.ok(Math.abs(flowRadius(fraction,height)**2*speed-initial)<1e-10);
    }
  }
});

test('a stopped pour has no stream and zero-height flight is finite', () => {
  assert.equal(flowRadius(.5,1,0),0);
  assert.equal(flightTime(0),0);
  assert.equal(flightTime(-1),0);
});

test('an angled jet exits continuously and reaches the glass at every tested tilt', () => {
  const start={x:.3,y:1.2,z:.2},surface=-1;
  for(const [vx,down,vz] of [[-.92,.025,.02],[-.87,.30,.01],[-.75,.5,-.025]]){
    const duration=flightTime(start.y-surface,down);
    assert.deepEqual(pourPoint(start,surface,vx,0,down,vz),start);
    const end=pourPoint(start,surface,vx,1,down,vz);
    assert.ok(Math.abs(end.y-surface)<1e-10);
    assert.ok(Math.abs(end.x-(start.x+vx*duration))<1e-10);
    assert.ok(Math.abs(end.z-(start.z+vz*duration))<1e-10);
    const flow=flowRadius(0,start.y-surface,1,down,vx,vz)**2*Math.hypot(vx,down,vz);
    for(const f of [.01,.25,.5,1]){
      const speed=Math.hypot(vx,down+8.8*duration*f,vz);
      assert.ok(Math.abs(flowRadius(f,start.y-surface,1,down,vx,vz)**2*speed-flow)<1e-10);
    }
  }
});

test('the stream meets the lower lip without extending past its outer edge', async()=>{
  const {POUR_SOURCE,POUR_RADIUS}=await import('../src/pour-physics.js');
  const lowerEdge=Math.hypot(POUR_SOURCE.x,POUR_SOURCE.z)+POUR_RADIUS/.78;
  assert.ok(lowerEdge>=.284&&lowerEdge<=.308);
  assert.ok(Math.abs(POUR_SOURCE.y-1.842)<=.012);
});
