// Prepare officially downloaded MIT Rocketbox GLBs for Blender (meshopt -> raw).
import fs from 'node:fs';
import {MeshoptDecoder} from '../node_modules/three/examples/jsm/libs/meshopt_decoder.module.js';
await MeshoptDecoder.ready;
for(const source of process.argv.slice(2)) {
 const file=fs.readFileSync(source), length=file.readUInt32LE(12);
 const doc=JSON.parse(file.subarray(20,20+length));
 const bin=file.subarray(28+length);let offset=0;const chunks=[];
 for(const view of doc.bufferViews||[]) {
  const ext=view.extensions?.EXT_meshopt_compression;let data;
  if(ext){data=Buffer.alloc(ext.count*ext.byteStride);MeshoptDecoder.decodeGltfBuffer(data,ext.count,ext.byteStride,bin.subarray(ext.byteOffset||0,(ext.byteOffset||0)+ext.byteLength),ext.mode,ext.filter);delete view.extensions.EXT_meshopt_compression;}
  else data=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  view.buffer=0;view.byteOffset=offset;view.byteLength=data.length;
  chunks.push(data);offset+=data.length;
  const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}
 }
 doc.buffers=[{byteLength:offset}];
 for(const key of ['extensionsUsed','extensionsRequired'])doc[key]=doc[key]?.filter(x=>x!=='EXT_meshopt_compression');
 const json=Buffer.from(JSON.stringify(doc));const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+offset,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(offset);bh.writeUInt32LE(0x004e4942,4);
 const target=source.replace('.glb','-decoded.glb');fs.writeFileSync(target,Buffer.concat([header,padded,bh,...chunks]));console.log(target);
}
