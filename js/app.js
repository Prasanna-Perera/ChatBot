const TEXT_MODEL = "gemini-3.5-flash-lite";
const IMAGE_EDIT_MODEL = "gemini-2.5-flash-image";
const NANO_IMAGE_MODEL = "gemini-nano-banana-2.1";

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
        text: "Hello! I'm **QuickChatBot** powered by **Gemini 3.8 Flash**. Ask me anything in chat, or attach a photo.",
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

// Nano image generation handler
async function generateNanoImage() {
    if (isBusy) return;

    const inputEl = document.getElementById("txtUserInput");
    const nanoBtn = document.getElementById("btnNanoGenerate");
    const sendBtn = document.getElementById("btnSend");
    const promptText = inputEl?.value.trim() || "";

    const apiKey = getActiveApiKey();
    if (!apiKey) {
        const bar = document.getElementById("apiKeyBar");
        if (bar) bar.style.display = "block";
        document.getElementById("txtRuntimeApiKey")?.focus();
        return;
    }

    const attachedImg = selectedImage;
    const finalPrompt =
        promptText ||
        (attachedImg
            ? "Clean and enhance this photo neatly."
            : "A clean modern futuristic robot sitting on a desk, high detail");

    messages.push({
        role: "user",
        text: attachedImg ? `[Nano Edit] ${finalPrompt}` : `[Nano Generate] ${finalPrompt}`,
        imageUrl: attachedImg ? attachedImg.dataUrl : null
    });

    if (inputEl) inputEl.value = "";
    clearSelectedImage();
    renderMessages();

    isBusy = true;
    if (nanoBtn) nanoBtn.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    messages.push({
        role: "bot",
        text: "Generating image with Nano Banana...",
        imageUrl: null
    });
    renderMessages();

    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_IMAGE_MODEL}:generateContent`;

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

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    responseModalities: ["TEXT", "IMAGE"]
                }
            })
        });

        const data = await response.json();
        messages.pop();

        if (!response.ok) {
            throw new Error(data?.error?.message || `HTTP ${response.status}`);
        }

        const responseParts = data?.candidates?.[0]?.content?.parts || [];
        let replyText = "";
        let generatedImageUrl = null;

        for (const p of responseParts) {
            if (p.text) replyText += p.text;
            const inline = p.inlineData || p.inline_data;
            if (inline && inline.data) {
                const mime = inline.mimeType || inline.mime_type || "image/png";
                generatedImageUrl = `data:${mime};base64,${inline.data}`;
            }
        }

        if (!generatedImageUrl) {
            throw new Error(replyText || "No image returned by the model.");
        }

        messages.push({
            role: "bot",
            text: replyText || "Here is your Nano generated image:",
            imageUrl: generatedImageUrl
        });
        renderMessages();
    } catch (err) {
        messages.pop();
        messages.push({
            role: "bot",
            text: `**Nano Image Error:** ${err.message}`,
            imageUrl: null
        });
        renderMessages();
    } finally {
        isBusy = false;
        if (nanoBtn) nanoBtn.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        inputEl?.focus();
    }
}

async function btnSendMessageOnAction() {
    if (isBusy) return;

    const inputEl = document.getElementById("txtUserInput");
    const sendBtn = document.getElementById("btnSend");
    const nanoBtn = document.getElementById("btnNanoGenerate");
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
    const finalPrompt = attachedImg
        ? (promptText || "Analyze this photo and explain what is in it or how it can be improved.")
        : promptText;

    messages.push({
        role: "user",
        text: promptText || `[Photo Attached: ${attachedImg.name}]`,
        imageUrl: attachedImg ? attachedImg.dataUrl : null
    });

    inputEl.value = "";
    clearSelectedImage();
    renderMessages();

    isBusy = true;
    if (sendBtn) sendBtn.disabled = true;
    if (nanoBtn) nanoBtn.disabled = true;

    messages.push({
        role: "bot",
        text: attachedImg ? "Analyzing your photo with Gemini 3.8 Flash..." : "QuickChatBot is thinking...",
        imageUrl: null
    });
    renderMessages();

    try {
        const modelToUse = TEXT_MODEL;
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

        let response;
        let data;
        const maxRetries = 0;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify(bodyPayload)
            });

            data = await response.json();

            const isHighDemand =
                response.status === 503 ||
                /high demand|overloaded|unavailable/i.test(data?.error?.message || "");

            if (response.ok || !isHighDemand || attempt === maxRetries) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }

        messages.pop();

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
            replyText = "No response received. Please try another prompt.";
        }

        messages.push({
            role: "bot",
            text: replyText || "Here is your response:",
            imageUrl: editedImageUrl
        });
        renderMessages();
    } catch (err) {
        messages.pop();
        messages.push({
            role: "bot",
            text: `**Error:** ${err.message}\n\n*(Tip: Google AI Studio\`AIzaSy...\` API Key  \`config.js\` or top **API Key** check.)*`,
            imageUrl: null
        });
        renderMessages();
    } finally {
        isBusy = false;
        if (sendBtn) sendBtn.disabled = false;
        if (nanoBtn) nanoBtn.disabled = false;
        inputEl.focus();
    }
}

function updateThemeIcons() {
    const isDark = document.body.classList.contains("dark-mode");
    const iconClass = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";

    const dIcon = document.getElementById("themeIcon");
    const mIcon = document.getElementById("mobileThemeIcon");
    if (dIcon) dIcon.className = iconClass;
    if (mIcon) mIcon.className = iconClass;
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    updateThemeIcons();
}

document.addEventListener("DOMContentLoaded", () => {
    updateThemeIcons();
    createNewChat();

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