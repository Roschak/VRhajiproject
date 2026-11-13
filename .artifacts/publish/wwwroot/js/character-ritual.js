/** Appearance at the start of a saved mission. Menu ihram is preview-only. */
export function appearanceAtMission(mission, route='haji') {
    if(route==='umrah')return {ihram:mission>=2&&mission<=4,shaved:mission>=5};
    return {ihram:mission>=3&&mission<=6,shaved:mission>=7};
}
export function setRitualAppearance(engine, patch) {
    engine.characterAppearance = {...engine.characterAppearance, ...patch};
    engine.applyCharacterAppearance?.(engine.characterAppearance);
}
