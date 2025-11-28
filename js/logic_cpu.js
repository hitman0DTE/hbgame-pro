// js/logic_cpu.js (Offline Logic)
let cpuSecret = [], aiCandidates = [];
let currentLevel = parseInt(localStorage.getItem('hb_level')) || 1;

window.offlineAction = function() {
    if(currentPhase === 'setup') {
        mySecret = [...currentInput];
        document.getElementById('setupStatus').classList.remove('hidden');
        document.getElementById('callBtn').classList.add('disabled');
        cpuSecret = generateCpuSecret(); initCandidates();
        setTimeout(() => {
            currentPhase = 'battle'; currentInput = []; updateInputDisplay();
            document.getElementById('setupArea').classList.add('hidden');
            document.getElementById('gameArea').classList.remove('hidden');
            document.getElementById('callBtn').innerText = "CALL";
            const c = document.getElementById('mySecretCards').children; for(let i=0;i<3;i++)c[i].innerText=mySecret[i];
            document.querySelectorAll('.placeholder').forEach(el=>el.remove());
            isMyTurn = true; updateTurnUI('p1');
        }, 1000);
    } else if(currentPhase === 'battle') window.submitGuess();
};

window.submitGuess = function() {
    const guess = [...currentInput];
    const result = checkHitBlow(guess, cpuSecret);
    addLog('playerLogList', guess, result, turnCount);
    currentInput = []; updateInputDisplay();
    if(result.hit === 3) {
        currentLevel++; localStorage.setItem('hb_level', currentLevel); finishGame(true);
    } else {
        isMyTurn = false; updateTurnUI('p1'); setTimeout(cpuTurn, 1000 + Math.random()*500);
    }
};

function cpuTurn() {
    let guess = getAiGuess(); if(!guess||guess.length!==3) guess = generateCpuSecret();
    const result = checkHitBlow(guess, mySecret);
    addLog('oppLogList', guess, result, turnCount); SE.click();
    if(currentLevel >= 3) { try { aiCandidates = aiCandidates.filter(c => { const r=checkHitBlow(guess,c); return r.hit===result.hit&&r.ball===result.ball; }); } catch(e){ initCandidates(); } }
    if(result.hit === 3) {
        if(currentLevel>1)currentLevel--; localStorage.setItem('hb_level', currentLevel); finishGame(false);
    } else { turnCount++; isMyTurn = true; updateTurnUI('p1'); }
}

function generateCpuSecret(){let a=[0,1,2,3,4,5,6,7,8,9],r=[];for(let i=0;i<3;i++){let x=Math.floor(Math.random()*a.length);r.push(a[x]);a.splice(x,1)}return r;}
function initCandidates(){aiCandidates=[];for(let i=0;i<10;i++)for(let j=0;j<10;j++)if(i!==j)for(let k=0;k<10;k++)if(k!==i&&k!==j)aiCandidates.push([i,j,k]);}
function getAiGuess(){
    if(currentLevel<=2||!aiCandidates||aiCandidates.length===0)return generateCpuSecret();
    if(currentLevel<=5||aiCandidates.length>150)return aiCandidates[Math.floor(Math.random()*aiCandidates.length)];
    let best=aiCandidates[0], minMax=9999;
    for(let g of aiCandidates){
        let maxRem=0, grp={};
        for(let s of aiCandidates){ let r=checkHitBlow(g,s), k=`${r.hit}-${r.ball}`; if(!grp[k])grp[k]=0; grp[k]++; }
        for(let k in grp) if(grp[k]>maxRem) maxRem=grp[k];
        if(maxRem<minMax){ minMax=maxRem; best=g; }
    }
    return best;
}

if(MODE === 'offline') {
    document.getElementById('oppName').innerText = `CPU (Lv.${currentLevel})`;
    document.getElementById('lobbyArea').classList.add('hidden');
    currentPhase = 'setup';
    document.getElementById('setupArea').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "番号を決めて、決定を押してください";
    document.getElementById('callBtn').innerText = "決定";
}
