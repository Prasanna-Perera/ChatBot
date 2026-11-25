# 🤖 AI ChatBot

A clean, responsive web-based **ChatBot** built with **HTML**, **CSS**, and **JavaScript**, designed for fast conversations, easy customization, and smooth API integration.

---

## ✨ Features

- 💬 **Real-Time Chat Interface:** Clean user and bot message bubbles with auto-scrolling.
- ⚡ **Fast & Lightweight:** Built with vanilla HTML, CSS, and JavaScript without heavy framework overhead.
- 🔐 **Configurable API Setup:** Keeps API keys and endpoint settings separated via a configuration file (`config.js`).
- 📱 **Responsive Layout:** Adapts cleanly across desktop and mobile screens.
- 🛠️ **Easy to Extend:** Simple modular structure for adding commands, themes, or new model endpoints.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Configuration:** `config.js` (ignored in Git for security)
- **Version Control:** Git & GitHub

---

## 📁 Project Structure

```text
ChatBot/
├── index.html          # Main chat interface
├── style.css           # Styling and layout
├── script.js           # Chat logic and API request handling
├── config.example.js   # Sample configuration template
├── .gitignore          # Ignored files (e.g., config.js, secrets)
└── README.md           # Project documentation
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/Prasanna-Perera/ChatBot.git](https://github.com/Prasanna-Perera/ChatBot.git)
cd ChatBot
```

### 2. Configure Your API Key
Create a `config.js` file (or copy `config.example.js`) and add your API credentials:

```javascript
// config.js
const CONFIG = {
  API_KEY: "YOUR_API_KEY_HERE",
  API_URL: "[https://your-api-endpoint.example.com/v1/chat](https://your-api-endpoint.example.com/v1/chat)"
};
```

> ⚠️ **Security Note:** Make sure `config.js` is listed in `.gitignore` so sensitive API keys are never pushed to GitHub.

### 3. Run the App
Open `index.html` directly in your browser or run it using **Live Server** in **VS Code**.

---

## 💡 Usage

1. Open the ChatBot in your browser.
2. Type your message in the input box at the bottom.
3. Press **Enter** or click **Send** to receive a response from the bot.

---

## 🗺️ Roadmap / Future Improvements

- [ ] Add typing indicator animation while waiting for responses
- [ ] Support Markdown & code block formatting in bot replies
- [ ] Add dark / light theme toggle
- [ ] Add chat history / export options

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the repository and submit a pull request.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
