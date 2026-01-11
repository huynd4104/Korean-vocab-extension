# 🇰🇷 Korean Vocab Extension - Learn Korean Vocabulary with AI

**Korean Vocab Extension** is a browser extension that helps you learn Korean vocabulary effectively, enjoyably, and intelligently. The project integrates **Google Gemini AI** to automatically look up meanings, pronunciations, provide examples, and create contextual practice exercises.

## ✨ Key Features

### 🧠 1. Intelligent AI Support (Gemini Integrated)

* **Automatic Word Lookup:** Simply enter a Korean word, and the AI ​​will automatically fill in:

* Pronunciation (Romaja).

* The closest Vietnamese meaning.

* Practical example sentences with translations.

* Special notes (if any).

* **Word Fill-in-the-Blanks Game Creation:** The AI ​​automatically generates Korean sentences containing the vocabulary you are learning for fill-in-the-blank exercises.

### 📚 2. Diverse Learning Modes
* **📖 Study Mode:** View vocabulary flashcards with full information and pronunciation support (Text-to-Speech).

* **🎴 Flashcard Mode:** Flip cards for quick review, mark difficult words in the "Notes" list.

* **❓ Quiz Mode:** Test your memory with multiple-choice quizzes.

* **🎮 Game Mode:**

* **Matching:** Match Korean words with their corresponding Vietnamese meanings.

* **Fill-in-blank:** Fill in the missing words in AI-generated sentences.

### 🛠 3. Powerful Data Management
* **Offline Storage:** All data is stored in the user's browser via **IndexedDB** (no separate server required).

* **Import/Export:** Easily import/export vocabulary lists via `.txt` files for backup or sharing.

* **Category Management:** Organize vocabulary by separate topics.

---

## 🚀 Installation Guide

Since this is a development extension (dev version), you need to manually install it into your browser (Chrome, Edge, Brave, Cốc Cốc...).

### Step 1: Download the Source Code
1. Clone this repository to your computer or download the ZIP file and extract it.

```bash

git clone [https://github.com/huynd4104/korean-vocab-extension.git](https://github.com/huynd4104/korean-vocab-extension.git)

```

### Step 2: Install in your browser
1. Open your browser and access the extension management page:

* **Chrome/Cốc Cốc:** `chrome://extensions/`

* **Edge:** `edge://extensions/`
2. Enable **Developer mode** in the upper right corner.

3. Click the **Load unpacked** button.

4. Select the folder containing the source code of the project you just downloaded.

5. The extension will appear on your browser's toolbar.

---

## ⚙️ Configuring the API Key (Important)

To use AI-related features (Automatic Word Lookup, Fill-in-the-Blank Game), you need a **Google Gemini API Key** (Free).

1. Access [Google AI Studio](https://aistudio.google.com/app/apikey) to get your API Key.

2. Open the Extension, switch to the **Management** tab.

3. Click the **Set API Key** button.

4. Enter your Key and click **Add API Key**.

* *Tip:* You can add multiple Keys to avoid the Rate Limit. The system will automatically switch Keys as needed.

---

## 📖 Usage Guide

### 1. Adding New Vocabulary

* Click the **+ Add Word** button in the left corner.

* Enter the Korean word in the first box.

* Press the **🔍 Lookup** button: The AI ​​will automatically fill in the remaining information.

* Select a category and press **Save**.

### 2. Learning
* Select your desired learning mode (Study, Quiz, Flashcard...) from the menu bar.

* Use the navigation buttons (Shuffle words, Redo, Next word) to operate.

### 3. Importing data from a file
Create a `.txt` file with one word per line format:
```text
Korean_word`pronunciation`meaning`example`notes`category

Example:
사랑`sarang`Love`사랑해요 - I love you`Common use`Emotion
