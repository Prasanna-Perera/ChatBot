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
