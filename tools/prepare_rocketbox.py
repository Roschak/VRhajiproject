"""Merge matching official Rocketbox motion channels before Blender's rig conversion."""
import json,struct,pathlib,copy
ROOT=pathlib.Path(__file__).resolve().parents[1]
def read(path):
 data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0]
 return json.loads(data[20:20+size]),bytearray(data[28+size:])
def write(path,doc,bin):
 doc['buffers']=[{'byteLength':len(bin)}]
 txt=json.dumps(doc,separators=(',',':')).encode();txt+=b' '*((-len(txt))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(txt)+len(bin))+struct.pack('<II',len(txt),0x4e4f534a)+txt+struct.pack('<II',len(bin),0x004e4942)+bin)
for gender,prefix in [('man','m'),('woman','f')]:
 doc,bin=read(ROOT/'artifacts'/f'rocketbox-{gender}-decoded.glb')
 names={node.get('name'):i for i,node in enumerate(doc['nodes'])};doc['animations']=[]
 for motion in ['idle','walk','run']:
  src,data=read(ROOT/'artifacts'/f'{prefix}-{motion}-decoded.glb')
  offset=len(bin);view_offset=len(doc['bufferViews']);accessor_offset=len(doc['accessors'])
  for view in src['bufferViews']:
   view['buffer']=0;view['byteOffset']=view.get('byteOffset',0)+offset
   doc['bufferViews'].append(view)
  for accessor in src['accessors']:
   accessor['bufferView']+=view_offset;doc['accessors'].append(accessor)
  anim=src['animations'][0];anim['name']=motion
  for sampler in anim['samplers']:
   sampler['input']+=accessor_offset;sampler['output']+=accessor_offset
  channels=[]
  for ch in anim['channels']:
   name=src['nodes'][ch['target']['node']].get('name')
   if name in names:ch['target']['node']=names[name];channels.append(ch)
  anim['channels']=channels;doc['animations'].append(anim);bin.extend(data)
 out=ROOT/'src/VRHaji.Web/wwwroot/assets/characters/source'/f'rocketbox-{gender}.glb'
 write(out,doc,bin);print(out)
