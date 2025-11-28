// js/game_core.js
// ゲームの共通部品（UI, SE, 判定ロジック）

// --- Global State (varにして全ファイルから確実にアクセス可能にする) ---
var params = new URLSearchParams(window.location.search);
var MODE = params.get('mode') || 'offline'; // 'offline', 'friend', 'random'

var currentPhase = 'init'; // init, lobby, setup, battle
var currentInput = [];
var mySecret = [];
var isMyTurn = false;
var turnCount = 1;
var timeLeft = 60;
var timerInterval = null;

// --- Audio System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(t,f,d){if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t;o.frequency.value=f;g.gain.value=0.08;g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d);}
const SE={
    click:()=>playTone('triangle',800,0.05),
    error:()=>playTone('sawtooth',150,0.15),
    enter:()=>{playTone('sine',1200,0.08);setTimeout(()=>playTone('sine',600,0.08),50)},
    win:()=>{[523,659,783,1046].forEach((f,i)=>setTimeout(()=>playTone('square',f,0.2),i*100))},
    lose:()=>{[300,250,200,150].forEach((f,i)=>setTimeout(()=>playTone('sawtooth',f,0.2),i*150))},
    matched:()=>{[600,800,1000].forEach((f,i)=>setTimeout(()=>playTone('sine',f,0.3),i*100))}
};

// --- UI Updates ---
function updateInputDisplay() {
    let maxLen = (currentPhase === 'lobby' && MODE === 'friend') ? 4 : 3;
    let d = [...currentInput]; 
    while(d.length < maxLen) d.push("_");
    
    // ロビーの場合は数字を隠さない、バトル中も入力は見せる
    let str = d.join((currentPhase === 'lobby' && MODE === 'friend') ? "" : " ");
    
    const footerDisp = document.getElementById('footerInputDisplay');
    if(footerDisp) footerDisp.innerText = str;
    
    const callBtn = document.getElementById('callBtn');
    if(callBtn) callBtn.classList.toggle('disabled', currentInput.length !== maxLen);
    
    if(currentPhase==='lobby' && MODE==='friend') {
        const loginDisp = document.getElementById('loginDisplay');
        if(loginDisp) loginDisp.innerText = str;
    }
    if(currentPhase==='setup') {
        const setupDisp = document.getElementById('setupDisplay');
        if(setupDisp) setupDisp.innerText = str;
    }
}

function updateTurnUI(role) {
    // role: 'p1' or 'p2'
    clearInterval(timerInterval);
    timeLeft = 60; 
    const timerDisp = document.getElementById('timerDisplay');
    if(timerDisp) timerDisp.innerText = timeLeft;
    
    const p1b = document.getElementById('badgeP1');
    const p2b = document.getElementById('badgeP2');
    const msg = document.getElementById('gameMessage');
    const callBtn = document.getElementById('callBtn');
    
    if(MODE === 'offline') {
        // オフラインは常にp1がプレイヤー、p2がCPU
        if(isMyTurn) { 
            if(p1b) p1b.classList.add('active'); 
            if(p2b) p2b.classList.remove('active'); 
        } else { 
            if(p2b) p2b.classList.add('active'); 
            if(p1b) p1b.classList.remove('active'); 
        }
    } else {
        if(p1b) p1b.classList.toggle('active', role==='p1' ? isMyTurn : !isMyTurn);
        if(p2b) p2b.classList.toggle('active', role==='p2' ? isMyTurn : !isMyTurn);
    }

    if(isMyTurn) {
        if(msg) msg.innerText = `あなたのターン (${turnCount}手目)`;
        if(callBtn) callBtn.classList.remove('disabled');
        
        // タイマー開始
        timerInterval = setInterval(() => {
            timeLeft--; 
            if(timerDisp) timerDisp.innerText = timeLeft < 10 ? "0"+timeLeft : timeLeft;
            if(timeLeft <= 0) { 
                clearInterval(timerInterval); 
                // ランダム入力して送信
                while(currentInput.length < 3) {
                    let n = Math.floor(Math.random()*10);
                    if(!currentInput.includes(n)) currentInput.push(n);
                } 
                if(typeof window.submitGuess === 'function') window.submitGuess();
            }
        }, 1000);
    } else {
        if(msg) msg.innerText = `相手は考えています... (${turnCount}手目)`;
        if(callBtn) callBtn.classList.add('disabled');
    }
}

// --- Logic Helpers ---
function checkHitBlow(g, t) {
    let h=0,b=0;
    for(let i=0;i<3;i++){ if(g[i]===t[i])h++; else if(t.includes(g[i]))b++; }
    return {hit:h, ball:b};
}

function addLog(id, g, r, t) {
    const row = document.createElement('div'); row.className = 'h-row';
    row.innerHTML = `<div class="h-turn">${t}</div><div class="h-num">${g.join(" ")}</div><div class="h-val ${r.hit===3?'hit-3':''}">${r.hit}</div><div class="h-val">${r.ball}</div>`;
    const list = document.getElementById(id); 
    if(list) {
        list.appendChild(row); 
        list.scrollTop = list.scrollHeight;
    }
}

function finishGame(isWin) {
    clearInterval(timerInterval);
    if(isWin){ SE.win(); alert("YOU WIN!"); } else { SE.lose(); alert("YOU LOSE..."); }
    location.reload();
}

// --- Event Listeners (Keypad) ---
// 二重登録防止のため、古いリスナーがあれば削除...は難しいので、フラグ管理か、このファイルが一度だけ読み込まれることを前提とする
document.querySelectorAll('button[data-key]').forEach(btn => {
    ['touchstart','mousedown'].forEach(evt => {
        btn.addEventListener(evt, (e) => { 
            e.preventDefault(); 
            // 連続発火防止
            if(btn.dataset.locked) return;
            btn.dataset.locked = "true";
            setTimeout(()=>delete btn.dataset.locked, 100);
            
            handleKey(btn.dataset.key, btn); 
        }, {passive:false});
    });
});

function handleKey(key, btnEle) {
    btnEle.classList.add('key-active'); 
    setTimeout(()=>btnEle.classList.remove('key-active'), 100);
    
    // 操作ブロック条件チェック
    if(currentPhase === 'lobby' && MODE === 'random') return; 
    
    // バトル中は自分のターンでないなら操作不可
    if(currentPhase === 'battle' && !isMyTurn) return;
    
    // セットアップ中は「待機中」なら操作不可
    const setupStatus = document.getElementById('setupStatus');
    if(currentPhase === 'setup' && setupStatus && !setupStatus.classList.contains('hidden')) return;

    const maxLen = (currentPhase === 'lobby' && MODE === 'friend') ? 4 : 3;

    if(key === 'del') {
        if(currentInput.length > 0) { 
            currentInput.pop(); 
            SE.click(); 
        }
    } else if(key === 'call') {
        if(currentInput.length !== maxLen) { 
            SE.error(); 
            return; 
        }
        SE.enter(); 
        
        // モードに応じたアクションを実行
        if(MODE === 'offline') {
            if(typeof window.offlineAction === 'function') window.offlineAction();
        } else {
            if(typeof window.onlineAction === 'function') window.onlineAction();
        }
        
    } else {
        const num = parseInt(key);
        // 重複チェック (ロビー以外)
        if(currentPhase !== 'lobby' && currentInput.includes(num)) { 
            SE.error(); 
            return; 
        }
        
        if(currentInput.length < maxLen) { 
            currentInput.push(num); 
            SE.click(); 
        } else { 
            SE.error(); 
        }
    }
    updateInputDisplay();
}
