import re

file_path = r'D:\sertifikat\VRhajisource\src\VRHaji.Web\wwwroot\js\vr\engine.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Import
if 'import { ChunkManager }' not in content:
    content = content.replace("export { THREE };", "export { THREE };\nimport { ChunkManager } from './chunkManager.js';")

# 2. Instantiate in constructor
if 'this.chunkManager = new ChunkManager(this);' not in content:
    content = content.replace("this.dolly.name = 'xr-rig';", "this.dolly.name = 'xr-rig';\n        this.chunkManager = new ChunkManager(this); // Minecraft-style VR chunk optimization")

# 3. Call update in _tick
if 'this.chunkManager.update();' not in content:
    content = content.replace("if (this.waypoint && this._waypointRing) {", "if (this.chunkManager) this.chunkManager.update();\n            if (this.waypoint && this._waypointRing) {")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully integrated ChunkManager into engine.js.")
