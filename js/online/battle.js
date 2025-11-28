// js/online/battle.js (Setup & Battle Logic)
let oppSecret = [];

window.onlineAction = function() {
    if(currentPhase === 'lobby' && MODE === 'friend') joinFriendRoom(currentInput.join(""));
    else if(currentPhase === 'setup') submitSecretOnline();
    else if(currentPhase === 'battle') window.submitGuess();
};

window.initOnlineSetup = function() {
    currentPhase = 'setup'; currentInput = []; updateInputDisplay();
    document.getElementById('lobbyArea').classList.add('hidden');
    document.getElementById('setupArea').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "番号を決めて、決定を押してください";
    document.getElementById('callBtn').classList.remove('disabled');
    document.getElementById('callBtn').innerText = "決定";
    document.getElementById('oppName').innerText = "対戦相手";
    if(myRole === 'p1') document.getElementById('badgeP1').classList.add('active');
    else document.getElementById('badgeP2').classList.add('active');
    
    const opp = (myRole==='p1')?'p2':'p1';
    db.ref(`rooms/${roomId}/${opp}`).on('value', (s) => {
        if(currentPhase!=='lobby' && !s.exists()) { alert("相手が切断しました"); location.reload(); }
    });
};

function submitSecretOnline() {
    mySecret = [...currentInput];
    db.ref(`rooms/${roomId}/${myRole}/secret`).set(mySecret);
    db.ref(`rooms/${roomId}/${myRole}/ready`).set(true);
    document.getElementById('setupStatus').classList.remove('hidden');
    document.getElementById('callBtn').classList.add('disabled');
    document.getElementById('gameMessage').innerText = "相手の決定を待っています...";
    db.ref(`rooms/${roomId}`).on('value', (s) => {
        const d = s.val();
        if(d && d.p1 && d.p1.ready && d.p2 && d.p2.ready) {
            oppSecret = d[(myRole==='p1'?'p2':'p1')].secret; startBattleOnline();
        }
    });
}

function startBattleOnline() {
    db.ref(`rooms/${roomId}`).off();
    currentPhase = 'battle'; currentInput = []; updateInputDisplay();
    document.getElementById('setupArea').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    document.getElementById('callBtn').innerText = "CALL";
    const c = document.getElementById('mySecretCards').children; for(let i=0;i<3;i++)c[i].innerText=mySecret[i];
    document.querySelectorAll('.placeholder').forEach(el=>el.remove());

    db.ref(`rooms/${roomId}/currentTurn`).on('value', (s) => {
        isMyTurn = (s.val() === myRole); updateTurnUI(myRole);
    });
    db.ref(`rooms/${roomId}/history`).on('child_added', (s) => {
        const d = s.val(); const isMe = (d.player === myRole);
        addLog(isMe?'playerLogList':'oppLogList', d.guess, d.result, d.turnCount);
        if(d.result.hit === 3) setTimeout(() => finishGameOnline(isMe), 500);
    });
    db.ref(`rooms/${roomId}/turnCount`).on('value', (s) => turnCount = s.val());
}

window.submitGuess = function() {
    const guess = [...currentInput];
    const result = checkHitBlow(guess, oppSecret);
    db.ref(`rooms/${roomId}/history`).push({ player: myRole, guess: guess, result: result, turnCount: turnCount });
    currentInput = []; updateInputDisplay();
    if(result.hit !== 3) {
        const next = (myRole==='p1'?'p2':'p1');
        if(myRole==='p2') db.ref(`rooms/${roomId}/turnCount`).transaction(c=>(c||1)+1);
        db.ref(`rooms/${roomId}/currentTurn`).set(next);
    }
};

function finishGameOnline(isWin) {
    db.ref(`rooms/${roomId}`).off();
    db.ref(`rooms/${roomId}/${myRole}`).remove();
    finishGame(isWin);
}

if(MODE === 'friend') {
    currentPhase = 'lobby';
    document.getElementById('friendLobby').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "合言葉を入力してください";
    document.getElementById('callBtn').innerText = "入室";
    updateInputDisplay();
} else if(MODE === 'random') {
    currentPhase = 'lobby';
    document.getElementById('randomLobby').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "マッチングを開始してください";
    document.getElementById('footerInputDisplay').innerText = "---";
    document.getElementById('callBtn').classList.add('disabled');
}
