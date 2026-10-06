import test from 'node:test';
import assert from 'node:assert/strict';
import { chapters, chapterAt, storyMotion } from '../src/story-motion.js';

test('chapter links land in their matching story panels', () => {
  chapters.forEach((chapter, index) => assert.equal(chapterAt(chapter.at), index));
});

test('the bottle completes its turn before pouring and retraces it on reverse scroll', () => {
  const frames=Array.from({length:101},(_,i)=>storyMotion(i/100));
  frames.forEach((frame,i)=>{
    if(i) assert.ok(frame.yaw>=frames[i-1].yaw);
    if(i<=69) assert.equal(frame.pour,0);
    assert.deepEqual(frame,storyMotion(i/100));
  });
  assert.equal(frames[0].yaw,0);
  assert.equal(storyMotion(.69).yaw,Math.PI*2);
  assert.equal(frames[100].pour,1);
  for(let i=100;i>=0;i--) assert.deepEqual(storyMotion(i/100),frames[i]);
});

test('the pouring handoff preserves bottle position and scale', () => {
  const before=storyMotion(.69-1e-7),handoff=storyMotion(.69);
  assert.ok(Math.abs(before.x-1.05)<1e-8);
  assert.equal(handoff.scale,1.12);
  assert.ok(Math.abs(before.yaw-handoff.yaw)<1e-8);
  assert.deepEqual(storyMotion(-1),storyMotion(0));
  assert.deepEqual(storyMotion(2),storyMotion(1));
});
