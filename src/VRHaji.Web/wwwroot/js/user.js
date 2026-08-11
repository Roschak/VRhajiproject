/** Identitas anonim pengguna, disimpan di localStorage browser. */
export function getUserId() {
    let id = localStorage.getItem('vrhaji_user');
    if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2));
        localStorage.setItem('vrhaji_user', id);
    }
    return id;
}

export function hasSeenAnnouncement() {
    return sessionStorage.getItem('vrhaji_announcement_session') === 'true';
}

export function setAnnouncementSeen() {
    sessionStorage.setItem('vrhaji_announcement_session', 'true');
}
