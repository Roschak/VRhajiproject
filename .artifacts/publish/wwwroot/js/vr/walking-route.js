// Navigation uses the same walk boundaries and obstacles as player movement.
export function walkingRoute(engine, start, goal) {
 const level=engine.navigationLevel||0, cell=Math.hypot(goal.x-start.x,goal.z-start.z)>300?2:1;
 const buckets=new Map(),size=16;
 for(const b of engine.blockers){if(b.disabled||b.routePassable)continue;for(let x=Math.floor(b.x1/size);x<=Math.floor(b.x2/size);x++)for(let z=Math.floor(b.z1/size);z<=Math.floor(b.z2/size);z++){const k=x+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(b);}}
 const free=(x,z)=>{
  if(level===1&&!engine.haramUpperWalkable?.(x,z))return false;
  for(const b of buckets.get(Math.floor(x/size)+','+Math.floor(z/size))||[])if(x>b.x1-.23&&x<b.x2+.23&&z>b.z1-.23&&z<b.z2+.23)return false;
  return engine.walkRects.some(r=>x>=r.x1+.25&&x<=r.x2-.25&&z>=r.z1+.25&&z<=r.z2-.25)||engine.walkCircles.some(c=>{const d=Math.hypot(x-c.x,z-c.z);return d<=c.rOuter-.25&&d>=c.rInner+.25;});
 };
 const clear=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4);for(let i=1;i<=n;i++)if(!free(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;};
 if(clear(start,goal))return [{x:start.x,z:start.z},{x:goal.x,z:goal.z}];
 const heap=[],seen=new Map(),key=(x,z)=>x+','+z;
 const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const n=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return n;};
 const h=(x,z)=>Math.hypot(goal.x-x,goal.z-z);
 const first={x:start.x,z:start.z,i:0,j:0,g:0,f:h(start.x,start.z)};push(first);seen.set('0,0',0);
 let end=null,count=0;
 while(heap.length&&count++<180000){const n=pop();if(n.g!==seen.get(key(n.i,n.j)))continue;
  if(h(n.x,n.z)<cell+1.3&&clear(n,goal)){end=n;break;}
  for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const i=n.i+dx,j=n.j+dz,x=start.x+i*cell,z=start.z+j*cell,g=n.g+Math.hypot(dx,dz)*cell,k=key(i,j);
   if((seen.get(k)??Infinity)<=g||!free(x,z)||!clear(n,{x,z}))continue;
   seen.set(k,g);push({x,z,i,j,g,f:g+h(x,z)*1.04,parent:n});
  }
 }
 if(!end)return [];
 const path=[];for(let n=end;n;n=n.parent)path.push({x:n.x,z:n.z});path.reverse();if(clear(end,goal))path.push({x:goal.x,z:goal.z});
 const result=[path[0]];let i=0;
 while(i<path.length-1){let j=Math.min(path.length-1,i+80);while(j>i+1&&!clear(path[i],path[j]))j--;result.push(path[j]);i=j;}
 return result;
}
