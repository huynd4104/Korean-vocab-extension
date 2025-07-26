/**
 * Event handlers module for user interactions
 * Handles button clicks, form submissions, and keyboard events
 */

// Modal management functions
function openAddWordModal() {
    window.modalState = {
        isModalOpen: true,
        modalInputs: { korean: '', pronunciation: '', vietnamese: '', example: '', category: '', note: '' },
        lookupOptions: { pronunciation: true, vietnamese: true, example: true },
        editingWordId: null,
        saveButtonText: 'Lưu'
    };
    const koreanInput = document.getElementById('korean-input');
    if (koreanInput) koreanInput.value = '';
    const pronunciationInput = document.getElementById('pronunciation-input');
    if (pronunciationInput) pronunciationInput.value = '';
    const vietnameseInput = document.getElementById('vietnamese-input');
    if (vietnameseInput) vietnameseInput.value = '';
    const exampleInput = document.getElementById('example-input');
    if (exampleInput) exampleInput.value = '';
    const categoryInput = document.getElementById('category-input');
    if (categoryInput) categoryInput.value = '';
    const lookupPronunciation = document.getElementById('lookup-pronunciation');
    if (lookupPronunciation) lookupPronunciation.checked = true;
    const lookupVietnamese = document.getElementById('lookup-vietnamese');
    if (lookupVietnamese) lookupVietnamese.checked = true;
    const lookupExample = document.getElementById('lookup-example');
    if (lookupExample) lookupExample.checked = true;
    const formMessage = document.getElementById('form-message');
    if (formMessage) formMessage.textContent = '';
    window.editingWordId = null;
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) saveWordBtn.textContent = 'Lưu';
    const wordModal = document.getElementById('word-modal');
    if (wordModal) wordModal.classList.remove('hidden');
    window.updateCategorySuggestions();
    window.saveState();
}

function closeModal() {
    window.clearForm();
}

function editWord(word) {
    window.modalState = {
        isModalOpen: true,
        modalInputs: {
            korean: word.korean,
            pronunciation: word.pronunciation,
            vietnamese: word.vietnamese,
            example: word.example || '',
            category: word.category,
            note: word.note || ''
        },
        lookupOptions: { pronunciation: true, vietnamese: true, example: true },
        editingWordId: word.id,
        saveButtonText: 'Cập Nhật'
    };
    const koreanInput = document.getElementById('korean-input');
    if (koreanInput) koreanInput.value = word.korean;
    const pronunciationInput = document.getElementById('pronunciation-input');
    if (pronunciationInput) pronunciationInput.value = word.pronunciation;
    const vietnameseInput = document.getElementById('vietnamese-input');
    if (vietnameseInput) vietnameseInput.value = word.vietnamese;
    const exampleInput = document.getElementById('example-input');
    if (exampleInput) exampleInput.value = word.example || '';
    const noteInput = document.getElementById('note-input');
    if (noteInput) noteInput.value = word.note || '';
    const categoryInput = document.getElementById('category-input');
    if (categoryInput) categoryInput.value = word.category;
    const lookupPronunciation = document.getElementById('lookup-pronunciation');
    if (lookupPronunciation) lookupPronunciation.checked = true;
    const lookupVietnamese = document.getElementById('lookup-vietnamese');
    if (lookupVietnamese) lookupVietnamese.checked = true;
    const lookupExample = document.getElementById('lookup-example');
    if (lookupExample) lookupExample.checked = true;
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) saveWordBtn.textContent = 'Cập Nhật';
    const formMessage = document.getElementById('form-message');
    if (formMessage) formMessage.textContent = '';
    window.editingWordId = word.id;
    const wordModal = document.getElementById('word-modal');
    if (wordModal) wordModal.classList.remove('hidden');
    window.updateCategorySuggestions();
    window.saveState();
}

// API Key modal functions
function openApiKeyModal() {
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeyMessage = document.getElementById('api-key-message');
    if (apiKeyModal && apiKeyInput && apiKeyMessage) {
        apiKeyInput.value = '';
        apiKeyMessage.textContent = '';
        apiKeyModal.classList.remove('hidden');
        window.updateApiKeyList();
    }
}

function closeApiKeyModal() {
    const apiKeyModal = document.getElementById('api-key-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeyMessage = document.getElementById('api-key-message');
    if (apiKeyModal && apiKeyInput && apiKeyMessage) {
        apiKeyInput.value = '';
        apiKeyMessage.textContent = '';
        apiKeyModal.classList.add('hidden');
    }
}

function handleSaveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeyMessage = document.getElementById('api-key-message');
    if (!apiKeyInput || !apiKeyMessage) return;

    const key = apiKeyInput.value.trim();
    if (!key) {
        apiKeyMessage.textContent = 'Vui lòng nhập API Key!';
        apiKeyMessage.style.color = '#ff0000';
        return;
    }

    window.saveApiKey(key).then(() => {
        apiKeyMessage.textContent = 'Lưu API Key thành công!';
        apiKeyMessage.style.color = '#4ecdc4';
        setTimeout(() => {
        apiKeyMessage.textContent = '';
    }, 2000);
        window.saveApiKeysToDB();
        apiKeyInput.value = '';
        window.updateApiKeyList();
    }).catch(err => {
        apiKeyMessage.textContent = 'Lỗi khi lưu API Key: ' + err.message;
        apiKeyMessage.style.color = '#ff0000';
    });
}

// Form handlers
function handleSaveWord() {
    const koreanInput = document.getElementById('korean-input');
    const pronunciationInput = document.getElementById('pronunciation-input');
    const vietnameseInput = document.getElementById('vietnamese-input');
    const exampleInput = document.getElementById('example-input');
    const categoryInput = document.getElementById('category-input');
    const messageDiv = document.getElementById('form-message');

    if (!koreanInput || !pronunciationInput || !vietnameseInput || !exampleInput || !categoryInput || !messageDiv) return;

    const korean = koreanInput.value.trim();
    const pronunciation = pronunciationInput.value.trim();
    const vietnamese = vietnameseInput.value.trim();
    const example = exampleInput.value.trim();
    const category = window.normalizeCategory(categoryInput.value);

    if (!korean || !pronunciation || !vietnamese || !category) {
        messageDiv.textContent = 'Vui lòng điền đầy đủ các trường bắt buộc!';
        messageDiv.style.color = '#ff0000';
        return;
    }

    const noteInput = document.getElementById('note-input');
    const note = noteInput ? noteInput.value.trim() : '';
    const word = { korean, pronunciation, vietnamese, example, category, note };
    if (window.editingWordId !== null) {
        word.id = window.editingWordId;
    }

    window.saveWord(word).then(() => {
        window.clearForm();
        window.loadVocabulary().then(() => {
            Object.keys(window.modeStates).forEach(mode => {
                const currentIndex = window.modeStates[mode].currentIndex;
                const shuffledVocab = window.modeStates[mode].shuffledVocab;
                const wordIndex = shuffledVocab.findIndex(w => w.id === word.id);
                if (wordIndex !== -1) {
                    shuffledVocab[wordIndex] = word;
                }
                window.modeStates[mode].shuffledVocab = window.selectedCategory === 'all'
                    ? [...window.allVocab]
                    : window.allVocab.filter(w => w.category === window.selectedCategory);
                window.modeStates[mode].currentIndex = Math.min(currentIndex, window.modeStates[mode].shuffledVocab.length - 1);
            });
            window.updateCategorySelector();
            window.updateCategorySuggestions();
            window.filterVocabByCategory();
            window.setMode(window.currentMode);
            messageDiv.textContent = window.editingWordId !== null ? 'Cập nhật thành công!' : 'Thêm từ thành công!';
            messageDiv.style.color = '#4ecdc4';
        });
    }).catch(err => {
        messageDiv.textContent = 'Lỗi khi lưu từ: ' + err.message;
        messageDiv.style.color = '#ff0000';
    });
}

function handleUploadList() {
    const vocabListInput = document.getElementById('vocab-list-input');
    const listCategoryInput = document.getElementById('list-category-input');
    const messageDiv = document.getElementById('upload-message');
    if (!vocabListInput || !messageDiv) return;

    const vocabListValue = vocabListInput.value.trim();
    const category = window.normalizeCategory(listCategoryInput?.value || 'Khác');

    if (!vocabListValue) {
        messageDiv.textContent = 'Vui lòng nhập danh sách từ vựng!';
        return;
    }

    const lines = vocabListValue.split('\n').map(line => line.trim()).filter(line => line);
    const validWords = [];
    const errors = [];

    lines.forEach((line, index) => {
        const parts = line.split('`');
        if (parts.length >= 3 && parts.slice(0, 3).every(part => part)) {
            validWords.push({
                korean: parts[0],
                pronunciation: parts[1],
                vietnamese: parts[2],
                category,
                example: parts[3] || '',
                note: parts[4] || ''
            });
        } else {
            errors.push(`Dòng ${index + 1}: Định dạng không hợp lệ (${line})`);
        }
    });

    if (validWords.length === 0) {
        messageDiv.textContent = 'Không có từ vựng hợp lệ để lưu!\n' + errors.join('\n');
        return;
    }

    const savePromises = validWords.map(word => window.saveWord(word));

    Promise.all(savePromises).then(() => {
        window.clearUploadForm();
        messageDiv.textContent = `Đã thêm ${validWords.length} từ thành công!${errors.length ? '\nLỗi:\n' + errors.join('\n') : ''}`;
        messageDiv.style.color = '#4ecdc4';
        window.saveState();
    }).catch(err => {
        messageDiv.textContent = `Lỗi khi lưu danh sách từ: ${err.message}`;
    });
}

function handleExportAll() {
    const formMessage = document.getElementById('form-message');
    if (!formMessage) return;

    if (window.allVocab.length === 0) {
        formMessage.textContent = 'Không có từ vựng để xuất khẩu!';
        return;
    }

    const exportData = window.allVocab.map(word =>
        `${word.korean}\`${word.pronunciation}\`${word.vietnamese}\`${word.category}\`${word.example || ''}\`${word.note || ''}`
    ).join('\n');

    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'korean-vocabulary.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    formMessage.textContent = 'Đã xuất danh sách từ!';
    formMessage.style.color = '#4ecdc4';
}

function handleImportFile() {
    const fileInput = document.getElementById('import-file');
    const messageDiv = document.getElementById('import-message');
    if (!fileInput || !messageDiv) return;

    const file = fileInput.files[0];
    if (!file) {
        messageDiv.textContent = 'Vui lòng chọn file để nhập!';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const valid = [];
        const errors = [];

        lines.forEach((line, idx) => {
            const parts = line.split('`');

            if (parts.length >= 3 && parts.slice(0, 3).every(p => p)) {
                valid.push({
                    korean: parts[0],
                    pronunciation: parts[1],
                    vietnamese: parts[2],
                    category: window.normalizeCategory(parts[3] || 'Khác'),
                    example: parts[4] || '',
                    note: parts[5] || ''
                });
            } else {
                errors.push(`Dòng ${idx + 1}: Định dạng không hợp lệ (${line})`);
            }
        });

        if (valid.length === 0) {
            messageDiv.textContent = 'Không có từ vựng hợp lệ để nhập!\n' + errors.join('\n');
            return;
        }

        Promise.all(valid.map(window.saveWord)).then(() => {
            window.clearImportForm();
            messageDiv.textContent = `Đã nhập ${valid.length} từ thành công!` +
                (errors.length ? '\nLỗi:\n' + errors.join('\n') : '');
            messageDiv.style.color = '#4ecdc4';
            window.saveState();
        }).catch(err => {
            messageDiv.textContent = 'Lỗi khi nhập danh sách từ: ' + err.message;
        });
    };
    reader.readAsText(file);
}

// Event handlers
function handleSearch() {
    const vocabSearch = document.getElementById('vocab-search');
    if (vocabSearch && window.currentMode === 'manage') {
        window.searchQuery = vocabSearch.value.trim();
        window.updateVocabList();
    }
}

function handleFlashcardDisplayModeChange() {
    const flashcardDisplayMode = document.getElementById('flashcard-display-mode');
    if (flashcardDisplayMode) {
        window.modeStates.flashcard.flashcardDisplayMode = flashcardDisplayMode.value;
        window.displayCurrentWord();
        window.saveState();
    }
}

function handleDeleteAll() {
    const formMessage = document.getElementById('form-message');
    if (!formMessage) return;

    if (window.allVocab.length === 0) {
        formMessage.textContent = 'Không có từ vựng để xóa!';
        return;
    }

    if (confirm('Bạn có chắc muốn xóa tất cả từ vựng?')) {
        window.deleteAllWords().then(() => {
            formMessage.textContent = 'Đã xóa tất cả từ!';
            formMessage.style.color = '#4ecdc4';
        }).catch(err => {
            formMessage.textContent = 'Lỗi khi xóa tất cả từ!';
        });
    }
}

function handleDeleteAllUnknown() {
    const formMessage = document.getElementById('form-message');
    if (!formMessage) return;

    if (window.unknownWords.length === 0) {
        formMessage.textContent = 'Không có từ chưa biết để xóa!';
        return;
    }

    if (confirm('Bạn có chắc muốn xóa tất cả từ chưa biết?')) {
        window.deleteAllUnknownWords().then(() => {
            window.unknownWords = [];
            window.updateUnknownList();
            formMessage.textContent = 'Đã xóa tất cả từ chưa biết!';
            formMessage.style.color = '#4ecdc4';
        }).catch(err => {
            formMessage.textContent = 'Lỗi khi xóa tất cả từ chưa biết!';
        });
    }
}

function handleCategoryChange() {
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) {
        window.selectedCategory = categorySelect.value === 'all' ? 'all' : window.normalizeCategory(categorySelect.value);
        window.filterVocabByCategory();
        if (window.currentMode === 'manage') {
            window.updateVocabList();
        }
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Mode buttons
    const modeButtons = {
        'study': document.getElementById('study-mode-btn'),
        'quiz': document.getElementById('quiz-mode-btn'),
        'flashcard': document.getElementById('flashcard-mode-btn'),
        'unknown': document.getElementById('unknown-mode-btn'),
        'manage': document.getElementById('manage-mode-btn')
    };
    Object.entries(modeButtons).forEach(([mode, button]) => {
        if (button) {
            button.addEventListener('click', () => window.setMode(mode));
        } 
    });

    // Word lookup and editing
    const lookupWordBtn = document.getElementById('lookup-word-btn');
    if (lookupWordBtn) {
        lookupWordBtn.addEventListener('click', () => {
            const koreanInput = document.getElementById('korean-input');
            if (koreanInput) {
                window.lookupWord(koreanInput.value.trim());
            }
        });
    }

    const editStudyWordBtn = document.getElementById('edit-word-btn');
    if (editStudyWordBtn) {
        editStudyWordBtn.addEventListener('click', () => {
            const currentState = window.modeStates[window.currentMode];
            if (currentState?.shuffledVocab.length > 0) {
                const word = currentState.shuffledVocab[currentState.currentIndex];
                editWord(word);
            }
        });
    }

    // Control buttons
    const shuffleBtn = document.getElementById('shuffle-btn');
    if (shuffleBtn) shuffleBtn.addEventListener('click', window.shuffleWords);
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', window.resetProgress);
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', window.prevWord);
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.addEventListener('click', window.nextWord);

    // Flashcard and study interactions
    const flashcard = document.getElementById('flashcard');
    if (flashcard) flashcard.addEventListener('click', (event) => {
        // Chỉ lật thẻ nếu click vào vùng flip-card-inner
        if (event.target.closest('.flip-card-inner')) {
            window.flipCard();
        }
    });

    const markCorrectBtn = document.getElementById('mark-correct-btn');
    if (markCorrectBtn) {
        markCorrectBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Ngăn sự kiện click lan truyền lên flashcard
            window.markCorrect();
        });
    }
    
    const markWrongBtn = document.getElementById('mark-wrong-btn');
    if (markWrongBtn) {
        markWrongBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Ngăn sự kiện click lan truyền lên flashcard
            window.markWrong();
        });
    }
    
    const playTtsFlashcardBtn = document.getElementById('play-tts-flashcard-btn');
    if (playTtsFlashcardBtn) {
        playTtsFlashcardBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Ngăn sự kiện click lan truyền lên flashcard
            const currentState = window.modeStates.flashcard;
            if (currentState?.shuffledVocab.length > 0) {
                const word = currentState.shuffledVocab[currentState.currentIndex];
                window.playTTS(word.korean);
            }
        });
    }

    const windowToggleBtn = document.getElementById('window-toggle-btn');
    if (windowToggleBtn) windowToggleBtn.addEventListener('click', window.toggleWindowMode);

    // Management functions
    const deleteAllBtn = document.getElementById('delete-all-btn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', handleDeleteAll);
    const uploadListBtn = document.getElementById('upload-list-btn');
    if (uploadListBtn) uploadListBtn.addEventListener('click', handleUploadList);
    const categorySelect = document.getElementById('category-select');
    if (categorySelect) categorySelect.addEventListener('change', handleCategoryChange);
    const vocabSearch = document.getElementById('vocab-search');
    if (vocabSearch) vocabSearch.addEventListener('input', handleSearch);
    const clearUnknownBtn = document.getElementById('clear-unknown-btn');
    if (clearUnknownBtn) clearUnknownBtn.addEventListener('click', handleDeleteAllUnknown);
    const flashcardDisplayMode = document.getElementById('flashcard-display-mode');
    if (flashcardDisplayMode) flashcardDisplayMode.addEventListener('change', handleFlashcardDisplayModeChange);
    const quizDisplayMode = document.getElementById('quiz-display-mode');
    if (quizDisplayMode) {
        quizDisplayMode.addEventListener('change', () => {
            window.modeStates.quiz.quizDisplayMode = quizDisplayMode.value;
            window.displayCurrentWord();
            window.saveState();
        });
    }

    // Game mode
    const gameModeBtn = document.getElementById('game-mode-btn');
    if (gameModeBtn) gameModeBtn.addEventListener('click', () => window.setMode('game'));
    const matchingTabBtn = document.getElementById('matching-tab-btn');
    if (matchingTabBtn) matchingTabBtn.addEventListener('click', () => window.setGameTab('matching'));
    const fillTabBtn = document.getElementById('fill-tab-btn');
    if (fillTabBtn) fillTabBtn.addEventListener('click', () => window.setGameTab('fill'));
    const resetGameBtn = document.getElementById('reset-game-btn');
    if (resetGameBtn) resetGameBtn.addEventListener('click', window.resetMatchingGame);
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');
    if (resetFillGameBtn) resetFillGameBtn.addEventListener('click', window.resetFillGame);

    // Import/Export
    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) exportAllBtn.addEventListener('click', handleExportAll);
    const importFileBtn = document.getElementById('import-file-btn');
    if (importFileBtn) importFileBtn.addEventListener('click', handleImportFile);

    // Modal management
    const addWordBtn = document.getElementById('add-word-btn');
    if (addWordBtn) addWordBtn.addEventListener('click', openAddWordModal);
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) saveWordBtn.addEventListener('click', handleSaveWord);

    // TTS buttons
    const playTtsBtn = document.getElementById('play-tts-btn');
    if (playTtsBtn) {
        playTtsBtn.addEventListener('click', () => {
            const currentState = window.modeStates[window.currentMode];
            if (currentState?.shuffledVocab.length > 0) {
                const word = currentState.shuffledVocab[currentState.currentIndex];
                window.playTTS(word.korean);
            }
        });
    }
    const playTtsQuizBtn = document.getElementById('play-tts-quiz-btn');
    if (playTtsQuizBtn) {
        playTtsQuizBtn.addEventListener('click', () => {
            const currentState = window.modeStates.quiz;
            if (currentState?.shuffledVocab.length > 0) {
                const word = currentState.shuffledVocab[currentState.currentIndex];
                window.playTTS(word.korean);
            }
        });
    }

    // API Key management
    const openApiKeyModalBtn = document.getElementById('open-api-key-modal-btn');
    if (openApiKeyModalBtn) openApiKeyModalBtn.addEventListener('click', openApiKeyModal);
    const closeApiKeyModalBtn = document.getElementById('close-api-key-modal-btn');
    if (closeApiKeyModalBtn) closeApiKeyModalBtn.addEventListener('click', closeApiKeyModal);
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    if (saveApiKeyBtn) saveApiKeyBtn.addEventListener('click', handleSaveApiKey);

    // Modal input listeners for state saving
    ['korean-input', 'pronunciation-input', 'vietnamese-input', 'example-input', 'category-input'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                window.modalState.modalInputs = {
                    korean: document.getElementById('korean-input')?.value || '',
                    pronunciation: document.getElementById('pronunciation-input')?.value || '',
                    vietnamese: document.getElementById('vietnamese-input')?.value || '',
                    note: document.getElementById('note-input')?.value || '',
                    example: document.getElementById('example-input')?.value || '',
                    category: document.getElementById('category-input')?.value || ''
                };
                window.saveState();
            });
        }
    });

    // Modal checkbox listeners for state saving
    ['lookup-pronunciation', 'lookup-vietnamese', 'lookup-example'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                window.modalState.lookupOptions = {
                    pronunciation: document.getElementById('lookup-pronunciation')?.checked || true,
                    vietnamese: document.getElementById('lookup-vietnamese')?.checked || true,
                    example: document.getElementById('lookup-example')?.checked || true
                };
                window.saveState();
            });
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            return;
        }

        if (event.key === 'ArrowLeft' || event.keyCode === 37) {
            event.preventDefault();
            window.prevWord();
        }
        else if (event.key === 'ArrowRight' || event.keyCode === 39) {
            event.preventDefault();
            window.nextWord();
        }
        else if ((event.key === '0' || event.keyCode === 48 || event.code === 'Space' || event.keyCode === 32) && (window.currentMode === 'flashcard' || window.currentMode === 'study')) {
            event.preventDefault();
            if (window.currentMode === 'flashcard') {
                window.flipCard();
            } else if (window.currentMode === 'study') {
                window.flipStudyCard();
            }
        }
        else if (event.shiftKey && ['study', 'quiz', 'flashcard'].includes(window.currentMode)) {
            event.preventDefault();
            const currentState = window.modeStates[window.currentMode];
            if (currentState?.shuffledVocab.length > 0) {
                const word = currentState.shuffledVocab[currentState.currentIndex];
                window.playTTS(word.korean);
            }
        }

        if (window.currentMode === 'quiz' && window.modeStates.quiz.shuffledVocab.length > 0) {
            const options = document.querySelectorAll('#quiz-options .btn');
            if (options.length === 4 && !options[0].disabled) {
                if (event.key === '4' || event.keyCode === 52) {
                    event.preventDefault();
                    options[0].click();
                } else if (event.key === '5' || event.keyCode === 53) {
                    event.preventDefault();
                    options[1].click();
                } else if (event.key === '1' || event.keyCode === 49) {
                    event.preventDefault();
                    options[2].click();
                } else if (event.key === '2' || event.keyCode === 50) {
                    event.preventDefault();
                    options[3].click();
                }
            }
        }
    });
}

// Export functions to global scope
window.openAddWordModal = openAddWordModal;
window.closeModal = closeModal;
window.editWord = editWord;
window.openApiKeyModal = openApiKeyModal;
window.closeApiKeyModal = closeApiKeyModal;
window.handleSaveApiKey = handleSaveApiKey;
window.handleSaveWord = handleSaveWord;
window.handleUploadList = handleUploadList;
window.handleExportAll = handleExportAll;
window.handleImportFile = handleImportFile;
window.handleSearch = handleSearch;
window.handleFlashcardDisplayModeChange = handleFlashcardDisplayModeChange;
window.handleDeleteAll = handleDeleteAll;
window.handleDeleteAllUnknown = handleDeleteAllUnknown;
window.handleCategoryChange = handleCategoryChange;
window.initializeEventListeners = initializeEventListeners;