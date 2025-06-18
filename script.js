document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const setupSection = document.getElementById('setup-section');
    const scoreboardSection = document.getElementById('scoreboard-section');
    const historySection = document.getElementById('history-section');

    const awayTeamNameInput = document.getElementById('awayTeamNameInput');
    const homeTeamNameInput = document.getElementById('homeTeamNameInput');
    const startGameButton = document.getElementById('startGameButton');

    const awayTeamLabel = document.getElementById('awayTeamLabel');
    const homeTeamLabel = document.getElementById('homeTeamLabel');
    const awayTotalScoreLabel = document.getElementById('awayTotalScore');
    const homeTotalScoreLabel = document.getElementById('homeTotalScore');

    const currentInningInfo = document.getElementById('currentInningInfo');
    const outsInfo = document.getElementById('outsInfo');
    const ballsInfo = document.getElementById('ballsInfo');
    const strikesInfo = document.getElementById('strikesInfo');

    const firstBase = document.getElementById('firstBase');
    const secondBase = document.getElementById('secondBase');
    const thirdBase = document.getElementById('thirdBase');

    const addRunButton = document.getElementById('addRun');
    const subtractRunButton = document.getElementById('subtractRun');
    const addOutButton = document.getElementById('addOut');
    const subtractOutButton = document.getElementById('subtractOut');

    const singleHitButton = document.getElementById('singleHit');
    const doubleHitButton = document.getElementById('doubleHit');
    const tripleHitButton = document.getElementById('tripleHit');
    const homeRunButton = document.getElementById('homeRun');
    const clearBasesButton = document.getElementById('clearBases');

    const addBallButton = document.getElementById('addBall');
    const addStrikeButton = document.getElementById('addStrike');
    const resetCountButton = document.getElementById('resetCount');

    const nextInningButton = document.getElementById('nextInning');
    const switchSidesButton = document.getElementById('switchSides');
    const endGameButton = document.getElementById('endGame');
    const resetGameButton = document.getElementById('resetGame');

    const gameHistoryList = document.getElementById('gameHistoryList');
    const clearHistoryButton = document.getElementById('clearHistoryButton');

    // --- Game State Variables ---
    let currentInning = 1;
    let isTopInning = true; // true: top (away batting), false: bottom (home batting)
    let outs = 0;
    let balls = 0;
    let strikes = 0;
    let bases = [false, false, false]; // [1st, 2nd, 3rd]

    let awayTeamName = "ビジターズ";
    let homeTeamName = "ホームズ";

    // inningScores: Array of objects [{away: score, home: score}, {away: score, home: score}, ...]
    let inningScores = [];
    let gameHistory = []; // Records for the current game session (reset on game end)

    let savedGameResults = []; // Records for all past games (persists in localStorage)

    // --- Game Logic Functions ---

    function initializeGame() {
        currentInning = 1;
        isTopInning = true;
        outs = 0;
        balls = 0;
        strikes = 0;
        bases = [false, false, false];
        inningScores = [{ [awayTeamName]: 0, [homeTeamName]: 0 }]; // Initialize first inning score
        gameHistory = []; // Clear current game history
        updateUI();
        addHistory('試合開始: ' + awayTeamName + ' vs ' + homeTeamName);
        saveGameState(); // Save initial state
    }

    function addRun(count = 1) {
        const team = isTopInning ? awayTeamName : homeTeamName;
        inningScores[currentInning - 1][team] += count;
        updateUI();
        resetPitchCount(); // 得点が入ったらカウントはリセット
        addHistory(team + 'が得点しました (' + count + '点).');
        saveGameState();
    }

    function subtractRun(count = 1) {
        const team = isTopInning ? awayTeamName : homeTeamName;
        if (inningScores[currentInning - 1][team] - count >= 0) {
            inningScores[currentInning - 1][team] -= count;
        } else {
            inningScores[currentInning - 1][team] = 0; // 0より下にはならない
        }
        updateUI();
        addHistory(team + 'の得点が' + count + '点減りました.');
        saveGameState();
    }

    function addOut() {
        outs++;
        if (outs >= 3) {
            outs = 0;
            resetPitchCount();
            clearBases();
            switchSides();
            addHistory('3アウトチェンジ！');
        } else {
            addHistory('アウト追加 (' + outs + 'アウト).');
        }
        updateUI();
        saveGameState();
    }

    function subtractOut() {
        if (outs > 0) {
            outs--;
            addHistory('アウト削減 (' + outs + 'アウト).');
        }
        updateUI();
        saveGameState();
    }

    function addBall() {
        balls++;
        if (balls >= 4) {
            balls = 0;
            strikes = 0;
            advanceRunners(0); // 四球
            addHistory('フォアボール！ランナー進塁.');
        } else {
            addHistory('ボール追加 (' + balls + 'B).');
        }
        updateUI();
        saveGameState();
    }

    function addStrike() {
        strikes++;
        if (strikes >= 3) {
            strikes = 0;
            balls = 0;
            addOut(); // 三振
            addHistory('ストライク！三振！');
        } else {
            addHistory('ストライク追加 (' + strikes + 'S).');
        }
        updateUI();
        saveGameState();
    }

    function resetPitchCount() {
        balls = 0;
        strikes = 0;
        updateUI();
        addHistory('カウントリセット.');
        saveGameState();
    }

    function clearBases() {
        bases = [false, false, false];
        updateUI();
        addHistory('塁上クリア.');
        saveGameState();
    }

    function advanceRunners(hitType) { // 0=walk, 1=single, 2=double, 3=triple, 4=homeRun
        let runsScored = 0;
        // 塁上のランナーを進める
        if (bases[2]) { // 3塁ランナー
            runsScored++;
            bases[2] = false;
        }
        if (bases[1]) { // 2塁ランナー
            bases[2] = true;
            bases[1] = false;
        }
        if (bases[0]) { // 1塁ランナー
            bases[1] = true;
            bases[0] = false;
        }

        // バッターを進める
        if (hitType === 0) { // Walk
            bases[0] = true;
        } else if (hitType === 1) { // Single
            bases[0] = true;
        } else if (hitType === 2) { // Double
            bases[1] = true;
        } else if (hitType === 3) { // Triple
            bases[2] = true;
        } else if (hitType === 4) { // Home Run
            runsScored++; // バッター自身の得点
            // 他のランナーもホームイン
            if (bases[0]) { runsScored++; bases[0] = false; }
            if (bases[1]) { runsScored++; bases[1] = false; }
            if (bases[2]) { runsScored++; bases[2] = false; }
        }

        if (runsScored > 0) {
            addRun(runsScored); // 得点を追加
        }
        resetPitchCount();
        updateUI();
        addHistory('ランナー進塁 (' + (hitType === 0 ? '四球' : hitType + '塁打') + ').');
        saveGameState();
    }

    function switchSides() {
        isTopInning = !isTopInning;
        if (isTopInning) { // 攻守交代後、表イニングになったらイニングを進める
            currentInning++;
            // 新しいイニングのスコアを初期化
            if (!inningScores[currentInning - 1]) {
                inningScores.push({ [awayTeamName]: 0, [homeTeamName]: 0 });
            }
        }
        outs = 0;
        balls = 0;
        strikes = 0;
        clearBases();
        updateUI();
        addHistory('攻守交代: ' + currentInning + '回' + (isTopInning ? '表' : '裏'));
        saveGameState();
    }

    function nextInning() {
        if (!isTopInning) { // 現在裏イニングの場合のみ、次のイニングの表へ進む
            currentInning++;
            isTopInning = true;
            if (!inningScores[currentInning - 1]) {
                inningScores.push({ [awayTeamName]: 0, [homeTeamName]: 0 });
            }
        } else { // 現在表イニングの場合、裏イニングへ進む
            isTopInning = false;
        }
        outs = 0;
        balls = 0;
        strikes = 0;
        clearBases();
        updateUI();
        addHistory('イニング変更: ' + currentInning + '回' + (isTopInning ? '表' : '裏'));
        saveGameState();
    }

    function endGame() {
        const confirmEnd = confirm("試合を終了しますか？");
        if (!confirmEnd) return;

        const awayTotal = calculateTotalScore(awayTeamName);
        const homeTotal = calculateTotalScore(homeTeamName);
        const result = `${awayTeamName}: ${awayTotal} - ${homeTeamName}: ${homeTotal}`;
        const winner = awayTotal > homeTotal ? awayTeamName : (homeTotal > awayTotal ? homeTeamName : '引き分け');

        const gameResult = {
            date: new Date().toLocaleString(),
            awayTeam: awayTeamName,
            homeTeam: homeTeamName,
            awayScore: awayTotal,
            homeScore: homeTotal,
            winner: winner,
            details: JSON.parse(JSON.stringify(inningScores)) // ディープコピー
        };
        savedGameResults.push(gameResult);
        saveGameResults();
        addHistory('試合終了: ' + result + ' (' + winner + 'の勝利)');

        alert("試合が終了しました。\n最終スコア: " + result);

        // 試合終了後のUI表示
        setupSection.classList.remove('hidden');
        scoreboardSection.classList.add('hidden');
        historySection.classList.remove('hidden'); // 履歴セクションを表示
        displayGameResults(); // 履歴を更新
        resetGame(false); // 履歴には残すが、現在のスコアボードはリセット
    }

    function resetGame(confirmReset = true) {
        if (confirmReset && !confirm("現在の試合をリセットしますか？この操作は取り消せません。")) {
            return;
        }
        awayTeamName = awayTeamNameInput.value;
        homeTeamName = homeTeamNameInput.value;
        initializeGame();
        saveGameState(); // Reset state
    }

    // --- UI Update Functions ---

    function updateUI() {
        // Update Team Names
        awayTeamLabel.textContent = awayTeamName;
        homeTeamLabel.textContent = homeTeamName;

        // Update Inning Info
        currentInningInfo.textContent = `${currentInning}回${isTopInning ? '表' : '裏'}`;
        outsInfo.textContent = `O: ${outs}`;
        ballsInfo.textContent = `B: ${balls}`;
        strikesInfo.textContent = `S: ${strikes}`;

        // Update Bases
        firstBase.classList.toggle('active', bases[0]);
        secondBase.classList.toggle('active', bases[1]);
        thirdBase.classList.toggle('active', bases[2]);

        // Update Scores and Totals
        updateScoreboardTable();
    }

    function updateScoreboardTable() {
        const scoreboardDiv = document.querySelector('.scoreboard');
        const awayTeamRow = document.querySelector('.away-team');
        const homeTeamRow = document.querySelector('.home-team');

        // Remove old inning score cells (keep team label and RHE placeholders)
        awayTeamRow.querySelectorAll('.inning-score').forEach(el => el.remove());
        homeTeamRow.querySelectorAll('.inning-score').forEach(el => el.remove());

        // Ensure enough inning columns in header
        const header = document.querySelector('.scoreboard-header');
        for (let i = header.children.length - 4; i < currentInning; i++) { // -4 for team-label, R, H, E
            if (i < 9) { // Default 9 innings
                // Already exists
            } else { // Add new inning header if beyond 9th inning
                const newInningHeader = document.createElement('div');
                newInningHeader.classList.add('inning-col');
                newInningHeader.textContent = i + 1;
                // Insert before RHE columns
                header.insertBefore(newInningHeader, header.children[header.children.length - 3]);
            }
        }

        let awayTotal = 0;
        let homeTotal = 0;

        inningScores.forEach((inning, index) => {
            const awayInningScore = inning[awayTeamName] || 0;
            const homeInningScore = inning[homeTeamName] || 0;

            awayTotal += awayInningScore;
            homeTotal += homeInningScore;

            // Create and append score for away team
            const awayScoreDiv = document.createElement('div');
            awayScoreDiv.classList.add('inning-score');
            awayScoreDiv.textContent = awayInningScore;
            awayTeamRow.insertBefore(awayScoreDiv, awayTeamRow.children[1 + index]); // Insert after team label and previous innings

            // Create and append score for home team
            const homeScoreDiv = document.createElement('div');
            homeScoreDiv.classList.add('inning-score');
            homeScoreDiv.textContent = homeInningScore;
            homeTeamRow.insertBefore(homeScoreDiv, homeTeamRow.children[1 + index]);
        });

        awayTotalScoreLabel.textContent = awayTotal;
        homeTotalScoreLabel.textContent = homeTotal;
    }

    function addHistory(action) {
        const timestamp = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        gameHistory.unshift(`[${timestamp}] ${action}`); // Add to the beginning
        updateCurrentGameHistoryUI();
    }

    function updateCurrentGameHistoryUI() {
        // For the current game's history (if we decide to show it in the scoreboard section)
        // Currently, not explicitly shown in scoreboard section, but concept is here.
        // For now, it's just used for console logging or a potential in-game log.
        // If you want a live feed, add an element to index.html and update it here.
    }

    function displayGameResults() {
        gameHistoryList.innerHTML = ''; // Clear previous history
        if (savedGameResults.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'まだ試合の履歴がありません。';
            gameHistoryList.appendChild(li);
            return;
        }

        savedGameResults.forEach(game => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${game.date}</strong><br>
                ${game.awayTeam}: ${game.awayScore} - ${game.homeTeam}: ${game.homeScore}<br>
                勝者: ${game.winner}
            `;
            gameHistoryList.appendChild(li);
        });
    }

    function calculateTotalScore(teamName) {
        return inningScores.reduce((total, inning) => total + (inning[teamName] || 0), 0);
    }

    // --- Local Storage Functions ---

    function saveGameState() {
        const state = {
            currentInning,
            isTopInning,
            outs,
            balls,
            strikes,
            bases,
            awayTeamName,
            homeTeamName,
            inningScores,
            gameHistory // Save current game's history
        };
        localStorage.setItem('baseballScoreboardCurrentGame', JSON.stringify(state));
    }

    function loadGameState() {
        const savedState = localStorage.getItem('baseballScoreboardCurrentGame');
        if (savedState) {
            const state = JSON.parse(savedState);
            currentInning = state.currentInning;
            isTopInning = state.isTopInning;
            outs = state.outs;
            balls = state.balls;
            strikes = state.strikes;
            bases = state.bases;
            awayTeamName = state.awayTeamName;
            homeTeamName = state.homeTeamName;
            inningScores = state.inningScores;
            gameHistory = state.gameHistory || []; // Handle old states without gameHistory
            
            // Update input fields with loaded team names
            awayTeamNameInput.value = awayTeamName;
            homeTeamNameInput.value = homeTeamName;

            // Show scoreboard if game was active
            setupSection.classList.add('hidden');
            scoreboardSection.classList.remove('hidden');
            historySection.classList.add('hidden'); // Initially hide history when game is active

            updateUI();
        } else {
            // No saved game, show setup section
            setupSection.classList.remove('hidden');
            scoreboardSection.classList.add('hidden');
            historySection.classList.add('hidden');
            // Default team names will be used from HTML input values
        }
    }

    function saveGameResults() {
        localStorage.setItem('baseballScoreboardGameResults', JSON.stringify(savedGameResults));
    }

    function loadGameResults() {
        const results = localStorage.getItem('baseballScoreboardGameResults');
        if (results) {
            savedGameResults = JSON.parse(results);
        }
        displayGameResults();
    }

    function clearGameHistory() {
        if (confirm("全ての試合履歴をクリアしますか？この操作は元に戻せません。")) {
            localStorage.removeItem('baseballScoreboardGameResults');
            savedGameResults = [];
            displayGameResults();
            alert("試合履歴がクリアされました。");
        }
    }

    // --- Event Listeners ---

    startGameButton.addEventListener('click', () => {
        awayTeamName = awayTeamNameInput.value || "ビジターズ";
        homeTeamName = homeTeamNameInput.value || "ホームズ";
        initializeGame();
        setupSection.classList.add('hidden');
        scoreboardSection.classList.remove('hidden');
        historySection.classList.add('hidden'); // 試合開始時は履歴を非表示に
    });

    addRunButton.addEventListener('click', () => addRun());
    subtractRunButton.addEventListener('click', () => subtractRun());
    addOutButton.addEventListener('click', () => addOut());
    subtractOutButton.addEventListener('click', () => subtractOut());

    singleHitButton.addEventListener('click', () => advanceRunners(1));
    doubleHitButton.addEventListener('click', () => advanceRunners(2));
    tripleHitButton.addEventListener('click', () => advanceRunners(3));
    homeRunButton.addEventListener('click', () => advanceRunners(4));
    clearBasesButton.addEventListener('click', () => clearBases());

    addBallButton.addEventListener('click', () => addBall());
    addStrikeButton.addEventListener('click', () => addStrike());
    resetCountButton.addEventListener('click', () => resetPitchCount());

    nextInningButton.addEventListener('click', () => nextInning());
    switchSidesButton.addEventListener('click', () => switchSides());
    endGameButton.addEventListener('click', () => endGame());
    resetGameButton.addEventListener('click', () => resetGame());

    clearHistoryButton.addEventListener('click', clearGameHistory);

    // --- Initial Load ---
    loadGameState(); // Attempt to load ongoing game
    loadGameResults(); // Load past game results
});
