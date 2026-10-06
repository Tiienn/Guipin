import test from 'node:test';
import assert from 'node:assert/strict';
import { CylinderGeometry } from 'three';
import { reshapeTeaVolume } from '../src/liquid-geometry.js';

test('tea stays in contact with the glass floor at every fill level',()=>{
  const geometry=new CylinderGeometry(.609,.528,1.25,96),rest=geometry.attributes.position.array.slice();
  for(const height of [.012,.15,.4,.8,1.19,.4,.012]){
    const top=reshapeTeaVolume(geometry,rest,height),positions=geometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const r=Math.hypot(positions.getX(i),positions.getZ(i));
      if(r<.01)continue; // Cap centre vertices.
      if(rest[i*3+1]<0)assert.ok(Math.abs(r-.529)<1e-6,'The liquid base must not shrink as the glass empties.');
      else assert.ok(Math.abs(r-top)<1e-6);
      assert.ok(r<.623,'Liquid must stay inside the glass rim.');
    }
  }
  geometry.dispose();
});
