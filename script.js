"use strict";

/* ---------- Element references ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  source: $("sourceLang"),
  target: $("targetLang"),
  swap: $("swapBtn"),
  input: $("inputText"),
  output: $("outputText"),
  count: $("charCount"),
  clear: $("clearBtn"),
  translate: $("translateBtn"),
  copy: $("copyBtn"),
  speak: $("speakBtn"),
  error: $("error"),
  status: $("status")
};

/* ---------- Translation providers ---------- */
const providers = {
  /** MyMemory: free, no key. Supports "Autodetect" as the source. */
  async mymemory(text, source, target) {
    const langpair = `${source === "auto" ? "Autodetect" : source}|${target}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Translation service returned an error (${res.status}).`);
    const data = await res.json();
    if (Number(data.responseStatus) !== 200) {
      throw new Error(data.responseDetails || "The translation service could not process this request.");
    }
    return data.responseData.translatedText;
  },

  /** Google Cloud Translation API v2. */
  async google(text, source, target) {
    if (!CONFIG.googleApiKey || CONFIG.googleApiKey === "YOUR_GOOGLE_API_KEY") {
      throw new Error("Add your Google API key in config.js, or switch the provider to \"mymemory\".");
    }
    const body = { q: text, target, format: "text" };
    if (source !== "auto") body.source = source;
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(CONFIG.googleApiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `Google API error (${res.status}).`);
    return data.data.translations[0].translatedText;
  }
};

/* ---------- Setup ---------- */
function populateSelects() {
  const options = LANGUAGES.map((l) => `<option value="${l.code}">${l.name}</option>`).join("");
  el.source.innerHTML = `<option value="auto">Detect language</option>${options}`;
  el.target.innerHTML = options;

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("lingua-langs")) || {}; } catch (_) { /* storage unavailable */ }
  el.source.value = saved.source || CONFIG.defaultSource;
  el.target.value = saved.target || CONFIG.defaultTarget;
}

function saveLanguages() {
  try {
    localStorage.setItem("lingua-langs", JSON.stringify({ source: el.source.value, target: el.target.value }));
  } catch (_) { /* ignore */ }
}

/* ---------- UI helpers ---------- */
function showError(message) {
  el.error.textContent = message;
  el.error.hidden = !message;
}

function setStatus(message) {
  el.status.textContent = message;
}

function setLoading(isLoading) {
  el.translate.disabled = isLoading;
  el.translate.classList.toggle("loading", isLoading);
}

function setOutput(text) {
  el.output.textContent = text;
  const hasText = Boolean(text);
  el.output.classList.toggle("has-text", hasText);
  el.copy.disabled = !hasText;
  el.speak.disabled = !hasText || !("speechSynthesis" in window);
}

function updateCount() {
  el.count.textContent = `${el.input.value.length} / ${CONFIG.maxChars}`;
}

/* ---------- Actions ---------- */
async function handleTranslate() {
  const text = el.input.value.trim();
  showError("");
  setStatus("");

  if (!text) {
    showError("Enter some text to translate.");
    el.input.focus();
    return;
  }
  if (el.source.value === el.target.value) {
    showError("Choose two different languages.");
    return;
  }

  setLoading(true);
  setOutput("");
  try {
    const translated = await providers[CONFIG.provider](text, el.source.value, el.target.value);
    setOutput(translated);
    setStatus("Translation complete");
  } catch (err) {
    const offline = err instanceof TypeError;
    showError(offline ? "Could not reach the translation service. Check your internet connection and try again." : err.message);
  } finally {
    setLoading(false);
  }
}

function handleSwap() {
  const translated = el.output.classList.contains("has-text") ? el.output.textContent : "";
  const previousSource = el.source.value;

  // "Detect language" cannot be a target, so fall back to English.
  el.source.value = el.target.value;
  el.target.value = previousSource === "auto" ? (el.source.value === "en" ? "fr" : "en") : previousSource;

  if (translated) {
    el.input.value = translated;
    updateCount();
    setOutput("");
  }
  saveLanguages();
  showError("");
}

async function handleCopy() {
  const text = el.output.textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    // Fallback for older browsers or non-secure contexts
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  setStatus("Copied to clipboard");
}

function handleSpeak() {
  const synth = window.speechSynthesis;
  if (synth.speaking) {
    synth.cancel();
    return;
  }
  const lang = LANGUAGES.find((l) => l.code === el.target.value);
  const utterance = new SpeechSynthesisUtterance(el.output.textContent);
  utterance.lang = lang ? lang.speech : "en-GB";
  utterance.onstart = () => { setStatus("Speaking..."); el.speak.classList.add("active"); };
  utterance.onend = utterance.onerror = () => { setStatus(""); el.speak.classList.remove("active"); };
  synth.speak(utterance);
}

function handleClear() {
  el.input.value = "";
  updateCount();
  setOutput("");
  showError("");
  setStatus("");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  el.input.focus();
}

/* ---------- Events ---------- */
el.input.maxLength = CONFIG.maxChars;
el.input.addEventListener("input", updateCount);
el.input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleTranslate();
});
el.translate.addEventListener("click", handleTranslate);
el.swap.addEventListener("click", handleSwap);
el.copy.addEventListener("click", handleCopy);
el.speak.addEventListener("click", handleSpeak);
el.clear.addEventListener("click", handleClear);
el.source.addEventListener("change", saveLanguages);
el.target.addEventListener("change", saveLanguages);

populateSelects();
updateCount();
