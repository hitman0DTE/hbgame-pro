// js/logic_cpu.js (Fix: Access Global Window)
let cpuSecret = [], aiCandidates = [];
let currentLevel = parseInt(localStorage.getItem('hb_level')) || 1;

window.offlineAction = function() {
    // window.currentPhase をチェック
    if(window.currentPhase === 'setup') {
        window.mySecret = [...window.currentInput];
        document.getElementById('setupStatus').classList.remove('hidden');
        document.getElementById('callBtn').classList.add('disabled');
        
        cpuSecret = generateCpuSecret(); 
        initCandidates();
        
        setTimeout(() => {
            window.currentPhase = 'battle'; // ★ここ重要：確実に更新する
            window.currentInput = []; 
            updateInputDisplay();
            
            document.getElementById('setupArea').classList.add('hidden');
            document.getElementById('gameArea').classList.remove('hidden');
            document.getElementById('callBtn').innerText = "CALL";
            
            const c = document.getElementById('mySecretCards').children; 
            for(let i=0;i<3;i++) c[i].innerText = window.mySecret[i];
            
            document.querySelectorAll('.placeholder').forEach(el=>el.remove());
            
            window.isMyTurn = true; 
            updateTurnUI('p1');
        }, 1000);

    } else if(window.currentPhase === 'battle') {
        window.submitGuess();
    }
};

window.submitGuess = function() {
    const guess = [...window.currentInput];
    const result = window.checkHitBlow(guess, cpuSecret);
    
    window.addLog('playerLogList', guess, result, window.turnCount);
    window.currentInput = []; 
    updateInputDisplay();

    if(result.hit === 3) {
        currentLevel++; 
        localStorage.setItem('hb_level', currentLevel); 
        window.finishGame(true);
    } else {
        window.isMyTurn = false; 
        updateTurnUI('p1'); 
        setTimeout(cpuTurn, 1000 + Math.random()*500);
    }
};

function cpuTurn() {
    let guess = getAiGuess(); 
    if(!guess||guess.length!==3) guess = generateCpuSecret();
    
    const result = window.checkHitBlow(guess, window.mySecret);
    window.addLog('oppLogList', guess, result, window.turnCount); 
    SE.click();
    
    if(currentLevel >= 3) { 
        try { aiCandidates = aiCandidates.filter(c => { 
            const r = window.checkHitBlow(guess,c); 
            return r.hit===result.hit && r.ball===result.ball; 
        }); } catch(e){ initCandidates(); } 
    }
    
    if(result.hit === 3) {
        if(currentLevel>1)currentLevel--; 
        localStorage.setItem('hb_level', currentLevel); 
        window.finishGame(false);
    } else { 
        window.turnCount++; 
        window.isMyTurn = true; 
        updateTurnUI('p1'); 
    }
}

function generateCpuSecret(){let a=[0,1,2,3,4,5,6,7,8,9],r=[];for(let i=0;i<3;i++){let x=Math.floor(Math.random()*a.length);r.push(a[x]);a.splice(x,1)}return r;}
function initCandidates(){aiCandidates=[];for(let i=0;i<10;i++)for(let j=0;j<10;j++)if(i!==j)for(let k=0;k<10;k++)if(k!==i&&k!==j)aiCandidates.push([i,j,k]);}
function getAiGuess(){
    if(currentLevel<=2||!aiCandidates||aiCandidates.length===0)return generateCpuSecret();
    if(currentLevel<=5||aiCandidates.length>150)return aiCandidates[Math.floor(Math.random()*aiCandidates.length)];
    let best=aiCandidates[0], minMax=9999;
    for(let g of aiCandidates){
        let maxRem=0, grp={};
        for(let s of aiCandidates){ let r=window.checkHitBlow(g,s), k=`${r.hit}-${r.ball}`; if(!grp[k])grp[k]=0; grp[k]++; }
        for(let k in grp) if(grp[k]>maxRem) maxRem=grp[k];
        if(maxRem<minMax){ minMax=maxRem; best=g; }
    }
    return best;
}

// 初期化
if(window.MODE === 'offline') {
    document.getElementById('oppName').innerText = `CPU (Lv.${currentLevel})`;
    document.getElementById('lobbyArea').classList.add('hidden');
    
    // ★ここ重要：window.currentPhase を更新する
    window.currentPhase = 'setup';
    
    document.getElementById('setupArea').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "番号を決めて、決定を押してください";
    document.getElementById('callBtn').innerText = "決定";
}
