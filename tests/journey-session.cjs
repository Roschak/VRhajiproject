const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const data=new Map();global.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const code=fs.readFileSync('src/VRHaji.Web/wwwroot/js/journey-session.js','utf8'),s=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 assert.equal(s.getResumeStage('haji'),0);s.saveSession('haji',{index:8,departure:{inventory:['passport']}});s.saveSession('umrah',{index:3});assert.equal(s.getResumeStage('haji'),8);assert.equal(s.getResumeStage('umrah'),3);
 data.set('vrhaji-departure-v1-haji','{}');data.set('labbaik-progress-v1-haji','7');s.restartRoute('haji');assert.equal(s.getResumeStage('haji'),0);assert.equal(s.getResumeStage('umrah'),3);assert.equal(data.has('vrhaji-departure-v1-haji'),false);
 data.set('vrhaji-session-v1-haji','bad json');assert.equal(s.getResumeStage('haji'),0);
 s.saveSession('haji',{index:13});assert.equal(s.getResumeStage('haji'),0);
 global.localStorage.setItem=()=>{throw Error('storage unavailable');};assert.equal(s.saveSession('haji',{index:1}),false);
 console.log('PASS: active-stage persistence, route isolation, restart cleanup, invalid save and unavailable storage.');
})().catch(e=>{console.error(e);process.exitCode=1;});
