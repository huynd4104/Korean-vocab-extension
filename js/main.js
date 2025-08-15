window.db = null;
window.currentMode = 'study';
window.allVocab = [];
window.attentionWords = [];
window.selectedCategory = 'all';
window.searchQuery = '';
window.apiKeys = [];
window.allCategories = [];
window.currentApiKeyIndex = 0;
window.modalState = {
    wordModal: {
        isOpen: false,
        inputs: {
            korean: '',
            pronunciation: '',
            vietnamese: '',
            example: '',
            note: '',
            category: ''
        },
        lookupOptions: {
            pronunciation: true,
            vietnamese: true,
            example: true
        },
        editingWordId: null,
        saveButtonText: 'Lưu'
    },
    apiKeyModal: {
        isOpen: false,
        input: ''
    },
    categoryModal: {
        isOpen: false,
        input: '',
        editingCategoryId: null
    }
};
window.modeStates = {
    study: {
        currentIndex: 0,
        shuffledVocab: []
    },
    quiz: {
        currentIndex: 0,
        shuffledVocab: [],
        quizDisplayMode: 'word'
    },
    flashcard: {
        currentIndex: 0,
        shuffledVocab: [],
        flashcardDisplayMode: 'word'
    },
    game: {
        currentTab: 'matching',
        matching: {
            selectedKorean: null,
            selectedVietnamese: null,
            matchedPairs: [],
            shuffledVocab: []
        },
        fill: {
            currentSentence: '',
            correctWord: null,
            options: []
        }
    }
};

// Initialize extension when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.initializeEventListeners();

        await window.initDB();

        await Promise.all([
            window.loadVocabulary(),
            window.loadAttentionWords(),
            window.loadApiKey(),
            window.loadCategories()
        ]);

        await window.loadState();

    } catch (err) {
        console.error('Initialization failed:', err);
        window.showToast('Lỗi nghiêm trọng khi khởi động ứng dụng!', 'error');
    }

    window.addEventListener('unload', () => {
        if (window.saveStateTimeout) {
            clearTimeout(window.saveStateTimeout);
        }
        window.saveState().catch(err => console.error('Error saving state on unload:', err));
    });
});