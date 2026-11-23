const STORAGE_KEY = "quickbot_saved_chats_v1";
const THEME_KEY = "quickbot_theme_v1";

// Chat සඳහා model එක සහ Photo Clean/Edit සඳහා image-capable Gemini model එක
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_EDIT_MODEL = "gemini-2.5-flash-image"; // ඔබේ API key එකට support කරන Gemini image model එක

let chats = [];
let activeChatId = null;
let selectedImage = null; // { base64, mimeType, dataUrl, name }
let isBusy = false;

function escapeHTML(str = "") {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function loadChats() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        chats = raw ? JSON.parse(raw) : [];
    } catch {
        chats = [];
    }

    if (!Array.isArray(chats) || chats.length === 0) {
        const fresh = createNewChatObject();
        chats = [fresh];
    }

    activeChatId = chats[0].id;
    saveChats();
}

function saveChats() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (e) {
        console.warn("Storage full or blocked:", e);
    }
}

function createNewChatObject() {
    return {
        id: "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        title: "New Chat",
        updatedAt: Date.now(),
        messages: [
            {
                role: "bot",
                text: "ආයුබෝවන්! මම **QuickBot**. ඔයාට අහන්න ඕනේ දෙයක් අහන්න හෝ photo එකක් upload කරලා clean / edit කරගන්න.",
                imageUrl: null
            }
        ]
    };
}

function getActiveChat() {
    return chats.find((c) => c.id === activeChatId) || chats[0];
}

function createNewChat() {
    const newChat = createNewChatObject();
    chats.unshift(newChat);
    activeChatId = newChat.id;
    clearSelectedImage();
    saveChats();
    renderAll();
    document.getElementById("txtUserInput")?.focus();
}

function selectChat(chatId) {
    activeChatId = chatId;
    clearSelectedImage();
    renderAll();
}

function deleteChat(event, chatId) {
    event.stopPropagation();
    chats = chats.filter((c) => c.id !== chatId);
    if (chats.length === 0) {
        chats = [createNewChatObject()];
    }
    if (activeChatId === chatId) {
        activeChatId = chats[0].id;
    }
    saveChats();
    renderAll();
}

function clearAllChats() {
    chats = [createNewChatObject()];
    activeChatId = chats[0].id;
    clearSelectedImage();
    saveChats();
    renderAll();
}

function handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        selectedImage = {
            base64,
            mimeType: file.type || "image/png",
            dataUrl,
            name: file.name
        };

        document.getElementById("selectedImageThumb").src = dataUrl;
        document.getElementById("selectedImageName").textContent = file.name;
        document.getElementById("imagePreviewBar").style.display = "block";
    };
    reader.readAsDataURL(file);
}

function clearSelectedImage() {
    selectedImage = null;
    const input = document.getElementById("imageFileInput");
    if (input) input.value = "";
    const bar = document.getElementById("imagePreviewBar");
    if (bar) bar.style.display = "none";
}

function renderHistory() {
    const listEl = document.getElementById("chatHistoryList");
    if (!listEl) return;

    listEl.innerHTML = chats
        .map((chat) => {
            const activeClass = chat.id === activeChatId ? "active" : "";
            return `
                <div class="qb-history-item ${activeClass}" onclick="selectChat('${chat.id}')">
                    <span class="text-truncate"><i class="fa-regular fa-message me-2"></i>${escapeHTML(chat.title)}</span>
                    <button type="button" class="qb-delete-chat-btn" onclick="deleteChat(event, '${chat.id}')" title="Delete">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            `;
        })
        .join("");
}

function formatBotText(text = "") {
    const raw = typeof marked !== "undefined" ? marked.parse(text) : escapeHTML(text).replace(/\n/g, "<br>");
    return typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(raw) : raw;
}

function renderMessages() {
    const chat = getActiveChat();
    const wrapper = document.getElementById("chatWrapper");
    const titleEl = document.getElementById("currentChatTitle");
    if (!chat || !wrapper) return;

    if (titleEl) titleEl.textContent = chat.title;

    wrapper.innerHTML = chat.messages
        .map((msg) => {
            const isUser = msg.role === "user";
            const avatarIcon = isUser ? `<i class="fa-solid fa-user"></i>` : `<i class="fa-solid fa-bolt"></i>`;
            const bodyContent = isUser
                ? `<div>${escapeHTML(msg.text || "")}</div>`
                : `<div class="qb-markdown">${formatBotText(msg.text || "")}</div>`;

            const imgHtml = msg.imageUrl
                ? `
                    <img src="${msg.imageUrl}" alt="Chat photo" class="qb-chat-img">
                    ${!isUser ? `<a href="${msg.imageUrl}" download="quickbot-edited.png" class="btn btn-sm btn-outline-primary qb-download-link"><i class="fa-solid fa-download me-1"></i>Download Photo</a>` : ""}
                  `
                : "";

            return `
                <div class="qb-msg-row ${isUser ? "user" : "bot"}">
                    ${!isUser ? `<div class="qb-msg-avatar bot">${avatarIcon}</div>` : ""}
                    <div class="qb-bubble ${isUser ? "user" : "bot"}">
                        ${bodyContent}
                        ${imgHtml}
                    </div>
                    ${isUser ? `<div class="qb-msg-avatar user">${avatarIcon}</div>` : ""}
                </div>
            `;
        })
        .join("");

    scrollToBottom();
}

function renderAll() {
    renderHistory();
    renderMessages();
}

function scrollToBottom() {
    const box = document.getElementById("chatBox");
    if (box) {
        requestAnimationFrame(() => {
            box.scrollTop = box.scrollHeight;
        });
    }
}

async function btnSendMessageOnAction() {
    if (isBusy) return;

    const inputEl = document.getElementById("txtUserInput");
    const sendBtn = document.getElementById("btnSend");
    const promptText = inputEl.value.trim();

    if (!promptText && !selectedImage) return;

    if (!window.CONFIG || !CONFIG.API_KEY || CONFIG.API_KEY === "api key methana danna" || CONFIG.API_KEY.trim() === "") {
        alert("කරුණාකර config.js file එකේ ඔයාගේ API_KEY එක දාන්න.");
        return;
    }

    const chat = getActiveChat();
    const attachedImg = selectedImage;
    const finalPrompt = promptText || "Clean and enhance this photo neatly.";

    if (chat.title === "New Chat" && promptText) {
        chat.title = promptText.slice(0, 28);
    } else if (chat.title === "New Chat" && attachedImg) {
        chat.title = "Photo Edit";
    }

    chat.messages.push({
        role: "user",
        text: promptText || `[Photo Attached: ${attachedImg.name}]`,
        imageUrl: attachedImg ? attachedImg.dataUrl : null
    });

    inputEl.value = "";
    clearSelectedImage();
    saveChats();
    renderAll();

    isBusy = true;
    if (sendBtn) sendBtn.disabled = true;

    const tempThinkingMsg = {
        role: "bot",
        text: attachedImg ? "Photo එක clean/edit කරමින් පවතී..." : "QuickBot සිතමින් පවතී...",
        imageUrl: null
    };
    chat.messages.push(tempThinkingMsg);
    renderMessages();

    try {
        const isImageTask = Boolean(attachedImg);
        const modelToUse = isImageTask ? IMAGE_EDIT_MODEL : TEXT_MODEL;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`;

        const parts = [];
        if (attachedImg) {
            parts.push({
                inlineData: {
                    mimeType: attachedImg.mimeType,
                    data: attachedImg.base64
                }
            });
        }
        parts.push({ text: finalPrompt });

        const bodyPayload = {
            contents: [{ parts }]
        };

        if (isImageTask) {
            bodyPayload.generationConfig = {
                responseModalities: ["TEXT", "IMAGE"]
            };
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": CONFIG.API_KEY
            },
            body: JSON.stringify(bodyPayload)
        });

        const data = await response.json();
        chat.messages.pop(); // remove thinking placeholder

        if (!response.ok) {
            throw new Error(data?.error?.message || `HTTP ${response.status}`);
        }

        const responseParts = data?.candidates?.[0]?.content?.parts || [];
        let replyText = "";
        let editedImageUrl = null;

        for (const p of responseParts) {
            if (p.text) replyText += p.text;
            const inline = p.inlineData || p.inline_data;
            if (inline && inline.data) {
                const mime = inline.mimeType || inline.mime_type || "image/png";
                editedImageUrl = `data:${mime};base64,${inline.data}`;
            }
        }

        if (!replyText && !editedImageUrl) {
            replyText = "ප්‍රතිචාරයක් ලැබුණේ නැහැ. වෙනත් prompt එකක් උත්සාහ කරන්න.";
        }

        chat.messages.push({
            role: "bot",
            text: replyText || "ඔබගේ photo එක සකස් කරන ලදී:",
            imageUrl: editedImageUrl
        });
        chat.updatedAt = Date.now();
        saveChats();
        renderAll();
    } catch (err) {
        chat.messages.pop();
        chat.messages.push({
            role: "bot",
            text: `**Error:** ${err.message}`,
            imageUrl: null
        });
        saveChats();
        renderAll();
    } finally {
        isBusy = false;
        if (sendBtn) sendBtn.disabled = false;
        inputEl.focus();
    }
}

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    const iconClass = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";

    const dIcon = document.getElementById("themeIcon");
    const mIcon = document.getElementById("mobileThemeIcon");
    if (dIcon) dIcon.className = iconClass;
    if (mIcon) mIcon.className = iconClass;

    try {
        localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {}
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(nextTheme);
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
    applyTheme(savedTheme);
    loadChats();
    renderAll();

    const inputEl = document.getElementById("txtUserInput");
    if (inputEl) {
        inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                btnSendMessageOnAction();
            }
        });
    }
});