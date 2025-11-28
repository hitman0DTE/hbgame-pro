// js/online/battle.js (Renamed Functions)

window.oppSecret = [];

window.onlineAction = function() {
    if(window.currentPhase === 'lobby' && window.MODE === 'friend') {
        window.joinFriendRoom(window.currentInput.join(""));
    } else if(window.currentPhase === 'setup') {
        submitSecretOnline();
    } else if(window.currentPhase === 'battle') {
        // ★修正: 衝突しない名前に変更
        window.submitGuessOnline();
    }
};

window.initOnlineSetup = function() {
    window.currentPhase = 'setup';
    window.currentInput = []; 
    window.updateInputDisplay();
    
    document.getElementById('lobbyArea').classList.add('hidden');
    document.getElementById('setupArea').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "番号を決めて、決定を押してください";
    document.getElementById('callBtn').classList.remove('disabled');
    document.getElementById('callBtn').innerText = "決定";
    document.getElementById('oppName').innerText = "対戦相手";

    if(window.myRole === 'p1') document.getElementById('badgeP1').classList.add('active');
    else document.getElementById('badgeP2').classList.add('active');
    
    const opp = (window.myRole==='p1')?'p2':'p1';
    db.ref(`rooms/${window.roomId}/${opp}`).on('value', (s) => {
        if(window.currentPhase!=='lobby' && !s.exists()) { alert("相手が切断しました"); location.reload(); }
    });
};

function submitSecretOnline() {
    window.mySecret = [...window.currentInput];
    db.ref(`rooms/${window.roomId}/${window.myRole}/secret`).set(window.mySecret);
    db.ref(`rooms/${window.roomId}/${window.myRole}/ready`).set(true);

    const sStat = document.getElementById('setupStatus');
    if(sStat) sStat.classList.remove('hidden');
    document.getElementById('callBtn').classList.add('disabled');
    document.getElementById('gameMessage').innerText = "相手の決定を待っています...";

    db.ref(`rooms/${window.roomId}`).on('value', (snap) => {
        const d = snap.val();
        if(d && d.p1 && d.p1.ready && d.p2 && d.p2.ready) {
            window.oppSecret = d[(window.myRole==='p1'?'p2':'p1')].secret;
            startBattleOnline();
        }
    });
}

function startBattleOnline() {
    db.ref(`rooms/${window.roomId}`).off(); 
    
    window.currentPhase = 'battle';
    window.currentInput = []; 
    window.updateInputDisplay();
    
    document.getElementById('setupArea').classList.add('hidden');
    document.getElementById('gameArea').classList.remove('hidden');
    document.getElementById('callBtn').innerText = "CALL";
    
    const c = document.getElementById('mySecretCards').children; 
    for(let i=0;i<3;i++) c[i].innerText = window.mySecret[i];
    document.querySelectorAll('.placeholder').forEach(el=>el.remove());

    db.ref(`rooms/${window.roomId}/currentTurn`).on('value', (s) => {
        window.isMyTurn = (s.val() === window.myRole);
        window.updateTurnUI(window.myRole);
    });

    db.ref(`rooms/${window.roomId}/history`).on('child_added', (s) => {
        const d = s.val();
        const isMe = (d.player === window.myRole);
        window.addLog(isMe?'playerLogList':'oppLogList', d.guess, d.result, d.turnCount);
        if(d.result.hit === 3) setTimeout(() => finishGameOnline(isMe), 500);
    });
    
    db.ref(`rooms/${window.roomId}/turnCount`).on('value', (s) => window.turnCount = s.val());
}

// ★修正: 関数名変更
window.submitGuessOnline = function() {
    const guess = [...window.currentInput];
    const result = window.checkHitBlow(guess, window.oppSecret);
    
    db.ref(`rooms/${window.roomId}/history`).push({ 
        player: window.myRole, 
        guess: guess, 
        result: result, 
        turnCount: window.turnCount 
    });
    
    window.currentInput = []; 
    window.updateInputDisplay();

    if(result.hit !== 3) {
        const next = (window.myRole==='p1'?'p2':'p1');
        if(window.myRole==='p2') db.ref(`rooms/${window.roomId}/turnCount`).transaction(c=>(c||1)+1);
        db.ref(`rooms/${window.roomId}/currentTurn`).set(next);
    }
};

function finishGameOnline(isWin) {
    db.ref(`rooms/${window.roomId}`).off();
    db.ref(`rooms/${window.roomId}/${window.myRole}`).remove();
    window.finishGame(isWin);
}

if(window.MODE === 'friend') {
    window.currentPhase = 'lobby';
    document.getElementById('friendLobby').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "合言葉を入力してください";
    document.getElementById('callBtn').innerText = "入室";
    window.updateInputDisplay();
} else if(window.MODE === 'random') {
    window.currentPhase = 'lobby';
    document.getElementById('randomLobby').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "マッチングを開始してください";
    document.getElementById('footerInputDisplay').innerText = "---";
    document.getElementById('callBtn').classList.add('disabled');
}
