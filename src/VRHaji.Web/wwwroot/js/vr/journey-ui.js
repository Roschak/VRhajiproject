import * as THREE from 'three';

/** One interaction surface for mouse, touch and WebXR controller rays. */
export class JourneyUI {
    constructor(engine) { this.engine = engine; this.pending = null; }

    choose(title, text, choices = ['Lanjutkan']) {
        this.close();
        const engine = this.engine;
        engine.locomotionLocked = true;
        engine.setUiOpen(false);
        engine.setObjective(title);
        engine.subtitle(text);
        const group = new THREE.Group();
        group.name = 'journey-dialog';
        const head = engine.playerPos(new THREE.Vector3());
        const yaw = engine.playerYaw();
        group.position.set(head.x - Math.sin(yaw) * 2.6, head.y, head.z - Math.cos(yaw) * 2.6);
        group.rotation.y = yaw;
        group.visible = engine.renderer.xr.isPresenting;
        engine.scene.add(group);
        const visibility = engine.onUpdate(() => { group.visible = engine.renderer.xr.isPresenting; });
        const resources = [];
        const panel = (label, width, height, y, color, font = 36) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024; canvas.height = Math.round(1024 * height / width);
            const g = canvas.getContext('2d');
            g.fillStyle = color; g.fillRect(0, 0, canvas.width, canvas.height);
            g.fillStyle = '#ffffff'; g.font = `${font}px sans-serif`; g.textAlign = 'center';
            const lines = wrap(g, label, 930);
            const lineHeight = font * 1.3;
            lines.forEach((line, i) => g.fillText(line, 512, (canvas.height - lines.length * lineHeight) / 2 + (i + .9) * lineHeight));
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({ map: texture, depthTest: false, toneMapped: false });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
            mesh.position.y = y; mesh.renderOrder = 10000; group.add(mesh);
            resources.push(mesh, texture);
            return mesh;
        };
        panel(`${title}\n${text}`, 2.5, .95, .25, '#102d29', 37);
        const dom = document.createElement('div');
        dom.className = 'journey-dialog'; dom.setAttribute('role', 'dialog');
        dom.setAttribute('aria-label', title);
        const heading = document.createElement('h2'); heading.textContent = title;
        const body = document.createElement('p'); body.textContent = text;
        dom.append(heading, body); document.getElementById('vr-root').append(dom);
        return new Promise(resolve => {
            this.pending = { group, resources, dom, resolve, visibility };
            choices.forEach((choice, index) => {
                const mesh = panel(choice, 2.3, .25, -.4 - index * .31, '#476638', 50);
                const select = () => { if (this.pending?.group === group) this.close(index); };
                engine.addInteractable(mesh, { label: choice, onClick: select, radius: 8 });
                const button = document.createElement('button'); button.className = 'btn btn--gold';
                button.textContent = choice; button.onclick = select; dom.append(button);
            });
        });
    }

    close(result = null) {
        const pending = this.pending;
        if (!pending) return;
        this.pending = null;
        pending.visibility.done = true;
        for (const item of pending.resources) {
            if (item.isMesh) {
                this.engine.removeInteractable(item);
                item.geometry.dispose(); item.material.dispose();
            } else item.dispose();
        }
        pending.group.removeFromParent(); pending.dom.remove();
        this.engine.locomotionLocked = false;
        pending.resolve(result);
    }
}

function wrap(g, text, width) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
        let line = '';
        for (const word of paragraph.split(/\s+/)) {
            if (line && g.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
            line += (line ? ' ' : '') + word;
        }
        if (line) lines.push(line);
    }
    return lines;
}
