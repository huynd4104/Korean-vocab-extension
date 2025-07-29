let db;
let saveStateTimeout = null;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VocabDB', 6);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('vocabulary')) {
                db.createObjectStore('vocabulary', { keyPath: 'id', autoIncrement: true });
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
            reject(event.target.error);
        };
    });
}

// Save category
function saveCategory(category) {
    return new Promise((resolve, reject) => {
        const normalizedCategory = window.normalizeCategory(category.name);
        const transaction = db.transaction(['categories'], 'readwrite');
        const store = transaction.objectStore('categories');
        const categoryData = { name: normalizedCategory };

        if (category.id) {
            categoryData.id = category.id;
        }

        const request = store.put(categoryData);

        request.onsuccess = () => {
            loadCategories().then(() => {
                window.updateCategorySelector();
                window.updateCategorySuggestions();
                resolve();
            });
        };

        request.onerror = () => reject(request.error);
    });
}

// Load categories
function loadCategories() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        const request = store.getAll();

        request.onsuccess = () => {
            window.allCategories = request.result || [];
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Delete a category
function deleteCategory(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['categories', 'vocabulary'], 'readwrite');
        const categoryStore = transaction.objectStore('categories');
        const vocabStore = transaction.objectStore('vocabulary');

        const categoryRequest = categoryStore.delete(id);

        categoryRequest.onsuccess = () => {
            const vocabRequest = vocabStore.getAll();
            vocabRequest.onsuccess = () => {
                const updatePromises = vocabRequest.result
                    .filter(word => word.categoryId === id)
                    .map(word => {
                        word.categoryId = null;
                        return new Promise(res => {
                            const updateRequest = vocabStore.put(word);
                            updateRequest.onsuccess = res;
                            updateRequest.onerror = () => reject(updateRequest.error);
                        });
                    });

                Promise.all(updatePromises)
                    .then(() => Promise.all([loadCategories(), loadVocabulary()]))
                    .then(() => {
                        window.updateCategorySelector();
                        window.updateCategorySuggestions();
                        window.updateCategoryList();
                        window.filterVocabByCategory();
                        if (window.currentMode === 'manage') {
                            window.updateVocabList();
                        }
                        window.saveState();

                        const categoryMessage = document.getElementById('category-message');
                        if (categoryMessage) {
                            categoryMessage.textContent = 'Xóa danh mục thành công!';
                            categoryMessage.style.color = '#4ecdc4';
                            setTimeout(() => categoryMessage.textContent = '', 2000);
                        }
                        resolve();
                    })
                    .catch(reject);
            };
            vocabRequest.onerror = () => reject(vocabRequest.error);
        };
        categoryRequest.onerror = () => reject(categoryRequest.error);
    });
}

// Save state to IndexedDB with debounce
function saveState() {
    return new Promise((resolve, reject) => {
        if (saveStateTimeout) {
            clearTimeout(saveStateTimeout);
        }

        saveStateTimeout = setTimeout(() => {
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
                        shuffledVocabIds: window.modeStates.game.matching.shuffledVocab.slice(0, Math.min(4, window.modeStates.game.matching.shuffledVocab.length)).map(word => word.id)
                    },
                    fill: {
                        currentSentence: window.modeStates.game.fill.currentSentence,
                        correctWord: window.modeStates.game.fill.correctWord ? {
                            id: window.modeStates.game.fill.correctWord.id,
                            korean: window.modeStates.game.fill.correctWord.korean,
                            pronunciation: window.modeStates.game.fill.correctWord.pronunciation,
                            vietnamese: window.modeStates.game.fill.correctWord.vietnamese,
                            category: window.modeStates.game.fill.correctWord.category,
                            example: window.modeStates.game.fill.correctWord.example || ''
                        } : null,
                        options: window.modeStates.game.fill.options.map(word => ({
                            id: word.id,
                            korean: word.korean,
                            pronunciation: word.pronunciation,
                            vietnamese: word.vietnamese,
                            category: word.category,
                            example: word.example || ''
                        }))
                    }
                },
                selectedCategory: window.selectedCategory,
                currentMode: window.currentMode,
                modalState: {
                    isModalOpen: window.modalState.isModalOpen,
                    modalInputs: {
                        korean: document.getElementById('korean-input')?.value || '',
                        pronunciation: document.getElementById('pronunciation-input')?.value || '',
                        vietnamese: document.getElementById('vietnamese-input')?.value || '',
                        example: document.getElementById('example-input')?.value || '',
                        note: document.getElementById('note-input')?.value || '',
                        category: document.getElementById('category-input')?.value || ''
                    },
                    lookupOptions: {
                        pronunciation: document.getElementById('lookup-pronunciation')?.checked || true,
                        vietnamese: document.getElementById('lookup-vietnamese')?.checked || true,
                        example: document.getElementById('lookup-example')?.checked || true
                    },
                    editingWordId: window.editingWordId,
                    saveButtonText: document.getElementById('save-word-btn')?.textContent || 'Lưu'
                }
            };
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put(state, 'studyStates');

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('Error saving state:', request.error);
                reject(request.error);
            };
        }, 100);
    });
}

// Load state from IndexedDB
function loadState() {
    return new Promise((resolve) => {
        const transaction = db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get('studyStates');

        request.onsuccess = () => {
            const savedStates = request.result || {};
            window.modalState = {
                isModalOpen: savedStates.modalState?.isModalOpen || false,
                modalInputs: savedStates.modalState?.modalInputs || { korean: '', pronunciation: '', vietnamese: '', example: '', category: '', note: '' },
                lookupOptions: savedStates.modalState?.lookupOptions || { pronunciation: true, vietnamese: true, example: true },
                editingWordId: savedStates.modalState?.editingWordId || null,
                saveButtonText: savedStates.modalState?.saveButtonText || 'Lưu'
            };
            window.modeStates = {
                study: {
                    currentIndex: savedStates.study?.currentIndex || 0,
                    shuffledVocab: []
                },
                quiz: {
                    currentIndex: savedStates.quiz?.currentIndex || 0,
                    shuffledVocab: [],
                    quizDisplayMode: savedStates.quiz?.quizDisplayMode || 'word'
                },
                flashcard: {
                    currentIndex: savedStates.flashcard?.currentIndex || 0,
                    shuffledVocab: [],
                    flashcardDisplayMode: savedStates.flashcard?.flashcardDisplayMode || 'word'
                },
                game: {
                    currentTab: savedStates.game?.currentTab || 'matching',
                    matching: {
                        selectedKorean: savedStates.game?.matching?.selectedKorean || null,
                        selectedVietnamese: savedStates.game?.matching?.selectedVietnamese || null,
                        matchedPairs: savedStates.game?.matching?.matchedPairs.map(pair => {
                            const word = window.allVocab.find(w => w.korean === pair.korean && w.vietnamese === pair.vietnamese);
                            return word ? word.id : null;
                        }).filter(id => id) || [],
                        shuffledVocab: []
                    },
                    fill: {
                        currentSentence: savedStates.game?.fill?.currentSentence || '',
                        correctWord: savedStates.game?.fill?.correctWord ? {
                            id: savedStates.game?.fill?.correctWord.id,
                            korean: savedStates.game?.fill?.correctWord.korean,
                            pronunciation: savedStates.game?.fill?.correctWord.pronunciation,
                            vietnamese: savedStates.game?.fill?.correctWord.vietnamese || '',
                            category: savedStates.game?.fill?.correctWord.category,
                            example: savedStates.game?.fill?.correctWord.example || ''
                        } : null,
                        options: savedStates.game?.fill?.options.map(opt => ({
                            id: opt.id,
                            korean: opt.korean,
                            pronunciation: opt.pronunciation,
                            vietnamese: opt.vietnamese || '',
                            category: opt.category,
                            example: opt.example || ''
                        })) || []
                    }
                }
            };
            window.selectedCategory = savedStates.selectedCategory || 'all';
            window.currentMode = ['study', 'quiz', 'flashcard', 'game', 'unknown', 'manage'].includes(savedStates.currentMode) ? savedStates.currentMode : 'study';
            window.editingWordId = window.modalState.editingWordId;

            // Restore shuffledVocab from saved IDs
            ['study', 'quiz', 'flashcard', 'game'].forEach(mode => {
                const savedIds = mode === 'game' ? savedStates[mode]?.matching?.shuffledVocabIds || [] : savedStates[mode]?.shuffledVocabIds || [];
                let filteredVocab = window.selectedCategory === 'all' ? [...window.allVocab] : window.allVocab.filter(word => window.normalizeCategory(word.category) === window.selectedCategory);
                let shuffledVocab = savedIds
                    .map(id => window.allVocab.find(word => word.id === id))
                    .filter(word => word && filteredVocab.some(fw => fw.id === word.id));

                if (mode === 'game') {
                    shuffledVocab = shuffledVocab.slice(0, Math.min(4, filteredVocab.length));
                    window.modeStates.game.matching.matchedPairs = window.modeStates.game.matching.matchedPairs.filter(id =>
                        shuffledVocab.some(word => word.id === id)
                    );
                }

                window.modeStates[mode].shuffledVocab = shuffledVocab;
                window.modeStates[mode].currentIndex = Math.min(
                    window.modeStates[mode].currentIndex,
                    window.modeStates[mode].shuffledVocab.length > 0 ? window.modeStates[mode].shuffledVocab.length - 1 : 0
                );
                if (mode === 'game') {
                    window.modeStates.game.matching.shuffledVocab = window.modeStates[mode].shuffledVocab;
                }
            });

            // Restore modal state
            if (window.modalState.isModalOpen) {
                const modal = document.getElementById('word-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    document.getElementById('korean-input').value = window.modalState.modalInputs.korean;
                    document.getElementById('pronunciation-input').value = window.modalState.modalInputs.pronunciation;
                    document.getElementById('vietnamese-input').value = window.modalState.modalInputs.vietnamese;
                    document.getElementById('example-input').value = window.modalState.modalInputs.example;
                    document.getElementById('note-input').value = window.modalState.modalInputs.note || '';
                    document.getElementById('category-input').value = window.modalState.modalInputs.category;
                    document.getElementById('lookup-pronunciation').checked = window.modalState.lookupOptions.pronunciation;
                    document.getElementById('lookup-vietnamese').checked = window.modalState.lookupOptions.vietnamese;
                    document.getElementById('lookup-example').checked = window.modalState.lookupOptions.example;
                    document.getElementById('save-word-btn').textContent = window.modalState.saveButtonText;
                    document.getElementById('form-message').textContent = '';
                }
            }

            document.getElementById('category-select').value = window.selectedCategory;
            document.getElementById('flashcard-display-mode').value = window.modeStates.flashcard.flashcardDisplayMode;
            document.getElementById('quiz-display-mode').value = window.modeStates.quiz.quizDisplayMode;
            resolve();
        };

        request.onerror = () => {
            console.error('Error loading state:', request.error);
            resolve();
        };
    });
}

// Load vocabulary from IndexedDB
function loadVocabulary() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['vocabulary', 'categories'], 'readonly');
        const vocabStore = transaction.objectStore('vocabulary');
        const categoryStore = transaction.objectStore('categories');

        const categoryRequest = categoryStore.getAll();
        categoryRequest.onsuccess = () => {
            const categories = categoryRequest.result;
            const vocabRequest = vocabStore.getAll();

            vocabRequest.onsuccess = () => {
                window.allVocab = vocabRequest.result.map(word => ({
                    ...word,
                    example: word.example || '',
                    category: categories.find(cat => cat.id === word.categoryId)?.name || 'Khác'
                }));
                resolve();
            };

            vocabRequest.onerror = () => {
                document.getElementById('form-message').textContent = 'Lỗi khi tải danh sách từ vựng!';
                reject(vocabRequest.error);
            };
        };

        categoryRequest.onerror = () => reject(categoryRequest.error);
    });
}

// Save a word to IndexedDB
function saveWord(word) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['vocabulary', 'categories'], 'readwrite');
        const vocabStore = transaction.objectStore('vocabulary');
        const categoryStore = transaction.objectStore('categories');

        // Find or create category
        const normalizedCategory = window.normalizeCategory(word.category);
        const categoryRequest = categoryStore.getAll();

        categoryRequest.onsuccess = () => {
            const categories = categoryRequest.result;
            let category = categories.find(cat => cat.name === normalizedCategory);

            if (!category) {
                category = { name: normalizedCategory };
                const addCategoryRequest = categoryStore.add(category);
                addCategoryRequest.onsuccess = () => {
                    category.id = addCategoryRequest.result;
                    saveVocab();
                };
                addCategoryRequest.onerror = () => reject(addCategoryRequest.error);
            } else {
                saveVocab();
            }

            function saveVocab() {
                const vocabData = { ...word, categoryId: category.id };
                delete vocabData.category; // Remove string category field
                let request;
                if (vocabData.id) {
                    request = vocabStore.put(vocabData);
                } else {
                    request = vocabStore.add(vocabData);
                }

                request.onsuccess = () => {
                    loadVocabulary().then(() => {
                        window.updateCategorySelector();
                        window.updateCategorySuggestions();
                        window.filterVocabByCategory();
                        if (window.currentMode === 'manage') {
                            window.updateVocabList();
                        }
                        saveState();
                        resolve();
                    });
                };

                request.onerror = () => reject(request.error);
            }
        };

        categoryRequest.onerror = () => reject(categoryRequest.error);
    });
}

// Delete a word from IndexedDB
function deleteWord(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['vocabulary'], 'readwrite');
        const store = transaction.objectStore('vocabulary');
        const request = store.delete(id);

        request.onsuccess = () => {
            loadVocabulary().then(() => {
                window.updateCategorySelector();
                window.updateCategorySuggestions();
                window.filterVocabByCategory();
                if (window.currentMode === 'manage') {
                    window.updateVocabList();
                }
                saveState();
                resolve();
            });
        };

        request.onerror = () => reject(request.error);
    });
}

// Delete all words from IndexedDB
function deleteAllWords() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['vocabulary', 'categories'], 'readwrite');
        const vocabStore = transaction.objectStore('vocabulary');
        const categoryStore = transaction.objectStore('categories');

        const vocabRequest = vocabStore.clear();
        const categoryRequest = categoryStore.clear();

        Promise.all([
            new Promise((res, rej) => {
                vocabRequest.onsuccess = () => res();
                vocabRequest.onerror = () => rej(vocabRequest.error);
            }),
            new Promise((res, rej) => {
                categoryRequest.onsuccess = () => res();
                categoryRequest.onerror = () => rej(categoryRequest.error);
            })
        ]).then(() => {
            window.allVocab = [];
            window.allCategories = [];
            Object.keys(window.modeStates).forEach(mode => {
                window.modeStates[mode].shuffledVocab = [];
                window.modeStates[mode].currentIndex = 0;
            });
            window.updateCategorySelector();
            window.updateCategorySuggestions();
            window.updateVocabList();
            window.updateStats();
            window.setMode(window.currentMode);
            saveState();
            resolve();
        }).catch(err => reject(err));
    });
}

// Load unknown words from IndexedDB
function loadUnknownWords() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['unknownWords'], 'readonly');
        const store = transaction.objectStore('unknownWords');
        const request = store.getAll();

        request.onsuccess = () => {
            window.unknownWords = request.result;
            window.updateUnknownList();
            resolve();
        };

        request.onerror = () => reject(request.error);
    });
}

// Save unknown word to IndexedDB
function saveUnknownWord(word) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['unknownWords'], 'readwrite');
        const store = transaction.objectStore('unknownWords');
        const request = store.put(word);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Delete unknown word from IndexedDB
function deleteUnknownWord(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['unknownWords'], 'readwrite');
        const store = transaction.objectStore('unknownWords');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Delete all unknown words from IndexedDB
function deleteAllUnknownWords() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['unknownWords'], 'readwrite');
        const store = transaction.objectStore('unknownWords');
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Save API key to IndexedDB
function saveApiKey(key) {
    return new Promise((resolve, reject) => {
        if (!key || window.apiKeys.some(k => k.key === key)) {
            reject(new Error('API Key đã tồn tại hoặc không hợp lệ!'));
            return;
        }

        const newKey = {
            key: key,
            requestCount: 0,
            lastRateLimit: 0,
            dateAdded: Date.now()
        };

        const transaction = db.transaction(['apiKeys'], 'readwrite');
        const store = transaction.objectStore('apiKeys');
        const request = store.get('geminiApiKeys').onsuccess = (event) => {
            let keys = event.target.result || [];
            if (!Array.isArray(keys)) keys = [];
            keys.push(newKey);
            window.apiKeys = keys;
            const putRequest = store.put(keys, 'geminiApiKeys');

            putRequest.onsuccess = () => {
                if (window.apiKeys.length === 1) window.currentApiKeyIndex = 0;
                resolve();
            };
            putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// Load API keys from IndexedDB
function loadApiKey() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['apiKeys'], 'readonly');
        const store = transaction.objectStore('apiKeys');
        const request = store.get('geminiApiKeys');

        request.onsuccess = () => {
            window.apiKeys = request.result || [];
            if (!Array.isArray(window.apiKeys)) window.apiKeys = [];
            window.currentApiKeyIndex = window.apiKeys.length > 0 ? 0 : -1;
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete API key from IndexedDB
function deleteApiKey(index) {
    return new Promise((resolve, reject) => {
        window.apiKeys.splice(index, 1);
        if (window.currentApiKeyIndex >= window.apiKeys.length) {
            window.currentApiKeyIndex = window.apiKeys.length > 0 ? 0 : -1;
        }
        const transaction = db.transaction(['apiKeys'], 'readwrite');
        const store = transaction.objectStore('apiKeys');
        const request = store.put(window.apiKeys, 'geminiApiKeys');

        request.onsuccess = () => {
            window.updateApiKeyList();
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

function saveApiKeysToDB() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['apiKeys'], 'readwrite');
        const store = transaction.objectStore('apiKeys');
        const request = store.put(window.apiKeys, 'geminiApiKeys');

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
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