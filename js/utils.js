// Normalize category string
function normalizeCategory(str) {
    return str.trim().replace(/\s+/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

// Text-to-Speech for Korean
function playTTS(text) {
    const msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.lang = 'ko-KR';
    speechSynthesis.speak(msg);
}

// Navigation functions
function prevWord() {
    const currentState = window.modeStates[window.currentMode];
    if (currentState?.shuffledVocab.length > 0) {
        currentState.currentIndex = (currentState.currentIndex - 1 + currentState.shuffledVocab.length) % currentState.shuffledVocab.length;
        window.displayCurrentWord();
        window.saveState();
    }
}

function nextWord() {
    const currentState = window.modeStates[window.currentMode];
    if (currentState?.shuffledVocab.length > 0) {
        currentState.currentIndex = (currentState.currentIndex + 1) % currentState.shuffledVocab.length;
        window.displayCurrentWord();
        window.saveState();
    }
}

// Shuffle vocabulary
function shuffleWords() {
    const currentState = window.modeStates[window.currentMode];
    if (currentState?.shuffledVocab.length > 0) {
        currentState.shuffledVocab = [...currentState.shuffledVocab].sort(() => Math.random() - 0.5);
        currentState.currentIndex = 0;
        window.displayCurrentWord();
        window.saveState();
    }
}

// Reset progress
function resetProgress() {
    const currentState = window.modeStates[window.currentMode];
    if (currentState) {
        currentState.currentIndex = 0;
        currentState.shuffledVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => normalizeCategory(word.category) === window.selectedCategory);
        window.displayCurrentWord();
        window.saveState();
    }
}

// Filter vocabulary by category
function filterVocabByCategory() {
    const filteredVocab = window.selectedCategory === 'all'
        ? [...window.allVocab]
        : window.allVocab.filter(word => normalizeCategory(word.category) === normalizeCategory(window.selectedCategory));

    ['study', 'quiz', 'flashcard'].forEach(mode => {
        if (!window.modeStates[mode].shuffledVocab.length) {
            window.modeStates[mode].shuffledVocab = [...filteredVocab];
        } else {
            window.modeStates[mode].shuffledVocab = window.modeStates[mode].shuffledVocab
                .filter(word => filteredVocab.some(fw => fw.id === word.id))
                .concat(filteredVocab.filter(fw => !window.modeStates[mode].shuffledVocab.some(sw => sw.id === fw.id)));
        }
        window.modeStates[mode].currentIndex = Math.min(
            window.modeStates[mode].currentIndex,
            window.modeStates[mode].shuffledVocab.length > 0 ? window.modeStates[mode].shuffledVocab.length - 1 : 0
        );
    });

    window.modeStates.game.matching.shuffledVocab = filteredVocab.sort(() => Math.random() - 0.5).slice(0, Math.min(4, filteredVocab.length));
    window.modeStates.game.matching.matchedPairs = window.modeStates.game.matching.matchedPairs.filter(id =>
        window.modeStates.game.matching.shuffledVocab.some(word => word.id === id)
    );
    window.modeStates.game.matching.selectedKorean = null;
    window.modeStates.game.matching.selectedVietnamese = null;
    if (window.modeStates.game.fill.correctWord) {
        if (!filteredVocab.some(word => word.id === window.modeStates.game.fill.correctWord.id)) {
            window.modeStates.game.fill.currentSentence = '';
            window.modeStates.game.fill.correctWord = null;
            window.modeStates.game.fill.options = [];
        } else {
            window.modeStates.game.fill.options = window.modeStates.game.fill.options.filter(word =>
                filteredVocab.some(fw => fw.id === word.id)
            );
        }
    }

    window.updateStats();
    window.displayCurrentWord();
    if (window.currentMode === 'game') {
        if (window.modeStates.game.currentTab === 'matching') {
            window.initMatchingGame();
        } else if (window.modeStates.game.currentTab === 'fill') {
            if (window.modeStates.game.fill.currentSentence && window.modeStates.game.fill.correctWord && window.modeStates.game.fill.options.length > 0) {
                window.displayFillGame();
            } else {
                window.initFillGame(); // Khởi tạo lại game nếu trạng thái không hợp lệ
            }
        }
    }
    window.saveState();
}

// Flashcard actions
function markWrong() {
    if (window.modeStates[window.currentMode]?.shuffledVocab.length > 0) {
        const currentState = window.modeStates[window.currentMode];
        const word = currentState.shuffledVocab[currentState.currentIndex];
        window.saveUnknownWord(word).then(() => {
            nextWord();
            window.saveState();
        }).catch(err => {
            document.getElementById('form-message').textContent = 'Lỗi khi lưu từ chưa biết!';
        });
    }
}

// Toggle between popup and window mode
async function toggleWindowMode() {
    await window.saveState();
    chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 615,
        height: 615,
        left: 100,
        top: 100
    });
    window.close();
}

// Form clearing functions
function clearForm() {
    const koreanInput = document.getElementById('korean-input');
    if (koreanInput) koreanInput.value = '';
    const pronunciationInput = document.getElementById('pronunciation-input');
    if (pronunciationInput) pronunciationInput.value = '';
    const vietnameseInput = document.getElementById('vietnamese-input');
    if (vietnameseInput) vietnameseInput.value = '';
    const exampleInput = document.getElementById('example-input');
    if (exampleInput) exampleInput.value = '';
    const noteInput = document.getElementById('note-input');
    if (noteInput) noteInput.value = '';
    const categoryInput = document.getElementById('category-input');
    if (categoryInput) categoryInput.value = '';
    const formMessage = document.getElementById('form-message');
    if (formMessage) formMessage.textContent = '';
    window.editingWordId = null;
    window.modalState = {
        isModalOpen: false,
        modalInputs: { korean: '', pronunciation: '', vietnamese: '', example: '', category: '', note: '' },
        editingWordId: null,
        saveButtonText: 'Lưu'
    };
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) saveWordBtn.textContent = 'Lưu';
    const wordModal = document.getElementById('word-modal');
    if (wordModal) wordModal.classList.add('hidden');
    window.saveState();
}

function clearUploadForm() {
    const vocabListInput = document.getElementById('vocab-list-input');
    if (vocabListInput) vocabListInput.value = '';
    const listCategoryInput = document.getElementById('list-category-input');
    if (listCategoryInput) listCategoryInput.value = '';
    const uploadMessage = document.getElementById('upload-message');
    if (uploadMessage) uploadMessage.textContent = '';
}

function clearImportForm() {
    const importFile = document.getElementById('import-file');
    if (importFile) importFile.value = '';
    const importMessage = document.getElementById('import-message');
    if (importMessage) importMessage.textContent = '';
}

function clearSearch() {
    const vocabSearch = document.getElementById('vocab-search');
    if (vocabSearch && window.currentMode === 'manage') {
        vocabSearch.value = '';
        window.searchQuery = '';
        window.updateVocabList();
    }
}

// Export functions to global scope
window.normalizeCategory = normalizeCategory;
window.playTTS = playTTS;
window.prevWord = prevWord;
window.nextWord = nextWord;
window.shuffleWords = shuffleWords;
window.resetProgress = resetProgress;
window.filterVocabByCategory = filterVocabByCategory;
window.markCorrect = markCorrect;
window.markWrong = markWrong;
window.toggleWindowMode = toggleWindowMode;
window.clearForm = clearForm;
window.clearUploadForm = clearUploadForm;
window.clearImportForm = clearImportForm;
window.clearSearch = clearSearch;