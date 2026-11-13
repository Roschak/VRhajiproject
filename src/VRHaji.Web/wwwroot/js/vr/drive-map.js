// Local schematic of the compressed simulation journey; no online map services.
const route=[[36,218],[36,172],[92,172],[92,133],[172,133],[224,81],[281,81],[281,48],[320,48]];
export function createDriveMap({returning=false}={}){
 const panel=document.createElement('div');panel.className='drive-map';
 panel.innerHTML='<strong></strong><canvas width="360" height="260" role="img"></canvas><small class="drive-map-status"></small><small>Peta simulasi · perjalanan dipercepat</small>';
 panel.querySelector('strong').textContent=returning?'Soekarno-Hatta → Jakarta':'Jakarta → Soekarno-Hatta';
 document.getElementById('vr-root').append(panel);
 const canvas=panel.querySelector('canvas'),g=canvas.getContext('2d'),status=panel.querySelector('.drive-map-status');
 const base=document.createElement('canvas');base.width=360;base.height=260;const ctx=base.getContext('2d');
 ctx.fillStyle='#173c3a';ctx.fillRect(0,0,360,260);
 for(const [x,y,w,h] of [[9,24,62,77],[10,113,62,35],[106,151,51,45],[108,209,78,29],[185,158,55,77],[250,113,96,48],[256,183,90,55]]){
  ctx.fillStyle='#254c46';ctx.fillRect(x,y,w,h);
  for(let bx=x+7;bx<x+w-12;bx+=19)for(let by=y+7;by<y+h-9;by+=17){ctx.fillStyle='#41645a';ctx.fillRect(bx,by,11,9);}
 }
 ctx.fillStyle='#386849';ctx.fillRect(111,27,68,61);ctx.fillStyle='#82a77e';ctx.font='10px sans-serif';ctx.fillText('Taman',125,61);
 function path(c,points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
 for(const road of [[[10,112],[176,112]],[[73,16],[73,238]],[[12,198],[180,198]],[[174,19],[174,240]],[[244,100],[244,241]],[[193,173],[345,173]]])path(ctx,road,'#688078',4);
 path(ctx,route,'#88958d',15);path(ctx,route,'#354b4c',11);
 ctx.setLineDash([3,6]);path(ctx,route,'#d9d4b4',1);ctx.setLineDash([]);
 ctx.fillStyle='#a6b9af';ctx.fillRect(300,27,44,14);ctx.fillStyle='#263e44';ctx.fillRect(201,9,146,8);
 ctx.strokeStyle='#d3ded6';ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(206,13);ctx.lineTo(340,13);ctx.stroke();ctx.setLineDash([]);
 ctx.font='bold 11px sans-serif';ctx.fillStyle='#f1efda';
 for(const [label,x,y] of [['JAKARTA',14,248],['Jalan raya',45,161],['Tol bandara',178,103],['SOEKARNO-HATTA',231,68],['Terminal',304,24]])ctx.fillText(label,x,y);
 const points=returning?[...route].reverse():route;
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0);let disposed=false,lastDraw=-Infinity;
 function draw(value){
  if(disposed)return;const progress=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
  if(performance.now()-lastDraw<150&&progress>0&&progress<1)return;lastDraw=performance.now();
  g.drawImage(base,0,0);path(g,points,'#6eb4c2',3);
  let remaining=total*progress,position=points[0],heading=0;const travelled=[points[0]];
  for(let i=0;i<lengths.length;i++){
   const a=points[i],b=points[i+1],length=lengths[i];heading=Math.atan2(b[1]-a[1],b[0]-a[0]);
   if(remaining<=length){const t=remaining/length;position=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];travelled.push(position);break;}
   remaining-=length;position=b;travelled.push(b);
  }
  path(g,travelled,'#f2cf65',4);
  points.filter((_,i)=>i===0||i===points.length-1).forEach(([x,y],i)=>{g.beginPath();g.arc(x,y,5,0,Math.PI*2);g.fillStyle=i?'#ffffff':'#8fbe92';g.fill();});
  g.save();g.translate(...position);g.rotate(heading);g.beginPath();g.moveTo(10,0);g.lineTo(-6,-6);g.lineTo(-3,0);g.lineTo(-6,6);g.closePath();g.fillStyle='#ffdd70';g.fill();g.strokeStyle='#17302d';g.lineWidth=2;g.stroke();g.restore();
  const forward=returning?1-progress:progress;
  const area=forward<.2?'Jalan kota Jakarta':forward<.43?'Jalan raya Jakarta':forward<.8?'Tol bandara':forward<.96?'Akses terminal':'Terminal Soekarno-Hatta';
  status.textContent=progress===1?`Tiba di ${returning?'Jakarta':'Bandara Soekarno-Hatta'} · 100%`:`${area} · ${Math.round(progress*100)}%`;
  canvas.setAttribute('aria-label',status.textContent);
 }
 draw(0);
 return {update:draw,dispose(){disposed=true;panel.remove();}};
}
