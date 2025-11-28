// js/online/match.js (Matching Logic)
let roomId = "", myRole = ""; 

function joinFriendRoom(id) {
    roomId = id;
    db.ref('rooms/' + roomId).get().then((snap) => {
        const d = snap.val();
        if(!d || !d.p1) { myRole = "p1"; createWaitingRoom(); } 
        else if(!d.p2) { myRole = "p2"; db.ref('rooms/'+roomId).update({ p2: { active: true }, status: "setup" }); showMatchedAnimation(); } 
        else { alert("満員です"); currentInput = []; updateInputDisplay(); }
    });
}

function createWaitingRoom() {
    db.ref(`rooms/${roomId}/p1`).onDisconnect().remove();
    db.ref('rooms/' + roomId).update({ p1: { active: true }, status: "waiting", turnCount: 1, currentTurn: "p1" });
    document.getElementById('gameMessage').innerText = "友達の入室を待っています...";
    document.getElementById('friendLobby').innerHTML = `<div class='overlay-title'>待機中...<br>合言葉: ${roomId}</div>`;
    document.getElementById('callBtn').classList.add('disabled');
    db.ref(`rooms/${roomId}/p2`).on('value', (s) => { if(s.exists()) showMatchedAnimation(); });
}

window.startRandomMatching = function() {
    document.getElementById('searchBtnContainer').classList.add('hidden');
    document.getElementById('searchingContainer').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "対戦相手を探しています...";
    SE.click(); simpleRandomLogic();
};

function simpleRandomLogic() {
    const waitRef = db.ref('waiting_room');
    waitRef.get().then((snap) => {
        if(snap.exists()) {
            const target = snap.val();
            waitRef.remove().then(() => {
                roomId = target; myRole = "p2";
                db.ref(`rooms/${roomId}`).update({ p2: { active: true }, status: "setup" }); showMatchedAnimation();
            }).catch(() => setTimeout(simpleRandomLogic, 500));
        } else {
            roomId = db.ref('rooms').push().key; myRole = "p1";
            db.ref(`rooms/${roomId}/p1`).onDisconnect().remove();
            db.ref(`rooms/${roomId}`).set({ p1: { active: true }, status: "waiting", turnCount: 1, currentTurn: "p1" });
            waitRef.set(roomId); waitRef.onDisconnect().remove();
            db.ref(`rooms/${roomId}/p2`).on('value', (s) => { if(s.exists()) { db.ref('waiting_room').remove(); showMatchedAnimation(); } });
        }
    });
}

function showMatchedAnimation() {
    SE.matched();
    const ov = document.getElementById('matchedOverlay');
    ov.classList.remove('hidden');
    setTimeout(() => { ov.classList.add('hidden'); window.initOnlineSetup(); }, 2000);
}
