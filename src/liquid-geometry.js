// Match the tumbler's tapered inner wall while preserving contact at its floor.
export function reshapeTeaVolume(geometry, rest, height) {
  const positions=geometry.attributes.position,topRadius=.529+height*.062;
  for(let i=0;i<positions.count;i++){
    const k=i*3,x=rest[k],y=rest[k+1],z=rest[k+2],r=Math.hypot(x,z),t=(y+.625)/1.25;
    const radius=.529+(topRadius-.529)*t;
    positions.setXYZ(i,r?x/r*radius:0,y,r?z/r*radius:0);
  }
  positions.needsUpdate=true;
  return topRadius;
}
