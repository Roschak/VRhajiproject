const KEY = 'vrhaji_preferences_v1';
export const SKIN_TONES = Object.freeze(['#f1cfb4','#dca780','#b9825b','#956443','#70462f','#4b2f24']);
export const defaults = Object.freeze({name:'Jemaah', gender:'man', outfit:'robe', skinTone:'#b9825b', resolution:.75, shadows:false, fps:0, volume:.7, narration:true, sensitivity:1, snapAngle:30});
const choice = (v, options, fallback) => options.includes(v) ? v : fallback;
const number = (v, min, max, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
export function sanitize(value = {}) {
    const p = value && typeof value === 'object' ? value : {};
    const gender = choice(p.gender,['man','woman'],'man');
    return {name:typeof p.name === 'string' ? p.name.trim().slice(0,40) || defaults.name : defaults.name,
        gender, outfit:choice(p.outfit,gender==='man'?['robe','ihram']:['robe','abaya'],'robe'),
        skinTone:choice(p.skinTone,SKIN_TONES,defaults.skinTone),
        resolution:choice(p.resolution,[.5,.75,1],.75), shadows:p.shadows === true, fps:choice(p.fps,[0,30,60],0), volume:number(p.volume,0,1,.7), narration:p.narration !== false, sensitivity:number(p.sensitivity,.25,2,1), snapAngle:choice(p.snapAngle,[15,30,45],30)};
}
export function loadPreferences() { try { return sanitize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {...defaults}; } }
export function savePreferences(value) {
    const clean = sanitize(value);
    localStorage.setItem(KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('vrhaji-preferences',{detail:clean}));
    return clean;
}
