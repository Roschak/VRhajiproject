import { walkingRoute } from './walking-route.js';

// Sample the full public terminal, including aisles between seats and counters.
export function airportDestinations(local) {
 const points=[];
 for(let z=-26;z<=26;z+=4)for(let x=-40;x<=40;x+=4){
  if(local.blockers.some(b=>!b.disabled&&x>b.x1-.65&&x<b.x2+.65&&z>b.z1-.65&&z<b.z2+.65))continue;
  if(local.walkRects.some(r=>x>r.x1+.5&&x<r.x2-.5&&z>r.z1+.5&&z<r.z2-.5))points.push({x,z});
 }
 return points;
}

export function nextAirportRoute(local,start,points,random=Math.random) {
 for(let attempt=0;attempt<6;attempt++){
  const goal=points[Math.floor(random()*points.length)];
  if(!goal||Math.hypot(goal.x-start.x,goal.z-start.z)<18)continue;
  const route=walkingRoute(local,start,goal);
  if(route.length>1)return route;
 }
 return [];
}
