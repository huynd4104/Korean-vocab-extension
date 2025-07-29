// Global variables
window.db = null;
window.currentMode = 'study';
window.allVocab = [];
window.unknownWords = [];
window.editingWordId = null;
window.selectedCategory = 'all';
window.searchQuery = '';
window.modalState = {
    isModalOpen: false,
    modalInputs: { korean: '', pronunciation: '', vietnamese: '', example: '', category: '', note: '' },
    lookupOptions: { pronunciation: true, vietnamese: true, example: true },
    editingWordId: null,
    saveButtonText: 'Lưu'
};
window.apiKeys = [];
window.allCategories = [];
window.currentApiKeyIndex = 0;
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

// Restore modal state if needed
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

// Initialize extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize event listeners first
    window.initializeEventListeners();

    // Initialize IndexedDB and load data
    window.initDB().then(() => {
        Promise.all([
            window.loadVocabulary(), 
            window.loadUnknownWords(), 
            window.loadApiKey(),
            window.loadCategories()
        ]).then(() => {
            window.updateCategorySelector();
            window.updateCategorySuggestions();
            window.updateCategoryList();
            window.updateApiKeyList();
            
            window.loadState().then(() => {
                window.filterVocabByCategory();
                window.setMode(window.currentMode);
            }).catch(err => {
                console.error('Error loading state:', err);
                const formMessage = document.getElementById('form-message');
                if (formMessage) formMessage.textContent = 'Lỗi khi tải trạng thái học!';
                window.filterVocabByCategory();
                window.setMode('study');
            });
        }).catch(err => {
            console.error('Error loading data:', err);
            const formMessage = document.getElementById('form-message');
            if (formMessage) formMessage.textContent = 'Lỗi khi tải dữ liệu!';
        });
    }).catch(err => {
        console.error('Error initializing DB:', err);
        const formMessage = document.getElementById('form-message');
        if (formMessage) formMessage.textContent = 'Lỗi khi khởi tạo cơ sở dữ liệu!';
    });

    // Save state before popup closes
    window.addEventListener('unload', () => {
        if (window.saveStateTimeout) {
            clearTimeout(window.saveStateTimeout);
        }
        window.saveState().catch(err => console.error('Error saving state on unload:', err));
    });
});