const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_EDIT_MODEL = "gemini-2.5-flash-image";

let messages = [];
let selectedImage = null;
let isBusy = false;
let runtimeApiKey = "";

function getActiveApiKey() {
    if (runtimeApiKey && runtimeApiKey.trim() !== "") {
        return runtimeApiKey.trim();
    }
    if (window.CONFIG && CONFIG.API_KEY && CONFIG.API_KEY.trim() !== "") {
        return CONFIG.API_KEY.trim();
    }
    return "";
}

function toggleApiKeyBox() {
    const bar = document.getElementById("apiKeyBar");
    if (!bar) return;
    bar.style.display = bar.style.display === "none" ? "block" : "none";
}

function saveRuntimeApiKey() {
    const input = document.getElementById("txtRuntimeApiKey");
    if (!input) return;
    runtimeApiKey = input.value.trim();
    const bar = document.getElementById("apiKeyBar");
    if (bar) bar.style.display = "none";
}

function escapeHTML(str = "") {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function getWelcomeMessage() {
    return {
        role: "bot",
        text: "Hello! I'm **QuickChatBot**. Ask me anything or upload a photo to clean or edit it.",
        imageUrl: null
    };
}

function createNewChat() {
    messages = [getWelcomeMessage()];
    clearSelectedImage();
    renderMessages();
    document.getElementById("txtUserInput")?.focus();
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

function formatBotText(text = "") {
    const raw = typeof marked !== "undefined" ? marked.parse(text) : escapeHTML(text).replace(/\n/g, "<br>");
    return typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(raw) : raw;
}


function renderMessages() {
    const wrapper = document.getElementById("chatWrapper");
    if (!wrapper) return;

    wrapper.innerHTML = messages
        .map((msg) => {
            const isUser = msg.role === "user";
            const avatarIcon = isUser ? `<i class="fa-solid fa-user"></i>` : `<i class="fa-solid fa-bolt"></i>`;
            const bodyContent = isUser
                ? `<div>${escapeHTML(msg.text || "")}</div>`
                : `<div class="qb-markdown">${formatBotText(msg.text || "")}</div>`;

            const imgHtml = msg.imageUrl
                ? `
                    <img src="${msg.imageUrl}" alt="Chat photo" class="qb-chat-img">
                    ${!isUser ? `<a href="${msg.imageUrl}" download="quickchatbot-edited.png" class="btn btn-sm btn-outline-primary qb-download-link"><i class="fa-solid fa-download me-1"></i>Download Photo</a>` : ""}
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

    const apiKey = getActiveApiKey();
    if (!apiKey) {
        const bar = document.getElementById("apiKeyBar");
        if (bar) bar.style.display = "block";
        document.getElementById("txtRuntimeApiKey")?.focus();
        return;
    }

 const attachedImg = selectedImage;
    const finalPrompt = promptText || "Clean and enhance this photo neatly.";

    messages.push({
        role: "user",
        text: promptText || `[Photo Attached: ${attachedImg.name}]`,
        imageUrl: attachedImg ? attachedImg.dataUrl : null
    });
