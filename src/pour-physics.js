// Meet the lower rim at the mouth plane, so the tea spills over the lip.
export const POUR_SOURCE={x:-.235,y:1.847,z:.025};
export const POUR_RADIUS=.052;

export function flightTime(height, downwardSpeed = .48, gravity = 8.8) {
  return (Math.sqrt(downwardSpeed * downwardSpeed + 2 * gravity * Math.max(0,height)) - downwardSpeed) / gravity;
}

export function pourPoint(start, impactY, horizontalSpeed, fraction, downwardSpeed=.48, depthSpeed=0) {
  const duration=flightTime(start.y-impactY,downwardSpeed),t=duration*fraction;
  return {x:start.x+horizontalSpeed*t,y:start.y-downwardSpeed*t-4.4*t*t,z:start.z+depthSpeed*t};
}

export function flowRadius(fraction, height, strength=1, downwardSpeed=.48, horizontalSpeed=0, depthSpeed=0) {
  const initialSpeed=Math.hypot(downwardSpeed,horizontalSpeed,depthSpeed);
  const vy=downwardSpeed+8.8*flightTime(height,downwardSpeed)*fraction;
  const speed=Math.hypot(vy,horizontalSpeed,depthSpeed);
  return POUR_RADIUS*Math.sqrt(initialSpeed/Math.max(.001,speed))*strength;
}
