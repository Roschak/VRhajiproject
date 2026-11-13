const fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/VRHaji.Web/wwwroot/js/vr/engine.js','utf8');
const body=source.split('    _walkableStatic(x, z, pad = 0, level = this.navigationLevel || 0) {')[1].split('    /** Terhalang figur')[0];
const indexed=new Function('x','z','pad','level',body.slice(0,body.lastIndexOf('}')));
const e={walkRects:[],walkCircles:[],blockers:[]};
for(let i=0;i<1500;i++)e.blockers.push({x1:(i%50)*12-300,z1:Math.floor(i/50)*12-180,x2:(i%50)*12-293,z2:Math.floor(i/50)*12-173});
function check(){
 for(let i=0;i<2000;i++)for(const pad of [0,.2,.45,2,3]){
  const x=(i*37.17%650)-325,z=(i*19.43%400)-200;
  const expected=!e.blockers.some(b=>!b.disabled&&x>b.x1-pad&&x<b.x2+pad&&z>b.z1-pad&&z<b.z2+pad);
  assert.equal(indexed.call(e,x,z,pad,0),expected,`${x}, ${z}, ${pad}`);
 }
}
check();e.blockers[300].disabled=true;check();e.blockers.push({x1:-20,z1:-20,x2:20,z2:20});check();
e.blockers=[{x1:-300,z1:-180,x2:300,z2:180}];check();
console.log('PASS: indexed collision matches exhaustive scan, including margins, disabled doors, added blockers and replaced arrays.');
