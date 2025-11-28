// js/game_core.js (UI, Audio, Helper)
const params = new URLSearchParams(window.location.search);
const MODE = params.get('mode') || 'offline';
let currentPhase = 'init';
let currentInput = [];
let mySecret = [];
let isMyTurn = false;
let turnCount = 1;
let timeLeft = 60;
let timerInterval = null;

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
    let maxLen = (currentPhase === 'lobby' && MODE === 'friend') ? 4 : 3;
    let d = [...currentInput]; while(d.length < maxLen) d.push("_");
    let str = d.join((currentPhase === 'lobby' && MODE === 'friend') ? "" : " ");
    document.getElementById('footerInputDisplay').innerText = str;
    document.getElementById('callBtn').classList.toggle('disabled', currentInput.length !== maxLen);
    if(currentPhase==='lobby' && MODE==='friend') document.getElementById('loginDisplay').innerText = str;
    if(currentPhase==='setup') document.getElementById('setupDisplay').innerText = str;
}

function updateTurnUI(role) {
    clearInterval(timerInterval);
    timeLeft = 60; document.getElementById('timerDisplay').innerText = timeLeft;
    const p1b = document.getElementById('badgeP1'); const p2b = document.getElementById('badgeP2');
    if(MODE === 'offline') {
        if(isMyTurn) { p1b.classList.add('active'); p2b.classList.remove('active'); }
        else { p2b.classList.add('active'); p1b.classList.remove('active'); }
    } else {
        p1b.classList.toggle('active', role==='p1' ? isMyTurn : !isMyTurn);
        p2b.classList.toggle('active', role==='p2' ? isMyTurn : !isMyTurn);
    }
    if(isMyTurn) {
        document.getElementById('gameMessage').innerText = `あなたのターン (${turnCount}手目)`;
        document.getElementById('callBtn').classList.remove('disabled');
        timerInterval = setInterval(() => {
            timeLeft--; document.getElementById('timerDisplay').innerText = timeLeft<10?"0"+timeLeft:timeLeft;
            if(timeLeft<=0) { 
                clearInterval(timerInterval); 
                while(currentInput.length<3){let n=Math.floor(Math.random()*10);if(!currentInput.includes(n))currentInput.push(n);} 
                if(typeof window.submitGuess === 'function') window.submitGuess();
            }
        }, 1000);
    } else {
        document.getElementById('gameMessage').innerText = `相手は考えています... (${turnCount}手目)`;
        document.getElementById('callBtn').classList.add('disabled');
    }
}

function checkHitBlow(g, t) {
    let h=0,b=0; for(let i=0;i<3;i++){ if(g[i]===t[i])h++; else if(t.includes(g[i]))b++; } return {hit:h, ball:b};
}
function addLog(id, g, r, t) {
    const row = document.createElement('div'); row.className = 'h-row';
    row.innerHTML = `<div class="h-turn">${t}</div><div class="h-num">${g.join(" ")}</div><div class="h-val ${r.hit===3?'hit-3':''}">${r.hit}</div><div class="h-val">${r.ball}</div>`;
    const list = document.getElementById(id); list.appendChild(row); list.scrollTop = list.scrollHeight;
}
function finishGame(isWin) {
    clearInterval(timerInterval);
    if(isWin){ SE.win(); alert("YOU WIN!"); } else { SE.lose(); alert("YOU LOSE..."); }
    location.reload();
}

document.querySelectorAll('button[data-key]').forEach(btn => {
    ['touchstart','mousedown'].forEach(evt => {
        btn.addEventListener(evt, (e) => { e.preventDefault(); handleKey(btn.dataset.key, btn); }, {passive:false});
    });
});
function handleKey(key, btnEle) {
    btnEle.classList.add('key-active'); setTimeout(()=>btnEle.classList.remove('key-active'), 100);
    if(currentPhase === 'lobby' && MODE === 'random') return; 
    if(currentPhase === 'battle' && !isMyTurn) return;
    if(currentPhase === 'setup' && document.getElementById('setupStatus').classList.contains('hidden') === false) return;
    const maxLen = (currentPhase === 'lobby' && MODE === 'friend') ? 4 : 3;
    if(key === 'del') { if(currentInput.length > 0) { currentInput.pop(); SE.click(); } }
    else if(key === 'call') {
        if(currentInput.length !== maxLen) { SE.error(); return; }
        SE.enter(); if(MODE === 'offline') window.offlineAction(); else window.onlineAction();
    } else {
        const num = parseInt(key);
        if(currentPhase !== 'lobby' && currentInput.includes(num)) { SE.error(); return; }
        if(currentInput.length < maxLen) { currentInput.push(num); SE.click(); } else { SE.error(); }
    }
    updateInputDisplay();
}
