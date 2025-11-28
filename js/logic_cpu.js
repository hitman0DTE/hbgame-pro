// js/logic_cpu.js (Fix: Full Global Scope)

// 変数をすべて window. に入れて確実にアクセスできるようにする
window.cpuSecret = [];
window.aiCandidates = [];
window.currentLevel = parseInt(localStorage.getItem('hb_level')) || 1;

window.offlineAction = function() {
    // window.currentPhase をチェック
    if(window.currentPhase === 'setup') {
        window.mySecret = [...window.currentInput];
        
        // UI操作
        const statusEl = document.getElementById('setupStatus');
        if(statusEl) statusEl.classList.remove('hidden');
        
        const callBtn = document.getElementById('callBtn');
        if(callBtn) callBtn.classList.add('disabled');
        
        // CPU準備
        window.cpuSecret = window.generateCpuSecret(); 
        window.initCandidates();
        
        // 1秒後にバトル開始
        setTimeout(() => {
            window.currentPhase = 'battle';
            window.currentInput = []; 
            window.updateInputDisplay();
            
            document.getElementById('setupArea').classList.add('hidden');
            document.getElementById('gameArea').classList.remove('hidden');
            
            const btn = document.getElementById('callBtn');
            if(btn) btn.innerText = "CALL";
            
            const c = document.getElementById('mySecretCards').children; 
            for(let i=0;i<3;i++) c[i].innerText = window.mySecret[i];
            
            document.querySelectorAll('.placeholder').forEach(el=>el.remove());
            
            window.isMyTurn = true; 
            window.updateTurnUI('p1');
        }, 1000);

    } else if(window.currentPhase === 'battle') {
        window.submitGuess();
    }
};

window.submitGuess = function() {
    const guess = [...window.currentInput];
    
    // グローバル化した関数と変数を使用
    const result = window.checkHitBlow(guess, window.cpuSecret);
    
    window.addLog('playerLogList', guess, result, window.turnCount);
    window.currentInput = []; 
    window.updateInputDisplay();

    if(result.hit === 3) {
        window.currentLevel++; 
        localStorage.setItem('hb_level', window.currentLevel); 
        window.finishGame(true);
    } else {
        window.isMyTurn = false; 
        window.updateTurnUI('p1'); 
        setTimeout(window.cpuTurn, 1000 + Math.random()*500);
    }
};

window.cpuTurn = function() {
    let guess = window.getAiGuess(); 
    if(!guess || guess.length!==3) guess = window.generateCpuSecret();
    
    const result = window.checkHitBlow(guess, window.mySecret);
    window.addLog('oppLogList', guess, result, window.turnCount); 
    SE.click();
    
    if(window.currentLevel >= 3) { 
        try { 
            window.aiCandidates = window.aiCandidates.filter(c => { 
                const r = window.checkHitBlow(guess,c); 
                return r.hit===result.hit && r.ball===result.ball; 
            }); 
        } catch(e){ window.initCandidates(); } 
    }
    
    if(result.hit === 3) {
        if(window.currentLevel>1) window.currentLevel--; 
        localStorage.setItem('hb_level', window.currentLevel); 
        window.finishGame(false);
    } else { 
        window.turnCount++; 
        window.isMyTurn = true; 
        window.updateTurnUI('p1'); 
    }
}

window.generateCpuSecret = function(){
    let a=[0,1,2,3,4,5,6,7,8,9],r=[];
    for(let i=0;i<3;i++){let x=Math.floor(Math.random()*a.length);r.push(a[x]);a.splice(x,1)}
    return r;
}

window.initCandidates = function(){
    window.aiCandidates=[];
    for(let i=0;i<10;i++)
        for(let j=0;j<10;j++)
            if(i!==j) for(let k=0;k<10;k++) if(k!==i&&k!==j) window.aiCandidates.push([i,j,k]);
}

window.getAiGuess = function(){
    if(window.currentLevel<=2||!window.aiCandidates||window.aiCandidates.length===0) return window.generateCpuSecret();
    if(window.currentLevel<=5||window.aiCandidates.length>150) return window.aiCandidates[Math.floor(Math.random()*window.aiCandidates.length)];
    
    let best=window.aiCandidates[0], minMax=9999;
    for(let g of window.aiCandidates){
        let maxRem=0, grp={};
        for(let s of window.aiCandidates){ 
            let r=window.checkHitBlow(g,s), k=`${r.hit}-${r.ball}`; 
            if(!grp[k])grp[k]=0; grp[k]++; 
        }
        for(let k in grp) if(grp[k]>maxRem) maxRem=grp[k];
        if(maxRem<minMax){ minMax=maxRem; best=g; }
    }
    return best;
}

// 初期化（ページロード時）
if(window.MODE === 'offline') {
    const oppName = document.getElementById('oppName');
    if(oppName) oppName.innerText = `CPU (Lv.${window.currentLevel})`;
    
    document.getElementById('lobbyArea').classList.add('hidden');
    window.currentPhase = 'setup'; // ★ここも確実に更新
    document.getElementById('setupArea').classList.remove('hidden');
    document.getElementById('gameMessage').innerText = "番号を決めて、決定を押してください";
    document.getElementById('callBtn').innerText = "決定";
}
