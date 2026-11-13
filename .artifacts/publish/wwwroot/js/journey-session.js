const key=route=>`vrhaji-session-v1-${route}`;
export function loadSession(route){
 try{const s=JSON.parse(localStorage.getItem(key(route)));const max=route==='umrah'?6:12;
  return s?.version===1&&s.route===route&&Number.isInteger(s.index)&&s.index>=1&&s.index<=max?s:null;
 }catch{return null;}
}
export function getResumeStage(route){return loadSession(route)?.index||0;}
export function saveSession(route,state){try{localStorage.setItem(key(route),JSON.stringify({...state,version:1,route,updatedAt:Date.now()}));return true;}catch{return false;}}
export function clearSession(route){try{localStorage.removeItem(key(route));}catch{}}
export function restartRoute(route){clearSession(route);try{localStorage.removeItem(`vrhaji-departure-v1-${route}`);localStorage.removeItem(`labbaik-progress-v1-${route}`);}catch{}}
