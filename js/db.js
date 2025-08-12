let db;
let saveStateTimeout = null;

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VocabDB', 7);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            let vocabStore;
            if (!db.objectStoreNames.contains('vocabulary')) {
                vocabStore = db.createObjectStore('vocabulary', { keyPath: 'id', autoIncrement: true });
            } else {
                vocabStore = event.target.transaction.objectStore('vocabulary');
            }

            // Tạo chỉ mục trên 'categoryId' nếu chưa có
            if (!vocabStore.indexNames.contains('categoryId')) {
                vocabStore.createIndex('categoryId', 'categoryId', { unique: false });
            }

            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
            if (!db.objectStoreNames.contains('unknownWords')) {
                db.createObjectStore('unknownWords', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('apiKeys')) {
                db.createObjectStore('apiKeys');
            }
            if (!db.objectStoreNames.contains('categories')) {
                db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        request.onerror = (event) => {
            console.error("Database error: ", event.target.error);
            reject(event.target.error);
        };
    });
}

async function saveCategory(category) {
    try {
        const normalizedCategory = window.normalizeCategory(category.name);
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const categoryData = { name: normalizedCategory };

        if (category.id) {
            categoryData.id = category.id;
        }

        await promisifyRequest(store.put(categoryData));

        await loadCategories();
        window.updateCategorySelector();
        window.updateCategorySuggestions();
    } catch (error) {
        console.error('Error saving category:', error);
        window.showToast('Lỗi khi lưu danh mục!', 'error');
        throw error;
    }
}

async function deleteCategory(id) {
    try {
        const transaction = db.transaction(['categories', 'vocabulary'], 'readwrite');
        const categoryStore = transaction.objectStore('categories');
        const vocabStore = transaction.objectStore('vocabulary');
        const vocabIndex = vocabStore.index('categoryId');

        await promisifyRequest(categoryStore.delete(id));

        const cursorRequest = vocabIndex.openCursor(IDBKeyRange.only(id));
        await new Promise((resolve, reject) => {
            cursorRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const word = cursor.value;
                    word.categoryId = null;
                    cursor.update(word); // Không cần await vì nó diễn ra trong cùng transaction
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            cursorRequest.onerror = () => reject(cursorRequest.error);
        });

        await Promise.all([loadCategories(), loadVocabulary()]);

        window.updateCategorySelector();
        window.updateCategorySuggestions();
        window.updateCategoryList();
        window.filterVocabByCategory();
        if (window.currentMode === 'manage') {
            window.updateVocabList();
        }
        await saveState();
        window.showToast('Xóa danh mục thành công!', 'success');
    } catch (error) {
        console.error('Error deleting category:', error);
        window.showToast('Lỗi khi xóa danh mục!', 'error');
        throw error;
    }
}


// Load categories
async function loadCategories() {
    const transaction = db.transaction(['categories'], 'readonly');
    const store = transaction.objectStore('categories');
    window.allCategories = await promisifyRequest(store.getAll()) || [];
}

// Save state to IndexedDB with debounce
function saveState(options = {}) {
    return new Promise((resolve, reject) => {
        if (saveStateTimeout && !options.skipDebounce) {
            clearTimeout(saveStateTimeout);
        }

        const save = () => {
            const state = {
                study: {
                    currentIndex: window.modeStates.study.currentIndex,
                    shuffledVocabIds: window.modeStates.study.shuffledVocab.map(word => word.id)
                },
                quiz: {
                    currentIndex: window.modeStates.quiz.currentIndex,
                    shuffledVocabIds: window.modeStates.quiz.shuffledVocab.map(word => word.id),
                    quizDisplayMode: window.modeStates.quiz.quizDisplayMode
                },
                flashcard: {
                    currentIndex: window.modeStates.flashcard.currentIndex,
                    shuffledVocabIds: window.modeStates.flashcard.shuffledVocab.map(word => word.id),
                    flashcardDisplayMode: window.modeStates.flashcard.flashcardDisplayMode
                },
                game: {
                    currentTab: window.modeStates.game.currentTab,
                    matching: {
                        selectedKorean: window.modeStates.game.matching.selectedKorean,
                        selectedVietnamese: window.modeStates.game.matching.selectedVietnamese,
                        matchedPairs: window.modeStates.game.matching.matchedPairs,
                        shuffledVocabIds: window.modeStates.game.matching.shuffledVocab.map(word => word.id)
                    },
                    fill: {
                        currentSentence: window.modeStates.game.fill.currentSentence,
                        correctWordId: window.modeStates.game.fill.correctWord ? window.modeStates.game.fill.correctWord.id : null,
                        optionIds: window.modeStates.game.fill.options.map(word => word.id)
                    }
                },
                selectedCategory: window.selectedCategory,
                currentMode: window.currentMode,
                modalState: window.modalState
            };
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put(state, 'studyStates');

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error saving state:', request.error);
                reject(request.error);
            };
        };

        if (options.skipDebounce) {
            save();
        } else {
            saveStateTimeout = setTimeout(save, 100);
        }
    });
}

// Load state from IndexedDB
function loadState() {
    return new Promise((resolve) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('studyStates');

        request.onsuccess = async () => {
            const savedState = request.result;
            if (savedState) {
                // Khôi phục trạng thái cho các mode
                window.modeStates.study.currentIndex = savedState.study.currentIndex;
                window.modeStates.study.shuffledVocab = savedState.study.shuffledVocabIds.map(id => window.allVocab.find(word => word.id === id)).filter(word => word);
                window.modeStates.quiz.currentIndex = savedState.quiz.currentIndex;
                window.modeStates.quiz.shuffledVocab = savedState.quiz.shuffledVocabIds.map(id => window.allVocab.find(word => word.id === id)).filter(word => word);
                window.modeStates.quiz.quizDisplayMode = savedState.quiz.quizDisplayMode;
                window.modeStates.flashcard.currentIndex = savedState.flashcard.currentIndex;
                window.modeStates.flashcard.shuffledVocab = savedState.flashcard.shuffledVocabIds.map(id => window.allVocab.find(word => word.id === id)).filter(word => word);
                window.modeStates.flashcard.flashcardDisplayMode = savedState.flashcard.flashcardDisplayMode;
                window.currentMode = savedState.currentMode;
                window.selectedCategory = savedState.selectedCategory;

                // Khôi phục trạng thái cho game mode
                if (savedState.game) {
                    window.modeStates.game.currentTab = savedState.game.currentTab;
                    window.modeStates.game.matching.selectedKorean = savedState.game.matching.selectedKorean;
                    window.modeStates.game.matching.selectedVietnamese = savedState.game.matching.selectedVietnamese;
                    window.modeStates.game.matching.matchedPairs = savedState.game.matching.matchedPairs;
                    window.modeStates.game.matching.shuffledVocab = savedState.game.matching.shuffledVocabIds.map(id => window.allVocab.find(word => word.id === id)).filter(word => word);
                    window.modeStates.game.fill.currentSentence = savedState.game.fill.currentSentence;
                    window.modeStates.game.fill.correctWord = window.allVocab.find(word => word.id === savedState.game.fill.correctWordId) || null;
                    window.modeStates.game.fill.options = savedState.game.fill.optionIds.map(id => window.allVocab.find(word => word.id === id)).filter(word => word);
                }

                // Khôi phục trạng thái modal
                if (savedState.modalState) {
                    window.modalState = savedState.modalState;

                    // Khôi phục modal Thêm/Sửa Từ Vựng
                    if (savedState.modalState.wordModal?.isOpen) {
                        const modal = document.getElementById('word-modal');
                        if (modal) {
                            modal.classList.remove('hidden');
                            document.getElementById('korean-input').value = savedState.modalState.wordModal.inputs.korean;
                            document.getElementById('pronunciation-input').value = savedState.modalState.wordModal.inputs.pronunciation;
                            document.getElementById('vietnamese-input').value = savedState.modalState.wordModal.inputs.vietnamese;
                            document.getElementById('example-input').value = savedState.modalState.wordModal.inputs.example;
                            document.getElementById('note-input').value = savedState.modalState.wordModal.inputs.note || '';
                            document.getElementById('category-input').value = savedState.modalState.wordModal.inputs.category;
                            document.getElementById('lookup-pronunciation').checked = savedState.modalState.wordModal.lookupOptions.pronunciation;
                            document.getElementById('lookup-vietnamese').checked = savedState.modalState.wordModal.lookupOptions.vietnamese;
                            document.getElementById('lookup-example').checked = savedState.modalState.wordModal.lookupOptions.example;
                            document.getElementById('save-word-btn').textContent = savedState.modalState.wordModal.saveButtonText;
                        }
                    }

                    // Khôi phục modal API Key
                    if (savedState.modalState?.apiKeyModal?.isOpen) {
                        const apiKeyModal = document.getElementById('api-key-modal');
                        if (apiKeyModal) {
                            apiKeyModal.classList.remove('hidden');
                            document.getElementById('api-key-input').value = savedState.modalState.apiKeyModal.input;
                        }
                    }

                    // Khôi phục modal Category
                    if (savedState.modalState?.categoryModal?.isOpen) {
                        const categoryModal = document.getElementById('category-modal');
                        if (categoryModal) {
                            categoryModal.classList.remove('hidden');
                            document.getElementById('category-name-input').value = savedState.modalState.categoryModal.input;
                            window.editingCategoryId = savedState.modalState.categoryModal.editingCategoryId || null;
                            document.getElementById('save-category-btn').textContent = window.editingCategoryId !== null ? 'Cập Nhật' : 'Thêm Danh Mục';
                        }
                    }
                }

                // Cập nhật giao diện
                window.setMode(window.currentMode);
                window.filterVocabByCategory();
                window.updateStats();
                window.updateCategorySelector();

                // Cập nhật trạng thái cho tab game
                if (window.currentMode === 'game') {
                    if (window.modeStates.game.currentTab === 'matching') {
                        window.displayMatchingGame();
                    } else if (window.modeStates.game.currentTab === 'fill') {
                        window.displayFillGame();
                    }
                }
            }
            resolve();
        };

        request.onerror = (event) => {
            console.error('Error loading state:', event.target.error);
            resolve();
        };
    });
}

// Load vocabulary from IndexedDB
async function loadVocabulary() {
    try {
        const transaction = db.transaction(['vocabulary', 'categories'], 'readonly');
        const vocabStore = transaction.objectStore('vocabulary');
        const categoryStore = transaction.objectStore('categories');

        const [categories, vocabulary] = await Promise.all([
            promisifyRequest(categoryStore.getAll()),
            promisifyRequest(vocabStore.getAll())
        ]);

        const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

        window.allVocab = vocabulary.map(word => ({
            ...word,
            example: word.example || '',
            category: categoryMap.get(word.categoryId) || 'Khác'
        }));
    } catch (error) {
        window.showToast('Lỗi khi tải danh sách từ vựng!', 'error');
        throw error;
    }
}

// Save a word to IndexedDB
async function saveWord(word, options = {}) {
    try {
        const transaction = db.transaction(['vocabulary', 'categories'], 'readwrite');
        const vocabStore = transaction.objectStore('vocabulary');
        const categoryStore = transaction.objectStore('categories');

        const normalizedCategory = window.normalizeCategory(word.category);
        const categories = await promisifyRequest(categoryStore.getAll());
        let category = categories.find(cat => cat.name === normalizedCategory);

        let categoryId;
        if (category) {
            categoryId = category.id;
        } else {
            categoryId = await promisifyRequest(categoryStore.add({ name: normalizedCategory }));
        }

        const vocabData = { ...word, categoryId };
        delete vocabData.category;

        if (vocabData.id) {
            await promisifyRequest(vocabStore.put(vocabData));
        } else {
            await promisifyRequest(vocabStore.add(vocabData));
        }

        // Chỉ cập nhật giao diện nếu không có tùy chọn skipUIUpdates
        if (!options.skipUIUpdates) {
            await Promise.all([loadVocabulary(), loadCategories()]);
            window.updateCategorySelector();
            window.updateCategorySuggestions();
            window.updateCategoryList();
            window.filterVocabByCategory();
            if (window.currentMode === 'manage') {
                window.updateVocabList();
            }
            await saveState();
        }
    } catch (error) {
        console.error('Error saving word:', error);
        window.showToast('Lỗi khi lưu từ vựng!', 'error');
        throw error;
    }
}

// Delete a word from IndexedDB
async function deleteWord(id) {
    try {
        const transaction = db.transaction(['vocabulary'], 'readwrite');
        const store = transaction.objectStore('vocabulary');
        await promisifyRequest(store.delete(id));

        await loadVocabulary();
        window.updateCategorySelector();
        window.updateCategorySuggestions();
        window.filterVocabByCategory();
        if (window.currentMode === 'manage') {
            window.updateVocabList();
        }
        await saveState();
    } catch (error) {
        console.error('Error deleting word:', error);
        window.showToast('Lỗi khi xóa từ!', 'error');
        throw error;
    }
}

// Delete all words from IndexedDB
async function deleteAllWords() {
    try {
        const transaction = db.transaction(['vocabulary', 'categories'], 'readwrite');
        const vocabStore = transaction.objectStore('vocabulary');
        const categoryStore = transaction.objectStore('categories');

        await Promise.all([
            promisifyRequest(vocabStore.clear()),
            promisifyRequest(categoryStore.clear())
        ]);

        // Reset state
        window.allVocab = [];
        window.allCategories = [];
        Object.keys(window.modeStates).forEach(mode => {
            window.modeStates[mode].shuffledVocab = [];
            window.modeStates[mode].currentIndex = 0;
        });

        // Update UI
        window.updateCategorySelector();
        window.updateCategorySuggestions();
        window.updateVocabList();
        window.updateStats();
        window.setMode(window.currentMode);
        await saveState();
    } catch (error) {
        console.error('Error deleting all words:', error);
        window.showToast('Lỗi khi xóa toàn bộ từ vựng!', 'error');
        throw error;
    }
}

// Load unknown words from IndexedDB
async function loadUnknownWords() {
    const transaction = db.transaction(['unknownWords'], 'readonly');
    const store = transaction.objectStore('unknownWords');
    window.unknownWords = await promisifyRequest(store.getAll());
    window.updateUnknownList();
}

async function saveUnknownWord(word) {
    const transaction = db.transaction(['unknownWords'], 'readwrite');
    const store = transaction.objectStore('unknownWords');
    await promisifyRequest(store.put(word));
}

async function deleteUnknownWord(id) {
    const transaction = db.transaction(['unknownWords'], 'readwrite');
    const store = transaction.objectStore('unknownWords');
    await promisifyRequest(store.delete(id));
}

async function deleteAllUnknownWords() {
    const transaction = db.transaction(['unknownWords'], 'readwrite');
    const store = transaction.objectStore('unknownWords');
    await promisifyRequest(store.clear());
}

// Save API key to IndexedDB
async function saveApiKey(key) {
    if (!key) {
        throw new Error('API Key không hợp lệ!');
    }

    const transaction = db.transaction(['apiKeys'], 'readwrite');
    const store = transaction.objectStore('apiKeys');
    let keys = await promisifyRequest(store.get('geminiApiKeys')) || [];
    if (!Array.isArray(keys)) keys = [];

    if (keys.some(k => k.key === key)) {
        throw new Error('API Key đã tồn tại!');
    }

    keys.push({ key, requestCount: 0, lastRateLimit: 0, dateAdded: Date.now() });
    window.apiKeys = keys;

    await promisifyRequest(store.put(keys, 'geminiApiKeys'));
    if (window.apiKeys.length === 1) window.currentApiKeyIndex = 0;
}

async function loadApiKey() {
    const transaction = db.transaction(['apiKeys'], 'readonly');
    const store = transaction.objectStore('apiKeys');
    window.apiKeys = await promisifyRequest(store.get('geminiApiKeys')) || [];
    if (!Array.isArray(window.apiKeys)) window.apiKeys = [];
    window.currentApiKeyIndex = window.apiKeys.length > 0 ? 0 : -1;
}

async function deleteApiKey(index) {
    window.apiKeys.splice(index, 1);
    if (window.currentApiKeyIndex >= window.apiKeys.length) {
        window.currentApiKeyIndex = window.apiKeys.length > 0 ? 0 : -1;
    }
    const transaction = db.transaction(['apiKeys'], 'readwrite');
    const store = transaction.objectStore('apiKeys');
    await promisifyRequest(store.put(window.apiKeys, 'geminiApiKeys'));
    window.updateApiKeyList();
}

async function saveApiKeysToDB() {
    const transaction = db.transaction(['apiKeys'], 'readwrite');
    const store = transaction.objectStore('apiKeys');
    await promisifyRequest(store.put(window.apiKeys, 'geminiApiKeys'));
}

// Export functions to global scope
window.initDB = initDB;
window.saveState = saveState;
window.loadState = loadState;
window.loadVocabulary = loadVocabulary;
window.saveWord = saveWord;
window.deleteWord = deleteWord;
window.deleteAllWords = deleteAllWords;
window.loadUnknownWords = loadUnknownWords;
window.saveUnknownWord = saveUnknownWord;
window.deleteUnknownWord = deleteUnknownWord;
window.deleteAllUnknownWords = deleteAllUnknownWords;
window.saveApiKey = saveApiKey;
window.loadApiKey = loadApiKey;
window.deleteApiKey = deleteApiKey;
window.saveApiKeysToDB = saveApiKeysToDB;
window.deleteCategory = deleteCategory;
window.saveCategory = saveCategory;
window.loadCategories = loadCategories;