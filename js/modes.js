function toggleElements(selector, show) {
    document.querySelectorAll(selector).forEach(el => el.classList.toggle('hidden', !show));
}

function getGameVocab() {
    return window.selectedCategory === 'all' ?
        [...window.allVocab] :
        window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);
}

function updateControlButtonsVisibility(mode) {
    const controlButtons = document.getElementById('control-buttons');
    if (!controlButtons) return;

    const isSpecialMode = ['unknown', 'manage', 'game'].includes(mode);
    let isVocabEmpty = false;

    if (['study', 'quiz', 'flashcard'].includes(mode)) {
        isVocabEmpty = window.modeStates[mode].shuffledVocab.length === 0;
    }

    controlButtons.classList.toggle('hidden', isSpecialMode || isVocabEmpty);
}

function updateDisplayModeContainers(mode) {
    const developerText = document.querySelector('.developer-info .developer-text');
    const quizDisplay = document.getElementById('quiz-display-mode-container');
    const flashcardDisplay = document.getElementById('flashcard-display-mode-container');

    if (developerText) {
        developerText.classList.toggle('hidden', mode === 'quiz' || mode === 'flashcard');
    }
    if (quizDisplay) {
        quizDisplay.classList.toggle('hidden', mode !== 'quiz');
    }
    if (flashcardDisplay) {
        flashcardDisplay.classList.toggle('hidden', mode !== 'flashcard');
    }
}

function handleGameMode() {
    const {
        currentTab
    } = window.modeStates.game;
    const gameVocab = getGameVocab();

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${currentTab}-tab-btn`)?.classList.add('active');

    toggleElements('.game-content, .empty-state[id*="-empty-state"]', false);

    const showEmptyState = gameVocab.length === 0;
    const emptyStateId = `${currentTab}-empty-state`;
    const gameContentId = `${currentTab}-game`;

    toggleElements(`#${showEmptyState ? emptyStateId : gameContentId}`, true);

    const isMatchingTab = currentTab === 'matching';
    toggleElements('#reset-game-btn', !showEmptyState && isMatchingTab);
    toggleElements('#reset-fill-game-btn', !showEmptyState && !isMatchingTab);

    if (!showEmptyState) {
        if (isMatchingTab) {
            if (window.modeStates.game.matching.shuffledVocab.length > 0) {
                displayMatchingGame();
            } else {
                initMatchingGame();
            }
        } else {
            if (window.modeStates.game.fill.currentSentence) {
                displayFillGame();
            } else {
                initFillGame();
            }
        }
    }
    window.updateStats(); 
}

function setMode(mode) {
    const validModes = ['study', 'quiz', 'flashcard', 'game', 'unknown', 'manage'];
    window.currentMode = validModes.includes(mode) ? mode : 'study';

    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${window.currentMode}-mode-btn`)?.classList.add('active');

    validModes.forEach(m => toggleElements(`#${m}-mode`, m === window.currentMode));

    updateControlButtonsVisibility(window.currentMode);
    updateDisplayModeContainers(window.currentMode);

    switch (window.currentMode) {
        case 'study':
        case 'quiz':
        case 'flashcard':
            const currentState = window.modeStates[window.currentMode];
            window.toggleEmptyState(window.currentMode, currentState.shuffledVocab.length === 0);
            if (window.currentMode === 'flashcard') {
                document.getElementById('flashcard')?.classList.remove('flipped');
            }
            break;
        case 'manage':
            window.updateVocabList();
            window.clearUploadForm();
            window.clearImportForm();
            break;
        case 'unknown':
            window.loadUnknownWords();
            break;
        case 'game':
            handleGameMode();
            break;
    }

    window.displayCurrentWord();
    window.saveState();
}

function displayQuiz(correctWord) {
    const currentState = window.modeStates.quiz;
    const {
        quizDisplayMode
    } = currentState;

    document.getElementById('quiz-category').textContent = correctWord.category;

    const isWordMode = quizDisplayMode === 'word';
    document.getElementById('quiz-korean').textContent = isWordMode ? correctWord.korean : '';
    document.getElementById('quiz-vietnamese').textContent = isWordMode ? '' : correctWord.vietnamese;

    const wrongOptions = currentState.shuffledVocab
        .filter(w => w.id !== correctWord.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    const allOptions = [correctWord, ...wrongOptions].sort(() => 0.5 - Math.random());
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    allOptions.forEach(option => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        const optionText = isWordMode ? option.vietnamese : option.korean;
        const correctText = isWordMode ? correctWord.vietnamese : correctWord.korean;
        button.textContent = optionText;
        button.addEventListener('click', () => checkAnswer(optionText, correctText));
        optionsContainer.appendChild(button);
    });

    document.getElementById('quiz-result').innerHTML = '';
}

function checkAnswer(selected, correct) {
    const resultDiv = document.getElementById('quiz-result');
    if (!resultDiv) return;

    const isCorrect = selected === correct;
    document.querySelectorAll('#quiz-options .btn').forEach(btn => {
        if (btn.textContent === selected) {
            btn.classList.add(isCorrect ? 'correct' : 'wrong');
        }
        btn.disabled = true;
    });

    const statusIcon = isCorrect ? '🎉' : '❌';
    const statusText = isCorrect ? 'Chính xác!' : 'Chưa đúng!';
    let resultHTML = `
        <div class="quiz-answer-container ${isCorrect ? '' : 'wrong'}">
            <div class="quiz-answer-status ${isCorrect ? 'correct' : 'wrong'}">
                <span>${statusIcon}</span>
                <span>${statusText}</span>
            </div>
            ${!isCorrect ? `<div class="quiz-correct-answer">Đáp án đúng: ${correct}</div>` : ''}
        </div>
    `;
    resultDiv.innerHTML = resultHTML;

    window.updateStats();
    window.saveState();
}

function flipCard() {
    if (window.modeStates.flashcard?.shuffledVocab.length > 0) {
        document.getElementById('flashcard')?.classList.toggle('flipped');
    }
}

function flipStudyCard() {
    if (window.modeStates.study?.shuffledVocab.length > 0) {
        document.getElementById('study-card')?.classList.toggle('flipped');
    }
}

function setGameTab(tab) {
    window.modeStates.game.currentTab = tab;
    handleGameMode(); 
    window.saveState();
}

function initMatchingGame() {
    const gameVocab = getGameVocab();
    window.toggleEmptyState('matching', gameVocab.length === 0);

    if (gameVocab.length > 0) {
        const slicedVocab = gameVocab.sort(() => 0.5 - Math.random()).slice(0, Math.min(4, gameVocab.length));
        window.modeStates.game.matching = {
            ...window.modeStates.game.matching,
            shuffledVocab: slicedVocab,
            matchedPairs: [],
            selectedKorean: null,
            selectedVietnamese: null,
        };
        displayMatchingGame();
    } else {
        document.getElementById('korean-column').innerHTML = '';
        document.getElementById('vietnamese-column').innerHTML = '';
        document.getElementById('matching-result').innerHTML = '';
    }
    window.saveState();
}

function createMatchingItem(word, type) {
    const {
        matching
    } = window.modeStates.game;
    const item = document.createElement('div');
    item.className = 'matching-item';
    item.textContent = word[type];
    item.dataset.id = word.id;
    item.addEventListener('click', () => selectMatchingItem(word.id, type));

    const selectedId = type === 'korean' ? matching.selectedKorean : matching.selectedVietnamese;
    if (selectedId === word.id) {
        item.classList.add('selected');
    }
    return item;
}

function displayMatchingGame() {
    const koreanColumn = document.getElementById('korean-column');
    const vietnameseColumn = document.getElementById('vietnamese-column');
    const resultDiv = document.getElementById('matching-result');
    const matchingContainer = document.querySelector('.matching-container');

    koreanColumn.innerHTML = '';
    vietnameseColumn.innerHTML = '';
    resultDiv.innerHTML = '';

    const {
        shuffledVocab,
        matchedPairs
    } = window.modeStates.game.matching;
    const remainingVocab = shuffledVocab.filter(word => !matchedPairs.includes(word.id));
    const vietnameseWords = [...remainingVocab].sort(() => 0.5 - Math.random());

    remainingVocab.forEach(word => koreanColumn.appendChild(createMatchingItem(word, 'korean')));
    vietnameseWords.forEach(word => vietnameseColumn.appendChild(createMatchingItem(word, 'vietnamese')));

    const itemHeight = 52,
        gap = 12;
    const totalHeight = remainingVocab.length > 0 ? remainingVocab.length * itemHeight + (remainingVocab.length - 1) * gap : 0;
    matchingContainer.style.height = `${totalHeight}px`;

    if (matchedPairs.length > 0) {
        const matchedPairsHtml = matchedPairs.map(id => {
            const word = shuffledVocab.find(w => w.id === id);
            return `<div class="matched-pair">${word.korean} - ${word.vietnamese}</div>`;
        }).join('');
        resultDiv.innerHTML = `
            <div class="matched-pairs-container">
                <div class="matched-pairs-title">🥳 Các cặp đã ghép đúng (${matchedPairs.length}/${shuffledVocab.length})</div>
                ${matchedPairsHtml}
            </div>
        `;
    }

    if (matchedPairs.length === shuffledVocab.length && shuffledVocab.length > 0) {
        resultDiv.innerHTML += `
            <div class="game-completion">
                <div class="game-completion-text">🎊 Hoàn thành xuất sắc! 🎊</div>
                <div style="margin-top: 10px; font-size: 1.1em; color: #2e7d32;">
                    Nhấn "Làm Lại Ghép Từ" để chơi tiếp!
                </div>
            </div>
        `;
    }
}

// Select matching item
function selectMatchingItem(id, type) {
    if (window.modeStates.game.matching.matchedPairs.includes(id)) return;

    const koreanColumn = document.getElementById('korean-column');
    const vietnameseColumn = document.getElementById('vietnamese-column');
    const resultDiv = document.getElementById('matching-result');
    if (!koreanColumn || !vietnameseColumn || !resultDiv) return;

    koreanColumn.querySelectorAll('.matching-item').forEach(item => item.classList.remove('selected'));
    vietnameseColumn.querySelectorAll('.matching-item').forEach(item => item.classList.remove('selected'));

    if (type === 'korean') {
        window.modeStates.game.matching.selectedKorean = window.modeStates.game.matching.selectedKorean === id ? null : id;
        if (window.modeStates.game.matching.selectedKorean) {
            const koreanItem = koreanColumn.querySelector(`.matching-item[data-id="${id}"]`);
            if (koreanItem) koreanItem.classList.add('selected');
        }
    } else {
        window.modeStates.game.matching.selectedVietnamese = window.modeStates.game.matching.selectedVietnamese === id ? null : id;
        if (window.modeStates.game.matching.selectedVietnamese) {
            const vietnameseItem = vietnameseColumn.querySelector(`.matching-item[data-id="${id}"]`);
            if (vietnameseItem) vietnameseItem.classList.add('selected');
        }
    }

    if (window.modeStates.game.matching.selectedKorean && window.modeStates.game.matching.selectedVietnamese) {
        const koreanItem = koreanColumn.querySelector(`.matching-item[data-id="${window.modeStates.game.matching.selectedKorean}"]`);
        const vietnameseItem = vietnameseColumn.querySelector(`.matching-item[data-id="${window.modeStates.game.matching.selectedVietnamese}"]`);

        if (!koreanItem || !vietnameseItem) return;

        if (window.modeStates.game.matching.selectedKorean === window.modeStates.game.matching.selectedVietnamese) {
            koreanItem.classList.add('correct');
            vietnameseItem.classList.add('correct');
            window.modeStates.game.matching.matchedPairs.push(window.modeStates.game.matching.selectedKorean);

            setTimeout(() => {
                if (koreanItem) koreanItem.style.display = 'none';
                if (vietnameseItem) vietnameseItem.style.display = 'none';
                window.modeStates.game.matching.selectedKorean = null;
                window.modeStates.game.matching.selectedVietnamese = null;
                displayMatchingGame();
                window.saveState();
            }, 1000);
        } else {
            koreanItem.classList.add('wrong');
            vietnameseItem.classList.add('wrong');
            setTimeout(() => {
                if (koreanItem) koreanItem.classList.remove('wrong', 'selected');
                if (vietnameseItem) vietnameseItem.classList.remove('wrong', 'selected');
                resultDiv.innerHTML = '';
                window.modeStates.game.matching.selectedKorean = null;
                window.modeStates.game.matching.selectedVietnamese = null;
                displayMatchingGame();
                window.saveState();
            }, 1000);
        }
        window.updateStats();
        window.saveState();
    }
}

function displayFillGame() {
    const sentenceDiv = document.getElementById('fill-sentence');
    const optionsContainer = document.getElementById('fill-options');
    const resultDiv = document.getElementById('fill-result');

    if (!window.modeStates.game.fill.currentSentence) {
        window.toggleEmptyState('fill', true);
        return;
    }

    const {
        currentSentence,
        options
    } = window.modeStates.game.fill;
    const [koreanPart, vietnamesePart] = currentSentence.match(/^(.+) \((.+)\)$/)?.slice(1) || [currentSentence, ''];

    sentenceDiv.innerHTML = `
        <div class="fill-sentence-display">
            <div class="fill-korean-sentence">${koreanPart}</div>
            ${vietnamesePart ? `<div class="fill-vietnamese-sentence">${vietnamesePart}</div>` : ''}
        </div>
    `;

    optionsContainer.innerHTML = '';
    options.forEach(word => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = word.korean;
        button.addEventListener('click', () => checkFillAnswer(word));
        optionsContainer.appendChild(button);
    });

    resultDiv.innerHTML = '';
}

function checkFillAnswer(selectedWord) {
    const resultDiv = document.getElementById('fill-result');
    const optionsContainer = document.getElementById('fill-options');
    if (!resultDiv || !optionsContainer) return;

    const {
        correctWord,
        currentSentence
    } = window.modeStates.game.fill;
    const isCorrect = selectedWord.id === correctWord.id;

    optionsContainer.querySelectorAll('.btn').forEach(btn => {
        if (btn.textContent === selectedWord.korean) {
            btn.classList.add(isCorrect ? 'correct' : 'wrong');
        }
        btn.disabled = true;
    });

    const underlinedKorean = `<span class="underlined-word">${correctWord.korean}</span>`;
    const underlinedVietnamese = `<span class="underlined-word">${correctWord.vietnamese}</span>`;

    const [koreanPart, vietnamesePart] = currentSentence.match(/^(.+) \((.+)\)$/)?.slice(1) || [currentSentence, ''];
    const completeKorean = koreanPart.replace('___', underlinedKorean);
    const completeVietnamese = vietnamesePart.replace('___', underlinedVietnamese);

    const statusIcon = isCorrect ? '🎉' : '❌';
    const statusText = isCorrect ? 'Chính xác!' : 'Chưa đúng!';

    resultDiv.innerHTML = `
        <div class="fill-answer-container ${isCorrect ? '' : 'wrong'}">
            <div class="fill-answer-status ${isCorrect ? 'correct' : 'wrong'}">
                <span>${statusIcon}</span>
                <span>${statusText}</span>
                <span class="fill-correct-word">${correctWord.korean} - ${correctWord.vietnamese}</span>
            </div>
            <div class="fill-sentence-display">
                <div class="fill-korean-sentence">${completeKorean}</div>
                <div class="fill-vietnamese-sentence">${completeVietnamese}</div>
            </div>
        </div>
    `;

    window.updateStats();
    window.saveState();
}

function resetMatchingGame() {
    initMatchingGame();
}

function resetFillGame() {
    window.modeStates.game.fill = {
        currentSentence: '',
        correctWord: null,
        options: []
    };
    window.initFillGame();
    window.saveState();
}


// Export functions to global scope
Object.assign(window, {
    setMode,
    displayQuiz,
    checkAnswer,
    flipCard,
    flipStudyCard,
    setGameTab,
    initMatchingGame,
    displayMatchingGame,
    selectMatchingItem,
    displayFillGame,
    checkFillAnswer,
    resetMatchingGame,
    resetFillGame
});