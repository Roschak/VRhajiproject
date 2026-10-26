/** One page, renderer and WebXR session for the entire journey. */
import { Engine } from './engine.js';
import { JourneyWorld } from './journey-world.js';
import { JourneyUI } from './journey-ui.js';
import { MissionContext, runMission } from './journey-missions.js';
import { ROUTES } from './route-missions.js';
import { loadPreferences } from '../game-preferences.js';
import { attachPlayerAvatar } from '../player-avatar.js';
import { appearanceAtMission, setRitualAppearance } from '../character-ritual.js';

let journey = null;

export async function preload(containerId, sceneNo, dotnetRef, route = 'haji') {
    if (journey) return;
    const index = Number(sceneNo);
    const missions = ROUTES[route];
    if (!missions || !Number.isInteger(index) || index < 1 || index > missions.length) throw new Error('Tahap tidak valid');
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Wadah simulasi tidak ditemukan');
    const engine = new Engine(container);
    engine.dotnet = dotnetRef;
    const preferences = loadPreferences();
    engine.setGraphicsOptions(preferences);
    engine.audio.volume = preferences.volume;
    engine.narrator.enabled = preferences.narration;
    engine.lookSensitivity = preferences.sensitivity;
    engine.snapAngle = preferences.snapAngle;
    const world = new JourneyWorld(engine), ui = new JourneyUI(engine), lifetime = new AbortController();
    const state = { engine, world, ui, lifetime, index, route, missions, status: 'loading', running: null, saved: new Set() };
    journey = state;
    setRitualAppearance(engine, appearanceAtMission(index, route));
    state.avatarPromise = attachPlayerAvatar(engine, preferences, lifetime.signal)
        .then(avatar => { state.avatar = avatar; })
        .catch(error => { if (!lifetime.signal.aborted) console.warn('Avatar belum tersedia:', error); });
    try {
        engine.setEnvironment('day');
        // Register the connected route immediately; scenery loads lazily as areas are visited
        // so lower-powered headsets do not sit behind one large loading screen.
        world.prepareRoads();
        lifetime.signal.throwIfAborted();
        const mission = missions[index - 1];
        world.spawn(mission.location, ...mission.spawn);
        engine.setProgress(0);
        state.status = 'ready';
        // Engine owns the single enterVR handler and XR lifecycle listeners.
        const button = document.createElement('button');
        button.id = 'vr-skip-step-btn'; button.className = 'btn btn--ghost journey-skip';
        button.textContent = 'Lewati langkah latihan';
        button.onclick = () => { if (state.status === 'running' && !ui.pending) engine.skipStep(); };
        document.getElementById('vr-root').append(button);
    } catch (error) { if (journey === state) dispose(); throw error; }
}

/** Return immediately to Blazor; one sequential runner owns the journey lifetime. */
export function start() {
    const state = journey;
    if (!state || state.running || state.status === 'complete') return;
    state.engine.audio.ensure(); state.engine.setUiOpen(false);
    const running = runJourney(state);
    state.running = running;
    void running.finally(() => { if (state.running === running) state.running = null; });
}

async function runJourney(state) {
    const { engine, world, ui, lifetime, missions, route } = state;
    const context = new MissionContext(engine, world, ui, lifetime.signal);
    try {
        while (state.index <= missions.length) {
            context.check();
            const mission = missions[state.index - 1];
            setRitualAppearance(engine, appearanceAtMission(state.index, route));
            state.status = 'running';
            await context.wait(engine.dotnet.invokeMethodAsync('OnSceneHotSwapped', state.index));
            engine.setObjective(mission.title); engine.setProgress(0);
            engine.setHint('Ikuti penunjuk misi. WASD/thumbstick: jalan. Klik/trigger: interaksi. Grip: teleport dekat.');
            await context.wait(engine.fadeIn(300));
            await runMission(state.index, context, route);
            context.check();
            engine.setProgress(100); engine.narrator.stop(); engine.hideWaypoint();
            state.status = 'saving';
            // Await an idempotent save before exposing the next mission.
            if (!state.saved.has(state.index)) {
                await context.wait(engine.dotnet.invokeMethodAsync('OnSceneCompleted', true));
                state.saved.add(state.index);
            }
            const last = state.index === missions.length;
            state.status = last ? 'complete' : 'awaiting-continue';
            await context.confirm(last ? `Perjalanan ${route === 'umrah' ? 'Umrah' : 'haji'} selesai` : `Tahap ${state.index} selesai`,
                last ? 'Anda sudah kembali ke rumah. Progres tersimpan. Anda boleh tetap di sini atau keluar VR melalui tombol sistem headset.'
                : `Progres tersimpan. Misi berikutnya: ${missions[state.index].title}.`,
                [last ? 'Tetap di rumah' : 'Lanjutkan']);
            if (last) { engine.setObjective('Simulasi selesai - kembali di rumah'); return; }
            state.index++;
        }
    } catch (error) {
        if (lifetime.signal.aborted) return;
        console.error('Journey error:', error);
        state.status = 'error'; engine.narrator.stop(); engine.hideWaypoint();
        await ui.choose('Tahap belum dapat dilanjutkan',
            'Progres tahap sebelumnya tetap tersimpan. Tutup pesan ini untuk mencoba tahap sekarang kembali.', ['Coba lagi']);
        if (!lifetime.signal.aborted) {
            state.running = null;
            engine.skipStep(); engine.interactables.length = 0;
            start();
        }
    }
}

export function setUiOpen(open) { journey?.engine.setUiOpen(open); }
export function getJourneyState() {
    return journey ? { index: journey.index, route: journey.route, stages: journey.missions.length, status: journey.status,
        areas: [...journey.world.zones.keys()], xrPresenting: journey.engine.renderer.xr.isPresenting } : null;
}

/** Explicitly warm every Saudi area for map verification or a high-end device. */
export function prepareSaudiMap() { return journey?.world.prepareSaudi(); }

export function dispose() {
    const state = journey;
    if (!state) return;
    journey = null;
    state.lifetime.abort(new DOMException('Simulasi ditutup', 'AbortError'));
    state.avatar?.dispose();
    state.ui.close(); state.engine.skipStep(); state.engine.narrator.stop();
    state.world.dispose(); state.engine.dispose();
    document.getElementById('vr-skip-step-btn')?.remove();
}
