/**
 * Modes module for handling different learning modes
 * Includes study, quiz, flashcard, game modes and their logic
 */

// Set current learning mode
function setMode(mode) {
    if (!['study', 'quiz', 'flashcard', 'game', 'unknown', 'manage'].includes(mode)) {
        console.error(`Invalid mode: ${mode}`);
        window.currentMode = 'study';
    } else {
        window.currentMode = mode;
    }

    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const modeButton = document.getElementById(`${mode}-mode-btn`);
    if (modeButton) {
        modeButton.classList.add('active');
    } else {
        console.error(`Mode button not found: ${mode}-mode-btn`);
    }

    const modes = ['study', 'quiz', 'flashcard', 'game', 'unknown', 'manage'];
    modes.forEach(m => {
        const element = document.getElementById(`${m}-mode`);
        if (element) {
            element.classList.add('hidden');
        }
    });

    const currentModeElement = document.getElementById(`${mode}-mode`);
    if (currentModeElement) {
        currentModeElement.classList.remove('hidden');
    }

    const controlButtons = document.getElementById('control-buttons');
    if (controlButtons) {
        if (mode === 'unknown' || mode === 'manage' || mode === 'game') {
            controlButtons.classList.add('hidden');
        } else {
            controlButtons.classList.remove('hidden');
        }
    }

    // Kiểm tra trạng thái rỗng và ẩn các phần tử giao diện chính nếu cần
    if (['study', 'quiz', 'flashcard'].includes(mode)) {
        const currentState = window.modeStates[mode];
        window.toggleEmptyState(mode, currentState.shuffledVocab.length === 0);
    }

    if (mode === 'flashcard') {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) {
            flashcard.classList.remove('flipped');
        }
    } else if (mode === 'manage') {
        window.updateVocabList();
        window.clearUploadForm();
        window.clearImportForm();
    } else if (mode === 'unknown') {
        window.loadUnknownWords();
    } else if (mode === 'game') {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabButton = document.getElementById(`${window.modeStates.game.currentTab}-tab-btn`);
    if (tabButton) {
        tabButton.classList.add('active');
    }
    // Ẩn tất cả game-content và empty-state trước
    document.querySelectorAll('.game-content, .empty-state').forEach(content => content.classList.add('hidden'));
    
    const resetGameBtn = document.getElementById('reset-game-btn');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');
    let gameVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);

    if (gameVocab.length === 0) {
        // Hiển thị empty-state của tab hiện tại
        const emptyState = document.getElementById(`${window.modeStates.game.currentTab}-empty-state`);
        if (emptyState) emptyState.classList.remove('hidden');
        // Ẩn cả hai nút reset
        if (resetGameBtn) resetGameBtn.classList.add('hidden');
        if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
    } else {
        // Hiển thị nội dung game của tab hiện tại
        const gameContent = document.getElementById(`${window.modeStates.game.currentTab}-game`);
        if (gameContent) {
            gameContent.classList.remove('hidden');
        }
        if (resetGameBtn && resetFillGameBtn) {
            if (window.modeStates.game.currentTab === 'matching') {
                resetGameBtn.classList.remove('hidden');
                resetFillGameBtn.classList.add('hidden');
                if (window.modeStates.game.matching.shuffledVocab.length > 0) {
                    displayMatchingGame();
                } else {
                    initMatchingGame();
                }
            } else if (window.modeStates.game.currentTab === 'fill') {
                resetGameBtn.classList.add('hidden');
                resetFillGameBtn.classList.add('hidden'); // Ẩn nút reset ban đầu, sẽ được hiển thị trong initFillGame nếu cần
                if (window.modeStates.game.fill.currentSentence && window.modeStates.game.fill.correctWord && window.modeStates.game.fill.options.length > 0) {
                    displayFillGame();
                } else {
                    initFillGame();
                }
            }
        }
    }
}

    const developerInfo = document.querySelector('.developer-info');
    const categorySelectors = document.querySelectorAll('.category-selector-display');
    
    if (developerInfo) {
        if (mode === 'study' || mode === 'game' || mode === 'unknown' || mode === 'manage') {
            developerInfo.classList.remove('hidden');
        } else {
            developerInfo.classList.add('hidden');
        }
    }

    categorySelectors.forEach(selector => {
        if ((mode === 'quiz' || mode === 'flashcard') && selector.closest(`#${mode}-mode`)) {
            selector.classList.remove('hidden');
            selector.style.position = 'absolute';
            selector.style.top = '20px';
            selector.style.right = '20px';
        } else {
            selector.removeAttribute('style');
            selector.classList.add('hidden');
        }
    });

    window.displayCurrentWord();
    window.saveState();
}

// Display quiz with correct word
function displayQuiz(correctWord) {
    const currentState = window.modeStates[window.currentMode];
    const quizCategory = document.getElementById('quiz-category');
    const quizKorean = document.getElementById('quiz-korean');
    const quizVietnamese = document.getElementById('quiz-vietnamese');
    const optionsContainer = document.getElementById('quiz-options');
    const quizResult = document.getElementById('quiz-result');
    const playTtsQuizBtn = document.getElementById('play-tts-quiz-btn');

    if (!quizVietnamese) {
        console.error('Element quiz-vietnamese not found in DOM');
    }
    if (!playTtsQuizBtn) {
        console.error('Element play-tts-quiz-btn not found in DOM');
    }

    if (quizCategory) quizCategory.textContent = correctWord.category;

    if (currentState.quizDisplayMode === 'word') {
        if (quizKorean) quizKorean.textContent = correctWord.korean;
        if (quizVietnamese) quizVietnamese.textContent = '';
        if (quizKorean) quizKorean.classList.remove('hidden');
        if (quizVietnamese) quizVietnamese.classList.add('hidden');
        if (playTtsQuizBtn) playTtsQuizBtn.classList.remove('hidden');
    } else {
        if (quizKorean) quizKorean.textContent = '';
        if (quizVietnamese) quizVietnamese.textContent = correctWord.vietnamese;
        if (quizKorean) quizKorean.classList.add('hidden');
        if (quizVietnamese) quizVietnamese.classList.remove('hidden');
        if (playTtsQuizBtn) playTtsQuizBtn.classList.add('hidden');
    }

    const wrongOptions = currentState.shuffledVocab
        .filter(w => w.id !== correctWord.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

    const allOptions = [correctWord, ...wrongOptions].sort(() => Math.random() - 0.5);

    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        allOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'btn btn-secondary';
            button.textContent = currentState.quizDisplayMode === 'word' ? option.vietnamese : option.korean;
            button.addEventListener('click', () => checkAnswer(
                currentState.quizDisplayMode === 'word' ? option.vietnamese : option.korean,
                currentState.quizDisplayMode === 'word' ? correctWord.vietnamese : correctWord.korean
            ));
            optionsContainer.appendChild(button);
        });
    }

    if (quizResult) quizResult.innerHTML = '';
}

// Check quiz answer
function checkAnswer(selected, correct) {
    const resultDiv = document.getElementById('quiz-result');
    if (!resultDiv) return;

    const currentState = window.modeStates[window.currentMode];
    if (!currentState) return;

    const isCorrect = selected === correct;
    document.querySelectorAll('#quiz-options .btn').forEach(btn => {
        if (btn.textContent === selected) {
            if (isCorrect) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        }
    });
    const containerClass = isCorrect ? 'quiz-answer-container' : 'quiz-answer-container wrong';
    const statusClass = isCorrect ? 'quiz-answer-status correct' : 'quiz-answer-status wrong';
    const statusIcon = isCorrect ? '🎉' : '❌';
    const statusText = isCorrect ? 'Chính xác!' : 'Chưa đúng!';

    if (isCorrect) {
        resultDiv.innerHTML = `
        <div class="${containerClass}">
            <div class="${statusClass}">
                <span>${statusIcon}</span>
                <span>${statusText}</span>
            </div>
        </div>
    `;
    } else {
        resultDiv.innerHTML = `
        <div class="${containerClass}">
            <div class="${statusClass}">
                <span>${statusIcon}</span>
                <span>${statusText}</span>
            </div>
            <div class="quiz-correct-answer">
                Đáp án đúng: ${correct}
            </div>
        </div>
    `;
    }

    document.querySelectorAll('#quiz-options .btn').forEach(btn => btn.disabled = true);

    window.updateStats();
    window.saveState();
}

// Flip flashcard
function flipCard() {
    if (window.modeStates[window.currentMode]?.shuffledVocab.length > 0) {
        const flashcard = document.getElementById('flashcard');
        if (flashcard) flashcard.classList.toggle('flipped');
    }
}

// Flip study card
function flipStudyCard() {
    if (window.modeStates[window.currentMode]?.shuffledVocab.length > 0) {
        const studyCard = document.getElementById('study-card');
        if (studyCard) studyCard.classList.toggle('flipped');
    }
}

// Set game tab (matching or fill)
function setGameTab(tab) {
    console.log('Setting game tab:', tab);
    window.modeStates.game.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabButton = document.getElementById(`${tab}-tab-btn`);
    if (tabButton) tabButton.classList.add('active');

    document.querySelectorAll('.game-content, .empty-state').forEach(content => content.classList.add('hidden'));

    const resetGameBtn = document.getElementById('reset-game-btn');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');
    if (resetGameBtn) resetGameBtn.classList.add('hidden');
    if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');

    let gameVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);
    console.log('Game Vocab:', gameVocab);

    if (gameVocab.length === 0) {
        console.log('No vocabulary, showing empty state');
        const emptyState = document.getElementById(`${tab}-empty-state`);
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        const gameContent = document.getElementById(`${tab}-game`);
        if (gameContent) {
            console.log('Showing game content:', `${tab}-game`);
            gameContent.classList.remove('hidden');
        } else {
            console.error(`Game content element ${tab}-game not found`);
        }
        if (tab === 'matching') {
            if (resetGameBtn) resetGameBtn.classList.remove('hidden');
            if (window.modeStates.game.matching.shuffledVocab.length > 0) {
                displayMatchingGame();
            } else {
                initMatchingGame();
            }
        } else if (tab === 'fill') {
            if (window.modeStates.game.fill.currentSentence && window.modeStates.game.fill.correctWord && window.modeStates.game.fill.options.length > 0) {
                console.log('Displaying existing fill game');
                displayFillGame();
                if (resetFillGameBtn) resetFillGameBtn.classList.remove('hidden'); // Hiển thị nút reset khi trạng thái hợp lệ
            } else {
                console.log('Initializing fill game');
                initFillGame();
            }
        }
    }

    window.updateStats();
    window.saveState();
}

// Initialize matching game
function initMatchingGame() {
    const koreanColumn = document.getElementById('korean-column');
    const vietnameseColumn = document.getElementById('vietnamese-column');
    const resultDiv = document.getElementById('matching-result');
    const matchingContainer = document.querySelector('.matching-container');
    if (!koreanColumn || !vietnameseColumn || !resultDiv || !matchingContainer) return;

    let gameVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);
    
    // Ẩn tất cả game content và chỉ hiển thị empty-state nếu rỗng
    document.querySelectorAll('.game-content, .empty-state').forEach(content => content.classList.add('hidden'));
    const emptyState = document.getElementById('matching-empty-state');
    if (gameVocab.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        vietnameseColumn.innerHTML = '';
        resultDiv.innerHTML = '';
        matchingContainer.style.height = 'auto';
        window.updateStats();
        return;
    }

    // Logic còn lại giữ nguyên
    gameVocab = gameVocab.sort(() => Math.random() - 0.5).slice(0, Math.min(4, gameVocab.length));
    window.modeStates.game.matching.shuffledVocab = gameVocab;

    const vietnameseWords = [...gameVocab].sort(() => Math.random() - 0.5);

    koreanColumn.innerHTML = '';
    vietnameseColumn.innerHTML = '';
    resultDiv.innerHTML = '';

    gameVocab.forEach(word => {
        const item = document.createElement('div');
        item.className = 'matching-item';
        item.textContent = word.korean;
        item.dataset.id = word.id;
        item.style.display = 'block';
        item.addEventListener('click', () => selectMatchingItem(word.id, 'korean'));
        koreanColumn.appendChild(item);
    });

    vietnameseWords.forEach(word => {
        const item = document.createElement('div');
        item.className = 'matching-item';
        item.textContent = word.vietnamese;
        item.dataset.id = word.id;
        item.style.display = 'block';
        item.addEventListener('click', () => selectMatchingItem(word.id, 'vietnamese'));
        vietnameseColumn.appendChild(item);
    });

    const itemHeight = 52;
    const gap = 12;
    const totalHeight = gameVocab.length * itemHeight + (gameVocab.length - 1) * gap;
    matchingContainer.style.height = `${totalHeight}px`;

    window.modeStates.game.matching.selectedKorean = null;
    window.modeStates.game.matching.selectedVietnamese = null;
    window.modeStates.game.matching.matchedPairs = [];
    window.updateStats();
    window.saveState();
}

// Display matching game
function displayMatchingGame() {
    const koreanColumn = document.getElementById('korean-column');
    const vietnameseColumn = document.getElementById('vietnamese-column');
    const resultDiv = document.getElementById('matching-result');
    const matchingContainer = document.querySelector('.matching-container');
    if (!koreanColumn || !vietnameseColumn || !resultDiv || !matchingContainer) return;

    let gameVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);
    window.toggleEmptyState('matching', gameVocab.length === 0);
    if (gameVocab.length === 0) {
        vietnameseColumn.innerHTML = '';
        resultDiv.innerHTML = '';
        matchingContainer.style.height = 'auto';
        window.updateStats();
        return;
    }

    if (window.modeStates.game.matching.shuffledVocab.length === 0 ||
        !window.modeStates.game.matching.shuffledVocab.every(word => gameVocab.some(w => w.id === word.id))) {
        gameVocab = gameVocab.sort(() => Math.random() - 0.5).slice(0, Math.min(4, gameVocab.length));
        window.modeStates.game.matching.shuffledVocab = gameVocab;
        window.modeStates.game.matching.matchedPairs = [];
        window.modeStates.game.matching.selectedKorean = null;
        window.modeStates.game.matching.selectedVietnamese = null;
    }

    koreanColumn.innerHTML = '';
    vietnameseColumn.innerHTML = '';
    resultDiv.innerHTML = '';

    window.modeStates.game.matching.shuffledVocab.forEach(word => {
        if (!window.modeStates.game.matching.matchedPairs.includes(word.id)) {
            const item = document.createElement('div');
            item.className = `matching-item ${window.modeStates.game.matching.selectedKorean === word.id ? 'selected' : ''}`;
            item.textContent = word.korean;
            item.dataset.id = word.id;
            item.addEventListener('click', () => selectMatchingItem(word.id, 'korean'));
            koreanColumn.appendChild(item);
        }
    });

    const vietnameseWords = [...window.modeStates.game.matching.shuffledVocab].sort(() => Math.random() - 0.5);
    vietnameseWords.forEach(word => {
        if (!window.modeStates.game.matching.matchedPairs.includes(word.id)) {
            const item = document.createElement('div');
            item.className = `matching-item ${window.modeStates.game.matching.selectedVietnamese === word.id ? 'selected' : ''}`;
            item.textContent = word.vietnamese;
            item.dataset.id = word.id;
            item.addEventListener('click', () => selectMatchingItem(word.id, 'vietnamese'));
            vietnameseColumn.appendChild(item);
        }
    });

    const remainingItems = window.modeStates.game.matching.shuffledVocab.length - window.modeStates.game.matching.matchedPairs.length;
    const itemHeight = 52;
    const gap = 12;
    const totalHeight = remainingItems > 0 ? remainingItems * itemHeight + (remainingItems - 1) * gap : 0;
    matchingContainer.style.height = `${totalHeight}px`;

    if (window.modeStates.game.matching.matchedPairs.length > 0) {
        const matchedPairsHtml = window.modeStates.game.matching.matchedPairs.map(id => {
            const word = window.modeStates.game.matching.shuffledVocab.find(w => w.id === id);
            return word ? `<div class="matched-pair">${word.korean} - ${word.vietnamese}</div>` : '';
        }).join('');

        resultDiv.innerHTML = `
            <div class="matched-pairs-container">
                <div class="matched-pairs-title">
                    <span>🥳</span>
                    <span>Các cặp đã ghép đúng (${window.modeStates.game.matching.matchedPairs.length}/${window.modeStates.game.matching.shuffledVocab.length})</span>
                </div>
                ${matchedPairsHtml}
            </div>
        `;
    }

    if (window.modeStates.game.matching.matchedPairs.length === window.modeStates.game.matching.shuffledVocab.length) {
        resultDiv.innerHTML += `
            <div class="game-completion">
                <div class="game-completion-text">
                    <span>🎊</span>
                    <span>Hoàn thành xuất sắc!</span>
                    <span>🎊</span>
                </div>
                <div style="margin-top: 10px; font-size: 1.1em; color: #2e7d32;">
                    Nhấn "Làm Lại Ghép Từ" để chơi tiếp!
                </div>
            </div>
        `;
    }

    window.updateStats();
    window.saveState();
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
            resultDiv.innerHTML = '<span style="color: #4ecdc4;">🎉 Ghép đúng!</span>';

            if (window.modeStates.game.matching.matchedPairs.length === window.modeStates.game.matching.shuffledVocab.length) {
                resultDiv.innerHTML = '<span style="color: #4ecdc4;">🎉 Hoàn thành! Nhấn "Làm Lại" để chơi tiếp!</span>';
            }

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
            resultDiv.innerHTML = '<span style="color: #ff6b6b;">❌ Ghép sai! Thử lại!</span>';
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

// Display fill game
function displayFillGame() {
    const sentenceDiv = document.getElementById('fill-sentence');
    const optionsContainer = document.getElementById('fill-options');
    const resultDiv = document.getElementById('fill-result');
    const fillGameDiv = document.getElementById('fill-game');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');
    if (!sentenceDiv || !optionsContainer || !resultDiv || !fillGameDiv) return;

    let gameVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);

    // Kiểm tra trạng thái game hợp lệ
    const isGameStateValid = window.modeStates.game.fill.currentSentence && window.modeStates.game.fill.correctWord && window.modeStates.game.fill.options.length > 0;

    // Ẩn tất cả game content và empty-state
    document.querySelectorAll('.game-content, .empty-state').forEach(content => content.classList.add('hidden'));

    // Nếu không có từ vựng hoặc trạng thái game không hợp lệ, hiển thị empty-state
    if (gameVocab.length === 0 || !isGameStateValid) {
        const emptyState = document.getElementById('fill-empty-state');
        if (emptyState) emptyState.classList.remove('hidden');
        optionsContainer.innerHTML = '';
        resultDiv.innerHTML = '';
        if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
        window.updateStats();
        return;
    }

    // Hiển thị nội dung game
    fillGameDiv.classList.remove('hidden');
    if (resetFillGameBtn) resetFillGameBtn.classList.remove('hidden');

    const sentenceText = window.modeStates.game.fill.currentSentence;
    const match = sentenceText.match(/^(.+) \((.+)\)$/);

    if (match) {
        const koreanSentence = match[1];
        const vietnameseSentence = match[2];
        sentenceDiv.innerHTML = `
            <div class="fill-sentence-display">
                <div class="fill-korean-sentence">${koreanSentence}</div>
                <div class="fill-vietnamese-sentence">${vietnameseSentence}</div>
            </div>
        `;
    } else {
        sentenceDiv.innerHTML = `
            <div class="fill-sentence-display">
                <div class="fill-korean-sentence">${sentenceText}</div>
            </div>
        `;
    }

    resultDiv.innerHTML = '';

    optionsContainer.innerHTML = '';
    window.modeStates.game.fill.options.forEach(word => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = word.korean;
        button.addEventListener('click', () => checkFillAnswer(word));
        optionsContainer.appendChild(button);
    });

    window.updateStats();
}

// Check fill game answer
function checkFillAnswer(selectedWord) {
    const resultDiv = document.getElementById('fill-result');
    const optionsContainer = document.getElementById('fill-options');
    if (!resultDiv || !optionsContainer) return;

    let [koreanSentence, vietnameseTranslation] = window.modeStates.game.fill.currentSentence.split(' (');
    vietnameseTranslation = vietnameseTranslation ? vietnameseTranslation.replace(')', '') : '';

    const underlinedKoreanWord = `<span class="underlined-word">${window.modeStates.game.fill.correctWord.korean}</span>`;
    const underlinedVietnameseWord = `<span class="underlined-word">${window.modeStates.game.fill.correctWord.vietnamese}</span>`;

    const completeKoreanSentence = koreanSentence.replace('___', underlinedKoreanWord);
    const completeVietnameseSentence = vietnameseTranslation.replace('___', underlinedVietnameseWord);

    const isCorrect = selectedWord.id === window.modeStates.game.fill.correctWord.id;
    document.querySelectorAll('#fill-options .btn').forEach(btn => {
        if (btn.textContent === selectedWord.korean) {
            if (selectedWord.id === window.modeStates.game.fill.correctWord.id) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        }
    });
    const containerClass = isCorrect ? 'fill-answer-container' : 'fill-answer-container wrong';
    const statusClass = isCorrect ? 'fill-answer-status correct' : 'fill-answer-status wrong';
    const statusIcon = isCorrect ? '🎉' : '❌';
    const statusText = isCorrect ? 'Chính xác!' : 'Chưa đúng!';

    resultDiv.innerHTML = `
    <div class="${containerClass}">
        <div class="${statusClass}">
            <span>${statusIcon}</span>
            <span>${statusText}</span>
            <span class="fill-correct-word">${window.modeStates.game.fill.correctWord.korean} - ${window.modeStates.game.fill.correctWord.vietnamese}</span>
        </div>
        <div class="fill-sentence-display">
            <div class="fill-korean-sentence">${completeKoreanSentence}</div>
            <div class="fill-vietnamese-sentence">${completeVietnameseSentence}</div>
        </div>
    </div>
`;

    optionsContainer.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
    window.updateStats();
    window.saveState();
}

// Reset matching game
function resetMatchingGame() {
    window.modeStates.game.matching = {
        selectedKorean: null,
        selectedVietnamese: null,
        matchedPairs: [],
        shuffledVocab: [],
    };
    initMatchingGame();
    window.saveState();
}

// Reset fill game
function resetFillGame() {
    window.modeStates.game.fill.currentSentence = '';
    window.modeStates.game.fill.correctWord = null;
    window.modeStates.game.fill.options = [];
    window.initFillGame();
    window.saveState();
}

// Export functions to global scope
window.setMode = setMode;
window.displayQuiz = displayQuiz;
window.checkAnswer = checkAnswer;
window.flipCard = flipCard;
window.flipStudyCard = flipStudyCard;
window.setGameTab = setGameTab;
window.initMatchingGame = initMatchingGame;
window.displayMatchingGame = displayMatchingGame;
window.selectMatchingItem = selectMatchingItem;
window.displayFillGame = displayFillGame;
window.checkFillAnswer = checkFillAnswer;
window.resetMatchingGame = resetMatchingGame;
window.resetFillGame = resetFillGame;