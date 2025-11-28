// js/game_core.js (Fix: Global Scope)

// ★変更点: window. をつけて確実に共有させる
window.params = new URLSearchParams(window.location.search);
window.MODE = window.params.get('mode') || 'offline';

window.currentPhase = 'init'; 
window.currentInput = [];
window.mySecret = [];
window.isMyTurn = false;
window.turnCount = 1;
window.timeLeft = 60;
window.timerInterval = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(t,f,d){if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=0.08;g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);}
const SE={
    click:()=>playTone('triangle',800,0.05), error:()=>playTone('sawtooth',150,0.15),
    enter:()=>{playTone('sine',1200,0.08);setTimeout(()=>playTone('sine',600,0.08),50)},
    win:()=>{[523,659,783,1046].forEach((f,i)=>setTimeout(()=>playTone('square',f,0.2),i*100))},
    lose:()=>{[300,250,200,150].forEach((f,i)=>setTimeout(()=>playTone('sawtooth',f,0.2),i*150))},
    matched:()=>{[600,800,1000].forEach((f,i)=>setTimeout(()=>playTone('sine',f,0.3),i*100))}
};

function updateInputDisplay() {
    let maxLen = (window.currentPhase === 'lobby' && window.MODE === 'friend') ? 4 : 3;
    let d = [...window.currentInput]; 
    while(d.length < maxLen) d.push("_");
    let str = d.join((window.currentPhase === 'lobby' && window.MODE === 'friend') ? "" : " ");
    
    document.getElementById('footerInputDisplay').innerText = str;
    document.getElementById('callBtn').classList.toggle('disabled', window.currentInput.length !== maxLen);
    
    if(window.currentPhase==='lobby' && window.MODE==='friend') document.getElementById('loginDisplay').innerText = str;
    if(window.currentPhase==='setup') document.getElementById('setupDisplay').innerText = str;
}

function updateTurnUI(role) {
    clearInterval(window.timerInterval);
    window.timeLeft = 60; 
    const timerDisp = document.getElementById('timerDisplay');
    if(timerDisp) timerDisp.innerText = window.timeLeft;
    
    const p1b = document.getElementById('badgeP1');
    const p2b = document.getElementById('badgeP2');
    
    if(window.MODE === 'offline') {
        if(window.isMyTurn) { p1b.classList.add('active'); p2b.classList.remove('active'); }
        else { p2b.classList.add('active'); p1b.classList.remove('active'); }
    } else {
        p1b.classList.toggle('active', role==='p1' ? window.isMyTurn : !window.isMyTurn);
        p2b.classList.toggle('active', role==='p2' ? window.isMyTurn : !window.isMyTurn);
    }

    if(window.isMyTurn) {
        document.getElementById('gameMessage').innerText = `あなたのターン (${window.turnCount}手目)`;
        document.getElementById('callBtn').classList.remove('disabled');
        
        window.timerInterval = setInterval(() => {
            window.timeLeft--; 
            if(timerDisp) timerDisp.innerText = window.timeLeft < 10 ? "0"+window.timeLeft : window.timeLeft;
            if(window.timeLeft <= 0) { 
                clearInterval(window.timerInterval); 
                while(window.currentInput.length < 3) {
                    let n = Math.floor(Math.random()*10);
                    if(!window.currentInput.includes(n)) window.currentInput.push(n);
                } 
                if(typeof window.submitGuess === 'function') window.submitGuess();
            }
        }, 1000);
    } else {
        document.getElementById('gameMessage').innerText = `相手は考えています... (${window.turnCount}手目)`;
        document.getElementById('callBtn').classList.add('disabled');
    }
}

// 他のファイルから呼べるように window. に入れる
window.checkHitBlow = function(g, t) {
    let h=0,b=0;
    for(let i=0;i<3;i++){ if(g[i]===t[i])h++; else if(t.includes(g[i]))b++; }
    return {hit:h, ball:b};
}

window.addLog = function(id, g, r, t) {
    const row = document.createElement('div'); row.className = 'h-row';
    row.innerHTML = `<div class="h-turn">${t}</div><div class="h-num">${g.join(" ")}</div><div class="h-val ${r.hit===3?'hit-3':''}">${r.hit}</div><div class="h-val">${r.ball}</div>`;
    const list = document.getElementById(id); 
    if(list) { list.appendChild(row); list.scrollTop = list.scrollHeight; }
}

window.finishGame = function(isWin) {
    clearInterval(window.timerInterval);
    if(isWin){ SE.win(); alert("YOU WIN!"); } else { SE.lose(); alert("YOU LOSE..."); }
    location.reload();
}

document.querySelectorAll('button[data-key]').forEach(btn => {
    ['touchstart','mousedown'].forEach(evt => {
        btn.addEventListener(evt, (e) => { 
            e.preventDefault(); 
            if(btn.dataset.locked) return;
            btn.dataset.locked = "true";
            setTimeout(()=>delete btn.dataset.locked, 100);
            handleKey(btn.dataset.key, btn); 
        }, {passive:false});
    });
});

function handleKey(key, btnEle) {
    btnEle.classList.add('key-active'); setTimeout(()=>btnEle.classList.remove('key-active'), 100);
    
    // window.変数 を参照して判定
    if(window.currentPhase === 'lobby' && window.MODE === 'random') return; 
    if(window.currentPhase === 'battle' && !window.isMyTurn) return;
    
    const setupStatus = document.getElementById('setupStatus');
    if(window.currentPhase === 'setup' && setupStatus && !setupStatus.classList.contains('hidden')) return;

    const maxLen = (window.currentPhase === 'lobby' && window.MODE === 'friend') ? 4 : 3;

    if(key === 'del') {
        if(window.currentInput.length > 0) { window.currentInput.pop(); SE.click(); }
    } else if(key === 'call') {
        if(window.currentInput.length !== maxLen) { SE.error(); return; }
        SE.enter(); 
        // モードに応じた処理を呼び出す
        if(window.MODE === 'offline') {
            if(typeof window.offlineAction === 'function') window.offlineAction();
        } else {
            if(typeof window.onlineAction === 'function') window.onlineAction();
        }
    } else {
        const num = parseInt(key);
        if(window.currentPhase !== 'lobby' && window.currentInput.includes(num)) { SE.error(); return; }
        if(window.currentInput.length < maxLen) { window.currentInput.push(num); SE.click(); } else { SE.error(); }
    }
    updateInputDisplay();
}
