const key = route => `labbaik-progress-v1-${route}`;

export function getCompleted(route) {
    try { return Math.max(0, Number(localStorage.getItem(key(route))) || 0); }
    catch { return 0; }
}

export function saveCompleted(route, stage) {
    try { localStorage.setItem(key(route), String(Math.max(getCompleted(route), Number(stage) || 0))); }
    catch { /* Progress remains available for this active session. */ }
}

export function reset(route) {
    try { localStorage.removeItem(key(route)); } catch { }
}
