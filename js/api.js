// Get available API key, avoiding rate-limited keys
function getAvailableApiKey() {
    if (window.apiKeys.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < window.apiKeys.length; i++) {
        const index = (window.currentApiKeyIndex + i) % window.apiKeys.length;
        const key = window.apiKeys[index];
        if (key.lastRateLimit === 0 || (now - key.lastRateLimit) > 60000) {
            window.currentApiKeyIndex = index;
            return key.key;
        }
    }
    return null;
}

// Lookup word using Gemini API
async function lookupWord(koreanWord) {
    if (!koreanWord) {
        window.showToast('Vui lòng nhập từ cần tra cứu!', 'error');
        return;
    }

    let currentKey = getAvailableApiKey();
    if (!currentKey) {
        openApiKeyModal();
        window.showToast('Không có API Key khả dụng! Vui lòng thêm API Key mới.', 'error');
        return;
    }

    const lookupPronunciation = document.getElementById('lookup-pronunciation').checked;
    const lookupVietnamese = document.getElementById('lookup-vietnamese').checked;
    const lookupExample = document.getElementById('lookup-example').checked;
    const lookupNote = document.getElementById('lookup-note')?.checked;

    if (!lookupPronunciation && !lookupVietnamese && !lookupExample && !lookupNote) {
        window.showToast('Vui lòng chọn ít nhất một trường để tra cứu!', 'error');
        return;
    }

    let requestText = `Hãy cung cấp thông tin chi tiết cho từ tiếng Hàn "${koreanWord}" với các trường sau:\n`;
    const fields = [];
    if (lookupPronunciation) fields.push('- Phiên âm (romaja, ngăn cách nhau bởi gạch ngang) (Chỉ hiển thị phiên âm, không giải thích thì thêm)');
    if (lookupVietnamese) fields.push('- Nghĩa tiếng Việt (chỉ hiển thị 1 nghĩa phổ biến được dùng khi dịch, nhưng nếu nó có nhiều nghĩa do phụ thuộc văn cảnh, bối cảnh trò chuyện khác nhau thì chỉ lấy tối đa 3 nghĩa được sử dụng nhiều nhất, các nghĩa ngăn cách nhau bởi dấu phẩy, không dùng dấu ngoặc vuông hoặc ký tự trang trí, viết hoa chữ cái đầu, không thêm giải thích mở rộng, không phân biệt giới tính, giai cấp, vai vế, địa vị trừ khi bản chất từ vựng yêu cầu)');
    if (lookupExample) fields.push('- Một câu ví dụ đơn giản phổ biến trong văn nói bằng tiếng Hàn kèm nghĩa tiếng Việt, không thêm giải thích, không thêm phiên âm');
    if (document.getElementById('lookup-note')?.checked) {
        fields.push('- Chú ý (giải thích ngắn gọn nếu từ có nhiều nghĩa khác, hoặc nghĩa thay đổi theo sắc thái, văn cảnh, giới tính, tuổi tác, vai vế, địa vị... nhưng phải ghi rõ nếu đó chỉ là truyền thống chứ không phải quy định cố định)');
    }
    requestText += fields.join('\n');
    requestText += '\nĐịnh dạng trả về:\n';
    if (lookupPronunciation) requestText += 'Phiên âm: [romaja]\n';
    if (lookupVietnamese) requestText += 'Nghĩa: [nghĩa 1, nghĩa 2, nghĩa 3]\n';
    if (lookupExample) requestText += 'Câu ví dụ: [câu tiếng Hàn] - [nghĩa tiếng Việt]\n';
    if (document.getElementById('lookup-note')?.checked) requestText += 'Chú ý: [chỉ ghi nếu có những lưu ý đặc biệt, hoặc ý nghĩa đặc biệt, hay trường hợp cụ thể, tránh diễn giải thiên lệch hoặc lỗi thời. Nếu có thì chỉ diễn giải ngắn gọn thôi, không có thì bỏ qua trường "chú ỳ" này]';

    while (currentKey) {
        try {
            apiKeys[currentApiKeyIndex].requestCount++;
            window.showToast('🌀 Đang tra cứu', 'success');

            const modelName = window.currentModel || 'gemini-1.5-flash';

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: requestText }] }]
                })
            });

            if (response.status === 429) {
                apiKeys[currentApiKeyIndex].lastRateLimit = Date.now();
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                currentKey = getAvailableApiKey();
                if (!currentKey) {
                    window.showToast('Tất cả API Key đều đạt giới hạn yêu cầu!', 'error');
                    return;
                }
                continue;
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                const resultText = data.candidates[0].content.parts[0].text;
                const pronunciationMatch = lookupPronunciation ? resultText.match(/Phiên âm: (.+)/) : null;
                const meaningMatch = lookupVietnamese ? resultText.match(/Nghĩa: (.+)/) : null;
                const exampleMatch = lookupExample ? resultText.match(/Câu ví dụ: (.+) - (.+)/) : null;
                const noteMatch = resultText.match(/Chú ý: (.+)/);

                let success = true;
                if (lookupPronunciation && !pronunciationMatch) success = false;
                if (lookupVietnamese && !meaningMatch) success = false;
                if (lookupExample && !exampleMatch) success = false;

                if (success) {
                    if (lookupPronunciation && pronunciationMatch) {
                        document.getElementById('pronunciation-input').value = pronunciationMatch[1].trim();
                    }
                    if (lookupVietnamese && meaningMatch) {
                        const meanings = meaningMatch[1].split(',').map(m => m.trim());
                        document.getElementById('vietnamese-input').value = meanings.join(', ');
                    }
                    if (lookupExample && exampleMatch) {
                        document.getElementById('example-input').value = `${exampleMatch[1].trim()} - ${exampleMatch[2].trim()}`;
                    }
                    if (noteMatch) {
                        document.getElementById('note-input').value = noteMatch[1].trim();
                    }
                    window.showToast('Tra cứu thành công!', 'success');
                } else {
                    window.showToast('Không tìm thấy thông tin đầy đủ cho các trường đã chọn!', 'error');
                }
            } else {
                window.showToast('Không nhận được dữ liệu từ API!', 'error');
            }
            const transaction = db.transaction(['apiKeys'], 'readwrite');
            const store = transaction.objectStore('apiKeys');
            store.put(apiKeys, 'geminiApiKeys');
            break;
        } catch (error) {
            if (error.message.includes('429')) {
                apiKeys[currentApiKeyIndex].lastRateLimit = Date.now();
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                currentKey = getAvailableApiKey();
                if (!currentKey) {
                    window.showToast('Tất cả API Key đều đạt giới hạn yêu cầu!', 'error');
                    return;
                }
            } else {
                window.showToast('Lỗi khi tra cứu từ: ' + error.message, 'error');
                break;
            }
        }
    }
}

// HÀM MỚI: Tách logic gọi API ra riêng để dùng khi bấm nút
async function fetchFillGameQuestion(correctWord) {
    const sentenceDiv = document.getElementById('fill-sentence');
    const resultDiv = document.getElementById('fill-result');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');
    const optionsContainer = document.getElementById('fill-options');

    // Hiển thị loading
    sentenceDiv.innerHTML = '<div style="text-align:center; padding: 20px;">⏳ Đang tạo câu hỏi với AI...</div>';

    let currentKey = getAvailableApiKey();
    if (!currentKey) {
        // Hiển thị lỗi thiếu key như cũ
        resultDiv.innerHTML = `
        <div class="api-key-error">
            <div class="error-icon">🔑</div>
            <div class="error-content">
                <h3 class="error-title">Không có API Key khả dụng!</h3>
                <p class="error-description">Bạn cần có API Key để sử dụng tính năng này.</p>
                <div class="error-actions">
                    <button id="addKeyBtn" class="get-api-key-btn">Thêm API Key</button>
                </div>
            </div>
        </div>`;
        document.getElementById('addKeyBtn')?.addEventListener('click', openApiKeyModal);
        if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
        return;
    }

    const requestText = `Tạo một câu tiếng Hàn sử dụng chính xác từ "${correctWord.korean}" và thay thế từ đó bằng một chỗ trống "___". Chỗ trống này phải nằm đúng tại vị trí của từ "${correctWord.korean}" trong câu. Cung cấp bản dịch tiếng Việt tương ứng, với "___" ở đúng vị trí từ bị ẩn. Định dạng trả về:\nCâu: [Câu tiếng Hàn có chỗ trống]\nDịch: [Bản dịch tiếng Việt tương ứng, cũng có chỗ trống tại vị trí đó]`;

    while (currentKey) {
        try {
            apiKeys[currentApiKeyIndex].requestCount++;
            window.showToast('🌀 Đang tạo câu hỏi', 'success');

            const modelName = window.currentModel || 'gemini-1.5-flash';

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${currentKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: requestText }] }] })
            });

            if (response.status === 429) {
                apiKeys[currentApiKeyIndex].lastRateLimit = Date.now();
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                currentKey = getAvailableApiKey();
                if (!currentKey) {
                    window.showToast('Tất cả API Key đều đạt giới hạn yêu cầu!', 'error');
                    if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
                    return;
                }
                continue;
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                const resultText = data.candidates[0].content.parts[0].text;
                const sentenceMatch = resultText.match(/Câu: (.+)/);
                const translationMatch = resultText.match(/Dịch: (.+)/);

                if (sentenceMatch && translationMatch) {
                    modeStates.game.fill.currentSentence = `${sentenceMatch[1]} (${translationMatch[1]})`;

                    // Hiển thị câu hỏi
                    window.displayFillGame();

                    // Mở khóa các nút bấm
                    const optionButtons = optionsContainer.querySelectorAll('button');
                    optionButtons.forEach(btn => btn.disabled = false);

                    if (resetFillGameBtn) resetFillGameBtn.classList.remove('hidden');
                    window.showToast('Tạo câu hỏi thành công!', 'success');
                    window.saveState();
                } else {
                    window.showToast('Không nhận được câu hỏi hợp lệ từ API!<', 'error');
                }
            } else {
                window.showToast('Không nhận được dữ liệu từ API!', 'error');
            }

            const transaction = db.transaction(['apiKeys'], 'readwrite');
            const store = transaction.objectStore('apiKeys');
            store.put(apiKeys, 'geminiApiKeys');
            break;
        } catch (error) {
            if (error.message.includes('429')) {
                apiKeys[currentApiKeyIndex].lastRateLimit = Date.now();
                currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
                currentKey = getAvailableApiKey();
                if (!currentKey) {
                    window.showToast('Tất cả API Key đều đạt giới hạn yêu cầu!', 'error');
                    return;
                }
            } else {
                window.showToast('Lỗi: ' + error.message, 'error');
                break;
            }
        }
    }
}

// Initialize fill game with Manual Button (SỬA ĐỔI LỚN)
async function initFillGame() {
    const sentenceDiv = document.getElementById('fill-sentence');
    const optionsContainer = document.getElementById('fill-options');
    const resultDiv = document.getElementById('fill-result');
    const resetFillGameBtn = document.getElementById('reset-fill-game-btn');

    if (!sentenceDiv || !optionsContainer || !resultDiv) return;

    let gameVocab = selectedCategory === 'all' ? [...allVocab] : allVocab.filter(word => normalizeCategory(word.category) === selectedCategory);
    window.toggleEmptyState('fill', gameVocab.length === 0);

    if (gameVocab.length === 0) {
        optionsContainer.innerHTML = '';
        resultDiv.innerHTML = '';
        if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');
        return;
    }

    // Reset UI
    resultDiv.innerHTML = '';
    optionsContainer.innerHTML = '';
    if (resetFillGameBtn) resetFillGameBtn.classList.add('hidden');

    // Chọn từ đúng ngẫu nhiên
    const correctWord = gameVocab[Math.floor(Math.random() * gameVocab.length)];
    modeStates.game.fill.correctWord = correctWord;

    const wrongOptions = window.fisherYatesShuffle
        ? window.fisherYatesShuffle(gameVocab.filter(w => w.id !== correctWord.id)).slice(0, 3)
        : gameVocab.filter(w => w.id !== correctWord.id).sort(() => 0.5 - Math.random()).slice(0, 3);

    const allOptions = window.fisherYatesShuffle
        ? window.fisherYatesShuffle([correctWord, ...wrongOptions])
        : [correctWord, ...wrongOptions].sort(() => 0.5 - Math.random());

    modeStates.game.fill.options = allOptions;

    // Hiện nút bấm thay vì gọi API ngay
    sentenceDiv.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <button id="start-fill-btn" class="btn btn-primary" style="font-size: 1.1em; padding: 10px 25px;">
                ✨ Tạo câu hỏi với AI
            </button>
        </div>
    `;

    // Gán sự kiện cho nút vừa tạo
    document.getElementById('start-fill-btn').addEventListener('click', () => {
        fetchFillGameQuestion(correctWord);
    });

    // Hiển thị các lựa chọn (nhưng disable)
    modeStates.game.fill.options.forEach(word => {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = word.korean;
        button.disabled = true; // Khóa nút lại
        optionsContainer.appendChild(button);
    });
}

// Export functions to global scope
window.getAvailableApiKey = getAvailableApiKey;
window.lookupWord = lookupWord;
window.initFillGame = initFillGame;