// Modal management functions
function setupWordModal(word = {}) {
    const isEditing = !!word.id;

    // Cập nhật trạng thái global
    window.modalState.wordModal.isOpen = true;
    window.modalState.wordModal.editingWordId = word.id || null;
    window.modalState.wordModal.saveButtonText = isEditing ? 'Cập Nhật' : 'Lưu';

    // Lấy các element của form
    const elements = {
        korean: document.getElementById('korean-input'),
        pronunciation: document.getElementById('pronunciation-input'),
        vietnamese: document.getElementById('vietnamese-input'),
        example: document.getElementById('example-input'),
        note: document.getElementById('note-input'),
        category: document.getElementById('category-input'),
        saveBtn: document.getElementById('save-word-btn'),
        modal: document.getElementById('word-modal'),
    };

    // Điền dữ liệu vào form VÀ cập nhật trực tiếp vào state
    elements.korean.value = word.korean || '';
    window.modalState.wordModal.inputs.korean = elements.korean.value;

    elements.pronunciation.value = word.pronunciation || '';
    window.modalState.wordModal.inputs.pronunciation = elements.pronunciation.value;

    elements.vietnamese.value = word.vietnamese || '';
    window.modalState.wordModal.inputs.vietnamese = elements.vietnamese.value;

    elements.example.value = word.example || '';
    window.modalState.wordModal.inputs.example = elements.example.value;

    elements.note.value = word.note || '';
    window.modalState.wordModal.inputs.note = elements.note.value;

    elements.category.value = word.category || '';
    window.modalState.wordModal.inputs.category = elements.category.value;

    elements.saveBtn.textContent = window.modalState.wordModal.saveButtonText;

    // Hiển thị modal và các thao tác khác
    if (elements.modal) elements.modal.classList.remove('hidden');
    window.updateCategorySuggestions();
    window.saveState();  
}

function openAddWordModal() {
    setupWordModal();  
}

function editWord(word) {
    setupWordModal(word);  
}

function clearWordModalForm() {
    const ids = ['korean-input', 'pronunciation-input', 'vietnamese-input', 'example-input', 'category-input', 'note-input'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const saveWordBtn = document.getElementById('save-word-btn');
    if (saveWordBtn) saveWordBtn.textContent = 'Lưu';
    window.editingWordId = null;
}

function closeModal() {
    clearWordModalForm();
    const wordModal = document.getElementById('word-modal');
    if (wordModal) wordModal.classList.add('hidden');
    window.modalState.wordModal.isOpen = false; 
    window.saveState();
}

// API Key modal functions
function openApiKeyModal() {
    document.getElementById('api-key-modal')?.classList.remove('hidden');
    window.modalState.apiKeyModal.isOpen = true;
    window.updateApiKeyList();
    window.saveState();
}

function closeApiKeyModal() {
    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) apiKeyInput.value = '';
    document.getElementById('api-key-modal')?.classList.add('hidden');
    window.modalState.apiKeyModal.isOpen = false; 
    window.modalState.apiKeyModal.input = '';  
    window.saveState();
}

async function handleSaveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    if (!apiKeyInput) return;

    const key = apiKeyInput.value.trim();
    if (!key) {
        window.showToast('Vui lòng nhập API Key!', 'error');
        return;
    }

    try {
        await window.saveApiKey(key);
        window.showToast('Lưu API Key thành công!', 'success');
        apiKeyInput.value = '';
        window.updateApiKeyList();
        await window.saveApiKeysToDB();
    } catch (err) {
        window.showToast('Lỗi khi lưu API Key: ' + err.message, 'error');
    }
}

// Category modal functions
function resetCategoryModal() {
    const categoryInput = document.getElementById('category-name-input');
    if (categoryInput) categoryInput.value = '';
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (saveCategoryBtn) saveCategoryBtn.textContent = 'Thêm Danh Mục';

    window.editingCategoryId = null; 
    
    window.modalState.categoryModal.input = '';
    window.modalState.categoryModal.editingCategoryId = null;
    
    window.saveState(); 
}

function clearCategoryModalForm() {
    const categoryInput = document.getElementById('category-name-input');
    if (categoryInput) categoryInput.value = '';
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (saveCategoryBtn) saveCategoryBtn.textContent = 'Thêm Danh Mục';
    window.editingCategoryId = null;
}

function openCategoryModal() {
    resetCategoryModal();
    document.getElementById('category-modal')?.classList.remove('hidden');
    window.modalState.categoryModal.isOpen = true; 
    window.updateCategoryList();
    window.saveState();
}

function closeCategoryModal() {
    if (window.modalState.categoryModal.editingCategoryId !== null) {
        resetCategoryModal();
    } else {
        document.getElementById('category-modal')?.classList.add('hidden');
        window.modalState.categoryModal.isOpen = false;
        resetCategoryModal(); 
    }
}

async function handleSaveCategory() {
    const categoryInput = document.getElementById('category-name-input');
    if (!categoryInput) return;

    const name = categoryInput.value.trim();
    if (!name) {
        window.showToast('Vui lòng nhập tên danh mục!', 'error');
        return;
    }

    const normalizedName = window.normalizeCategory(name);
    const isDuplicate = window.allCategories.some(cat =>
        window.normalizeCategory(cat.name) === normalizedName && cat.id !== window.editingCategoryId
    );

    if (isDuplicate) {
        window.showToast('Tên danh mục đã tồn tại. Vui lòng chọn tên khác!', 'error');
        return;
    }

    const category = { name };
    if (window.editingCategoryId !== null) {
        category.id = window.editingCategoryId;
    }

    try {
        await window.saveCategory(category);
        const successMessage = window.editingCategoryId !== null ? 'Cập nhật danh mục thành công!' : 'Thêm danh mục thành công!';
        window.showToast(successMessage, 'success');

        resetCategoryModal();
        
        await Promise.all([window.loadVocabulary(), window.loadCategories()]);
        
        window.updateCategorySelector();
        window.updateCategorySuggestions();
        window.updateCategoryList();
        window.filterVocabByCategory();
        window.setMode(window.currentMode);
        await window.saveState();
    } catch (err) {
        window.showToast('Lỗi khi lưu danh mục: ' + err.message, 'error');
    }
}

function editCategory(category) {
    const categoryModal = document.getElementById('category-modal');
    const categoryInput = document.getElementById('category-name-input');
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (!categoryInput || !saveCategoryBtn || !categoryModal) return;

    categoryInput.value = category.name;
    saveCategoryBtn.textContent = 'Cập Nhật';
    window.editingCategoryId = category.id;
    // Cập nhật state
    window.modalState.categoryModal.isOpen = true;
    window.modalState.categoryModal.input = category.name;
    window.modalState.categoryModal.editingCategoryId = category.id;
    categoryModal.classList.remove('hidden');
    window.saveState();
}

// Form handlers
async function handleSaveWord() {
    const elements = {
        korean: document.getElementById('korean-input'),
        pronunciation: document.getElementById('pronunciation-input'),
        vietnamese: document.getElementById('vietnamese-input'),
        example: document.getElementById('example-input'),
        category: document.getElementById('category-input'),
        note: document.getElementById('note-input'),
    };

    const korean = elements.korean.value.trim();
    const pronunciation = elements.pronunciation.value.trim();
    const vietnamese = elements.vietnamese.value.trim();
    const category = window.normalizeCategory(elements.category.value);

    if (!korean || !pronunciation || !vietnamese || !category) {
        window.showToast('Vui lòng điền đầy đủ các trường bắt buộc!', 'error');
        return;
    }

    const word = {
        korean,
        pronunciation,
        vietnamese,
        example: elements.example.value.trim(),
        category,
        note: elements.note.value.trim(),
    };

    if (window.modalState.wordModal.editingWordId !== null) {  
        word.id = window.modalState.wordModal.editingWordId;
    }

    try {
        await window.saveWord(word);
        const wordMessage = window.editingWordId !== null ? 'Cập nhật thành công!' : 'Thêm từ thành công!';
        window.showToast(wordMessage, 'success');
        
        closeModal(); 
        
        await window.loadVocabulary();
        
        window.updateCategorySelector();
        window.updateCategorySuggestions();
        window.filterVocabByCategory();
        window.setMode(window.currentMode);  
        
    } catch (err) {
        window.showToast('Lỗi khi lưu từ: ' + err.message, 'error');
    }
}

async function handleUploadList() {
    const vocabListInput = document.getElementById('vocab-list-input');
    const listCategoryInput = document.getElementById('list-category-input');
    if (!vocabListInput) return;

    const vocabListValue = vocabListInput.value.trim();
    const category = window.normalizeCategory(listCategoryInput?.value || 'Khác');

    if (!vocabListValue) {
        window.showToast('Vui lòng nhập danh sách từ vựng!', 'error');
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
            errors.push(`Dòng ${index + 1}: Định dạng không hợp lệ`);
        }
    });

    if (validWords.length === 0) {
        window.showToast('Không có từ vựng hợp lệ để lưu!' + (errors.length ? '\nLỗi:\n' + errors.join('\n') : ''), 'error');
        return;
    }
    
    try {
        await Promise.all(validWords.map(word => window.saveWord(word)));
        
        if (vocabListInput) vocabListInput.value = '';  
        if (listCategoryInput) listCategoryInput.value = '';

        await Promise.all([window.loadVocabulary(), window.loadCategories()]);

        window.updateCategorySelector();
        window.updateCategorySuggestions();
        window.updateCategoryList();
        window.filterVocabByCategory();
        window.setMode(window.currentMode);
        window.showToast(`Đã thêm ${validWords.length} từ thành công!` + (errors.length ? '\nLỗi:\n' + errors.join('\n') : ''), 'success');
        await window.saveState();
    } catch (err) {
        window.showToast(`Lỗi khi lưu danh sách từ: ${err.message}`, 'error');
    }
}

function handleExportAll() {
    if (window.allVocab.length === 0) {
        window.showToast('Không có từ vựng để xuất!', 'error');
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

    window.showToast('Đã xuất danh sách từ!', 'success');
}

async function handleImportFile() {
    const importFile = document.getElementById('import-file');
    if (!importFile || !importFile.files.length) {
        window.showToast('Vui lòng chọn file để nhập!', 'error');
        return;
    }

    const file = importFile.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const lines = e.target.result.split('\n').filter(line => line.trim());
            const validWords = [];
            const formatErrors = [];

            // Xử lý từng dòng
            lines.forEach((line, index) => {
                const parts = line.split('`').map(part => part.trim());
                if (parts.length >= 3 && parts.slice(0, 3).every(p => p)) {
                    validWords.push({
                        korean: parts[0],
                        pronunciation: parts[1],
                        vietnamese: parts[2],
                        category: window.normalizeCategory(parts[3] || 'Khác'),
                        example: parts[4] || '',
                        note: parts[5] || ''
                    });
                } else {
                    formatErrors.push(index + 1);
                }
            });

            if (validWords.length === 0) {
                window.showToast('Không có từ vựng hợp lệ để nhập!' + (formatErrors.length ? `\nLỗi tại dòng: ${formatErrors.join(', ')}` : ''), 'error');
                return;
            }

            // Lưu tất cả từ song song
            await Promise.all(validWords.map(word => window.saveWord(word, { skipUIUpdates: true })));

            // Cập nhật giao diện một lần duy nhất
            await Promise.all([window.loadVocabulary(), window.loadCategories()]);
            window.updateCategorySelector();
            window.updateCategorySuggestions();
            window.updateCategoryList();
            window.filterVocabByCategory();
            window.setMode(window.currentMode);

            // Thông báo kết quả
            const successful = validWords.length;
            const message = formatErrors.length > 0
                ? `Nhập thành công ${successful} từ, lỗi định dạng tại dòng: ${formatErrors.join(', ')}`
                : `Nhập thành công ${successful} từ!`;
            window.showToast(message, successful > 0 ? 'success' : 'error');

            // Lưu trạng thái
            await window.saveState({ skipDebounce: true });

            // Xóa form nhập
            window.clearImportForm();
        } catch (err) {
            window.showToast('Lỗi khi nhập file: ' + err.message, 'error');
        }
    };

    reader.onerror = () => {
        window.showToast('Lỗi khi đọc file!', 'error');
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
    if (window.allVocab.length === 0) {
        window.showToast('Không có từ vựng để xóa!', 'error');
        return;
    }

    if (confirm('Bạn có chắc muốn xóa tất cả từ vựng?')) {
        window.deleteAllWords().then(() => {
            window.showToast('Đã xóa tất cả từ!', 'success');
        }).catch(err => {
            window.showToast('Lỗi khi xóa tất cả từ!', 'error');
        });
    }
}

function handleDeleteAllUnknown() {
    if (window.unknownWords.length === 0) {
        window.showToast('Không có từ chưa biết để xóa!', 'error');
        return;
    }

    if (confirm('Bạn có chắc muốn xóa tất cả từ chưa biết?')) {
        window.deleteAllUnknownWords().then(() => {
            window.unknownWords = [];
            window.updateUnknownList();
             window.showToast('Đã xóa tất cả từ chưa biết!', 'success');
        }).catch(err => {
            window.showToast('Lỗi khi xóa tất cả từ!', 'error');
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
    const flashcardElement = document.getElementById('flashcard');
    if (flashcardElement) {
        flashcardElement.addEventListener('click', () => {
            if (window.currentMode === 'flashcard') {
                flashcardElement.classList.toggle('flipped');
            }
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

    // Category modal management
    const openCategoryModalBtn = document.getElementById('open-category-modal-btn');
    if (openCategoryModalBtn) openCategoryModalBtn.addEventListener('click', openCategoryModal);
    const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');
    if (closeCategoryModalBtn) closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
    const saveCategoryBtn = document.getElementById('save-category-btn');
    if (saveCategoryBtn) saveCategoryBtn.addEventListener('click', handleSaveCategory);

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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('korean-input')?.addEventListener('input', (e) => {
        window.modalState.wordModal.inputs.korean = e.target.value;
        window.saveState();  
    });
    document.getElementById('pronunciation-input')?.addEventListener('input', (e) => {
        window.modalState.wordModal.inputs.pronunciation = e.target.value;
        window.saveState();
    });
    document.getElementById('vietnamese-input')?.addEventListener('input', (e) => {
        window.modalState.wordModal.inputs.vietnamese = e.target.value;
        window.saveState();
    });
    document.getElementById('example-input')?.addEventListener('input', (e) => {
        window.modalState.wordModal.inputs.example = e.target.value;
        window.saveState();
    });
    document.getElementById('note-input')?.addEventListener('input', (e) => {
        window.modalState.wordModal.inputs.note = e.target.value;
        window.saveState();
    });
    document.getElementById('category-input')?.addEventListener('input', (e) => {
        window.modalState.wordModal.inputs.category = e.target.value;
        window.saveState();
    });

    // Lookup options
    document.getElementById('lookup-pronunciation')?.addEventListener('change', (e) => {
        window.modalState.wordModal.lookupOptions.pronunciation = e.target.checked;
        window.saveState();
    });
    document.getElementById('lookup-vietnamese')?.addEventListener('change', (e) => {
        window.modalState.wordModal.lookupOptions.vietnamese = e.target.checked;
        window.saveState();
    });
    document.getElementById('lookup-example')?.addEventListener('change', (e) => {
        window.modalState.wordModal.lookupOptions.example = e.target.checked;
        window.saveState();
    });

    // API Key Modal
    document.getElementById('api-key-input')?.addEventListener('input', (e) => {
        window.modalState.apiKeyModal.input = e.target.value;
        window.saveState();
    });

    // Category Modal
    document.getElementById('category-name-input')?.addEventListener('input', (e) => {
        window.modalState.categoryModal.input = e.target.value;
        window.saveState();
    });
});

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
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.handleSaveCategory = handleSaveCategory;
window.editCategory = editCategory;