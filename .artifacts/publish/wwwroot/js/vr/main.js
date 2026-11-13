/** One page, renderer and WebXR session for the entire journey. */
import {LocationSidebar} from './location-sidebar.js';
import {attachCameraView} from './camera-view.js';
import { Engine } from './engine.js';
import { JourneyWorld } from './journey-world.js';
import { JourneyUI } from './journey-ui.js';
import { MissionContext, runMission } from './journey-missions.js';
import { ROUTES } from './route-missions.js';
import { loadPreferences } from '../game-preferences.js';
import { attachPlayerAvatar } from '../player-avatar.js';
import { appearanceAtMission, setRitualAppearance } from '../character-ritual.js';
import { initDepartureState } from './departure-flow.js';
import {loadPrayerData,attachPrayerLibrary} from './prayer-guide.js';
import {loadSession,saveSession,clearSession} from '../journey-session.js';

let journey = null;

export async function preload(containerId, sceneNo, dotnetRef, route = 'haji', resume = false) {
    if (journey) return;
    const index = Number(sceneNo);
    const missions = ROUTES[route];
    if (!missions || !Number.isInteger(index) || index < 1 || index > missions.length) throw new Error('Tahap tidak valid');
    const container = document.getElementById(containerId);
    if (!container) throw new Error('Wadah simulasi tidak ditemukan');
    const engine = new Engine(container);
    engine.dotnet = dotnetRef;
    const snapshot=resume?loadSession(route):null;
    const restored=snapshot?.index===index?snapshot:null;
    const disposeDeparture = initDepartureState(engine, route, index,restored?.departure);
    const preferences = loadPreferences();
    engine.setGraphicsOptions(preferences);
    engine.audio.volume = preferences.volume;
    engine.narrator.enabled = preferences.narration;
    engine.narrator.volume = preferences.volume;
    engine.narrator.attachControls(document.getElementById('vr-root'));
    await engine.narrator.ready;
    const strings=a=>Array.isArray(a)?a.filter(x=>typeof x==='string').slice(0,600):[];
    if(restored){engine.narrator.heard=new Set(strings(restored.heard));engine.guidedLocations=new Set(strings(restored.guidedLocations));engine.readPrayers=new Set(strings(restored.readPrayers));}
    engine.lookSensitivity = preferences.sensitivity;
    engine.snapAngle = preferences.snapAngle;
    const world = new JourneyWorld(engine), ui = new JourneyUI(engine), lifetime = new AbortController();
    ui.prayers=await loadPrayerData();
    const state = { engine, world, ui, lifetime, index, route, missions, status: 'loading', running: null, saved: new Set() };
    journey = state;
    state.disposeCamera=attachCameraView(engine);
    state.locationSidebar=new LocationSidebar(state,strings(restored?.visitedLocations));
    world.locationSidebar=state.locationSidebar;
    let lastSave=0;
    const save=()=>persistJourney(state);
    const autosave=engine.onUpdate((_dt,t)=>{if(t-lastSave>=5){lastSave=t;save();}});
    const onHidden=()=>{if(document.visibilityState==='hidden')save();};
    window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',onHidden);
    state.disposeAutosave=()=>{autosave.done=true;window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',onHidden);};
    state.disposePrayer=attachPrayerLibrary(engine,ui,ui.prayers);
    state.disposeDeparture = disposeDeparture;
    setRitualAppearance(engine, appearanceAtMission(index, route));
    if (route === 'haji' && index <= 3 && engine.departureState.ihram) setRitualAppearance(engine,{ihram:true});
    state.avatarPromise = attachPlayerAvatar(engine, preferences, lifetime.signal)
        .then(avatar => { state.avatar = avatar; })
        .catch(error => { if (!lifetime.signal.aborted) console.warn('Avatar belum tersedia:', error); });
    try {
        engine.setEnvironment('day');
        // Register the connected route immediately; scenery loads lazily as areas are visited
        // so lower-powered headsets do not sit behind one large loading screen.
        world.prepareRoads();
        lifetime.signal.throwIfAborted();
        const mission = route === 'haji' && index === 2 && engine.departureState.miqatChoice === 'land'
            ? {...missions[index - 1], location:'madinah'} : missions[index - 1];
        world.spawn(mission.location, ...mission.spawn);
        state.initialLocation=mission.location;
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
    state.hasStarted=true;persistJourney(state);
    state.engine.audio.ensure(); state.engine.setUiOpen(false);
    const running = runJourney(state);
    state.running = running;
    void running.finally(() => { if (state.running === running) state.running = null; });
}

async function runJourney(state) {
    const { engine, world, ui, lifetime, missions, route } = state;
    const context = new MissionContext(engine, world, ui, lifetime.signal);
    context.location=state.initialLocation;
    try {
        while (state.index <= missions.length) {
            context.check();
            const mission = missions[state.index - 1];
            setRitualAppearance(engine, appearanceAtMission(state.index, route));
            if (route === 'haji' && state.index <= 3 && engine.departureState.ihram) setRitualAppearance(engine,{ihram:true});
            state.status = 'running';
            persistJourney(state);
            await context.wait(engine.dotnet.invokeMethodAsync('OnSceneHotSwapped', state.index));
            engine.setObjective(mission.title); engine.setProgress(0);
            await context.wait(engine.fadeIn(300));
            await context.guide(context.location);
            if(engine.haramEntryPending)await context.enterHaram();
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
            if(last)clearSession(route);else persistJourney(state);
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
        areas: [...journey.world.zones.keys()], xrPresenting: journey.engine.renderer.xr.isPresenting,
        departure: {...journey.engine.departureState}, flight: journey.engine.flightState ? {...journey.engine.flightState} : null } : null;
}

/** Explicitly warm every Saudi area for map verification or a high-end device. */
export function prepareSaudiMap() { return journey?.world.prepareSaudi(); }
export function prepareDepartureMap() {
    if (!journey) return;
    for (const key of ['home','indonesia','cabin']) journey.world.ensure(key);
}

export function dispose() {
    const state = journey;
    if (!state) return;
    persistJourney(state);state.disposeAutosave?.();
    journey = null;
    state.lifetime.abort(new DOMException('Simulasi ditutup', 'AbortError'));
    state.avatar?.dispose();
    state.disposeDeparture?.();
    state.disposePrayer?.();
    state.disposeCamera?.();
    state.locationSidebar?.dispose();
    state.ui.close(); state.engine.skipStep(); state.engine.narrator.stop();
    state.world.dispose(); state.engine.dispose();
    document.getElementById('vr-skip-step-btn')?.remove();
}

function persistJourney(state){
 if(!state.hasStarted||state.status==='complete')return;
 const index=state.status==='awaiting-continue'?Math.min(state.index+1,state.missions.length):state.index;
 saveSession(state.route,{index,visitedLocations:[...state.locationSidebar.visited],departure:state.engine.departureState,heard:[...state.engine.narrator.heard],guidedLocations:[...(state.engine.guidedLocations||[])],readPrayers:[...(state.engine.readPrayers||[])]});
}
