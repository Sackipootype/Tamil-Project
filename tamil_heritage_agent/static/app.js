const form = document.querySelector("#chat-form");
const input = document.querySelector("#message-input");
const mode = document.querySelector("#mode");
const language = document.querySelector("#language");
const voiceOutput = document.querySelector("#voice-output");
const micButton = document.querySelector("#mic-button");
const voiceTestButton = document.querySelector("#voice-test-button");
const messages = document.querySelector("#messages");
const welcomeBubble = document.querySelector("#welcome-bubble");
const serviceDot = document.querySelector("#service-dot");
const serviceLabel = document.querySelector("#service-label");
const serviceNote = document.querySelector("#service-note");
const timelineList = document.querySelector("#timeline-list");
const relatedList = document.querySelector("#related-list");
const citationList = document.querySelector("#citation-list");

const demoEndpoints = ["/api/chat", "/api/demo"];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let isSpeaking = false;
let lastSpokenButton = null;
let serverAudio = null;
let stopServerAudio = null;

const uiText = {
  tamil: {
    brandEyebrow: "தமிழ் முழுமையாக",
    languageLabel: "மொழி",
    modeLabel: "பயன்முறை",
    heroEyebrow: "பல முகவர் பாரம்பரிய உதவியாளர்",
    heroTitle: "கோவில்கள், வம்சங்கள், நினைவுச்சின்னங்கள், கட்டிடக்கலை பற்றி கேளுங்கள்.",
    voiceLabel: "பேசட்டும்",
    micLabel: "குரலில் கேள்",
    stopSpeaking: "நிறுத்து",
    speakAgain: "மீண்டும் கேள்",
    testVoiceButton: "குரல் சோதனை",
    messageLabel: "உங்கள் கேள்வி",
    composerHelp: "உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள். அனுப்ப Enter அழுத்துங்கள்; புதிய வரிக்கு Shift Enter.",
    askButton: "கேள்",
    thinking: "யோசிக்கிறது",
    listening: "கேட்கிறது",
    serviceReady: "சேவை தயார்",
    serviceReadyNote: "கேள்வி கேளுங்கள். quota இல்லையெனில் demo பதில் வரும்.",
    demoMode: "Demo முறை",
    demoModeNote: "Live model quota இல்லை; உள்ளூர் seed data பயன்படுத்தப்படுகிறது.",
    liveAgent: "Live agent",
    liveAgentNote: "OpenAI agent பதில் வெற்றிகரமாக வந்தது.",
    offline: "இணைப்பு இல்லை",
    offlineNote: "Website பயன்படுத்த FastAPI server-ஐ தொடங்குங்கள்.",
    serviceIssue: "சேவை சிக்கல்",
    serviceIssueNote: "FastAPI server மற்றும் API அமைப்பைச் சரிபார்க்கவும்.",
    audioReady: "ஒலி தயார்",
    audioReadyNote: "Browser autoplay தடுத்தது. பதிலின் கீழே உள்ள player-ல் Play அழுத்துங்கள்.",
    timelineTitle: "காலவரிசை",
    timelineEmpty: "காலவரிசைக்காக ஒரு கேள்வி கேளுங்கள்.",
    relatedTitle: "தொடர்புடைய நினைவுச்சின்னங்கள்",
    citationsTitle: "மேற்கோள்கள்",
    relatedDefaults: ["பிரகதீஸ்வரர் கோவில்", "கடற்கரை கோவில்", "கோணார்க் சூரிய கோவில்"],
    citationDefaults: ["யுனெஸ்கோ ஆவணங்கள்", "இந்திய தொல்லியல் ஆய்வு பதிவுகள்"],
    placeholder: "சோழர் கட்டிடக்கலையை பற்றி சொல்லுங்கள்",
    welcome: "தமிழில் விளக்கம்\n\nவணக்கம். இந்தியக் கட்டிடக்கலை, கோவில்கள், வம்சங்கள், நினைவுச்சின்னங்கள், காலவரிசை, மற்றும் கல்வி வினாக்கள் பற்றி கேளுங்கள்."
  },
  english: {
    brandEyebrow: "English mode",
    languageLabel: "Language",
    modeLabel: "Mode",
    heroEyebrow: "Multi-agent cultural heritage assistant",
    heroTitle: "Ask about temples, dynasties, monuments, and architecture.",
    voiceLabel: "Talk back",
    micLabel: "Ask by voice",
    stopSpeaking: "Stop",
    speakAgain: "Speak",
    testVoiceButton: "Test voice",
    messageLabel: "Your question",
    composerHelp: "Type your question. Press Enter to send, or Shift Enter for a new line.",
    askButton: "Ask",
    thinking: "Thinking",
    listening: "Listening",
    serviceReady: "Service ready",
    serviceReadyNote: "Ask a question. Demo fallback will activate if quota is unavailable.",
    demoMode: "Demo mode",
    demoModeNote: "Live model quota is unavailable, so the site is using local seed data.",
    liveAgent: "Live agent",
    liveAgentNote: "OpenAI agent response returned successfully.",
    offline: "Offline",
    offlineNote: "Start the FastAPI server to use the website.",
    serviceIssue: "Service issue",
    serviceIssueNote: "Check the FastAPI server and API configuration.",
    audioReady: "Audio ready",
    audioReadyNote: "Autoplay was blocked. Press Play in the player below the answer.",
    timelineTitle: "Timeline",
    timelineEmpty: "Ask a question to build a timeline.",
    relatedTitle: "Related Monuments",
    citationsTitle: "Citations",
    relatedDefaults: ["Brihadeeswarar Temple", "Shore Temple", "Konark Sun Temple"],
    citationDefaults: ["UNESCO documentation", "Archaeological Survey of India records"],
    placeholder: "Tell me about Chola architecture",
    welcome: "English Explanation\n\nWelcome. Ask about Indian architecture, temples, dynasties, monuments, timelines, and study questions."
  },
  bilingual: {
    brandEyebrow: "தமிழ் + English",
    languageLabel: "Language",
    modeLabel: "Mode",
    heroEyebrow: "Multi-agent cultural heritage assistant",
    heroTitle: "Ask about temples, dynasties, monuments, and architecture.",
    voiceLabel: "Talk back",
    micLabel: "Ask by voice",
    stopSpeaking: "Stop",
    speakAgain: "Speak",
    testVoiceButton: "Test voice",
    messageLabel: "Your question",
    composerHelp: "Type your question. Press Enter to send, or Shift Enter for a new line.",
    askButton: "Ask",
    thinking: "Thinking",
    listening: "Listening",
    serviceReady: "Service ready",
    serviceReadyNote: "Ask a question. Demo fallback will activate if quota is unavailable.",
    demoMode: "Demo mode",
    demoModeNote: "Live model quota is unavailable, so the site is using local seed data.",
    liveAgent: "Live agent",
    liveAgentNote: "OpenAI agent response returned successfully.",
    offline: "Offline",
    offlineNote: "Start the FastAPI server to use the website.",
    serviceIssue: "Service issue",
    serviceIssueNote: "Check the FastAPI server and API configuration.",
    audioReady: "Audio ready",
    audioReadyNote: "Autoplay was blocked. Press Play in the player below the answer.",
    timelineTitle: "Timeline",
    timelineEmpty: "Ask a question to build a timeline.",
    relatedTitle: "Related Monuments",
    citationsTitle: "Citations",
    relatedDefaults: ["Brihadeeswarar Temple", "Shore Temple", "Konark Sun Temple"],
    citationDefaults: ["UNESCO documentation", "Archaeological Survey of India records"],
    placeholder: "சோழர் கட்டிடக்கலையை பற்றி சொல்லுங்கள்",
    welcome: "தமிழில் விளக்கம்\n\nவணக்கம். இந்தியக் கட்டிடக்கலை, கோவில்கள், வம்சங்கள், நினைவுச்சின்னங்கள், காலவரிசை, மற்றும் கல்வி வினாக்கள் பற்றி கேளுங்கள்.\n\nEnglish Translation\n\nWelcome. Ask about Indian architecture, temples, dynasties, monuments, timelines, and study questions."
  }
};

function addMessage(role, text, options = {}) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.setAttribute("aria-label", role === "user" ? "Your message" : "Assistant message");
  if (options.pending) article.classList.add("pending");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (options.pending) {
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
    bubble.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span><span class="typing-label">${currentCopy().thinking}</span>`;
  } else {
    bubble.textContent = text;
  }
  if (role === "assistant" && !options.pending) {
    bubble.dataset.rawAnswer = text;
    const actions = document.createElement("div");
    actions.className = "message-actions";
    const speak = document.createElement("button");
    speak.type = "button";
    speak.className = "mini-button";
    speak.textContent = currentCopy().speakAgain;
    speak.addEventListener("click", () => speakAnswer(text, speak));
    actions.append(speak);
    bubble.append(actions);
  }

  article.append(avatar, bubble);
  messages.append(article);
  messages.scrollTop = messages.scrollHeight;
  return article;
}

function setService(ok, label, note) {
  serviceDot.classList.toggle("ok", ok);
  serviceLabel.textContent = label;
  serviceNote.textContent = note;
  serviceDot.parentElement?.setAttribute("aria-label", `${label}. ${note}`);
}

function currentCopy() {
  return uiText[language.value] || uiText.bilingual;
}

function applyLanguageUI() {
  const copy = currentCopy();
  document.documentElement.lang = language.value === "tamil" ? "ta" : "en";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (copy[key]) node.textContent = copy[key];
  });
  document.querySelectorAll("[data-label-ta]").forEach((node) => {
    node.textContent = language.value === "tamil" ? node.dataset.labelTa : node.dataset.labelEn;
  });
  input.placeholder = copy.placeholder;
  micButton.title = copy.micLabel;
  micButton.setAttribute("aria-label", copy.micLabel);
  welcomeBubble.textContent = copy.welcome;
  updateList(relatedList, copy.relatedDefaults.join("\n"), "");
  updateList(citationList, copy.citationDefaults.join("\n"), "");
  updateList(timelineList, "", copy.timelineEmpty);
  setService(serviceDot.classList.contains("ok"), serviceLabel.textContent, serviceNote.textContent);
}

function speechLang() {
  if (language.value === "tamil") return "ta-IN";
  if (language.value === "english") return "en-US";
  return "ta-IN";
}

function cleanForSpeech(text) {
  return text
    .replace(/[-*]\s+/g, "")
    .replace(/தமிழில் விளக்கம்|English Translation|English Explanation|Key Facts|Timeline|Related Monuments|Quiz Questions(?: \\(Optional\\))?|Citations|Confidence/g, "")
    .replace(/முக்கிய தகவல்கள்|காலவரிசை|தொடர்புடைய நினைவுச்சின்னங்கள்|வினாடி வினா|மேற்கோள்கள்|நம்பகத்தன்மை/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitBilingualSpeech(answer) {
  const tamilPart = extractSection(answer, "தமிழில் விளக்கம்");
  const englishPart = extractSection(answer, "English Translation") || extractSection(answer, "English Explanation");
  if (language.value === "tamil") return [{ text: cleanForSpeech(answer), lang: "ta-IN" }];
  if (language.value === "english") return [{ text: cleanForSpeech(answer), lang: "en-US" }];
  const chunks = [];
  if (tamilPart) chunks.push({ text: cleanForSpeech(tamilPart), lang: "ta-IN" });
  if (englishPart) chunks.push({ text: cleanForSpeech(englishPart), lang: "en-US" });
  return chunks.length ? chunks : [{ text: cleanForSpeech(answer), lang: speechLang() }];
}

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((voice) => voice.lang === lang) || voices.find((voice) => voice.lang?.startsWith(lang.split("-")[0])) || null;
}

function setSpeakingState(active, button = null) {
  isSpeaking = active;
  document.body.classList.toggle("speaking", active);
  if (lastSpokenButton && lastSpokenButton !== button) lastSpokenButton.textContent = currentCopy().speakAgain;
  if (button) button.textContent = active ? currentCopy().stopSpeaking : currentCopy().speakAgain;
  lastSpokenButton = active ? button : null;
}

async function playServerSpeech(chunks, button) {
  setSpeakingState(true, button);
  try {
    const actions = button?.closest(".message-actions");
    if (actions) actions.querySelectorAll(".inline-player").forEach((player) => player.remove());
    for (const chunk of chunks) {
      const url = `/api/speech?language=${chunk.lang.startsWith("ta") ? "tamil" : "english"}&text=${encodeURIComponent(chunk.text.slice(0, 2200))}`;
      const player = document.createElement("audio");
      player.className = "inline-player";
      player.controls = true;
      player.preload = "auto";
      player.src = url;
      if (actions) actions.append(player);
      serverAudio = player;
      try {
        await new Promise((resolve, reject) => {
          stopServerAudio = resolve;
          player.onended = resolve;
          player.onerror = reject;
          player.play().catch(reject);
        });
      } catch (error) {
        player.focus();
        throw new Error("Autoplay was blocked. Use the audio player below the answer.");
      }
      stopServerAudio = null;
      if (!isSpeaking) break;
    }
  } catch (error) {
    if ((error.message || "").includes("Autoplay")) {
      setService(true, currentCopy().audioReady, currentCopy().audioReadyNote);
    } else {
      setService(false, currentCopy().serviceIssue, `Speech playback failed. ${error.message || ""}`.trim());
    }
  } finally {
    serverAudio = null;
    setSpeakingState(false, button);
  }
}

function stopSpeech(button = null) {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (serverAudio) {
    serverAudio.pause();
    serverAudio.currentTime = 0;
  }
  if (stopServerAudio) stopServerAudio();
  setSpeakingState(false, button);
}

function speakAnswer(answer, button = null) {
  if (isSpeaking) {
    stopSpeech(button);
    return;
  }
  const chunks = splitBilingualSpeech(answer).filter((chunk) => chunk.text);
  if (!chunks.length) return;
  const preferServerSpeech = ["127.0.0.1", "localhost"].includes(window.location.hostname);
  if (preferServerSpeech || !("speechSynthesis" in window)) {
    playServerSpeech(chunks, button);
    return;
  }
  setSpeakingState(true, button);
  let index = 0;
  const speakNext = () => {
    if (index >= chunks.length) {
      setSpeakingState(false, button);
      return;
    }
    const chunk = chunks[index++];
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = chunk.lang;
    utterance.rate = chunk.lang.startsWith("ta") ? 0.86 : 0.94;
    utterance.pitch = 0.96;
    const voice = pickVoice(chunk.lang);
    if (voice) utterance.voice = voice;
    utterance.onend = speakNext;
    utterance.onerror = () => setSpeakingState(false, button);
    window.speechSynthesis.speak(utterance);
  };
  speakNext();
}

function setupSpeechRecognition() {
  if (!SpeechRecognition) {
    micButton.disabled = true;
    micButton.classList.add("unavailable");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => {
    isListening = true;
    micButton.classList.add("listening");
    micButton.querySelector("span").textContent = "■";
    input.placeholder = currentCopy().listening;
  };
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript) input.value = transcript;
  };
  recognition.onend = () => {
    isListening = false;
    micButton.classList.remove("listening");
    micButton.querySelector("span").textContent = "◉";
    input.placeholder = currentCopy().placeholder;
  };
  recognition.onerror = () => {
    isListening = false;
    micButton.classList.remove("listening");
    input.placeholder = currentCopy().placeholder;
  };
}

function extractSection(answer, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextHeadings = [
    "தமிழில் விளக்கம்",
    "முக்கிய தகவல்கள்",
    "காலவரிசை",
    "தொடர்புடைய நினைவுச்சின்னங்கள்",
    "வினாடி வினா",
    "மேற்கோள்கள்",
    "நம்பகத்தன்மை",
    "English Explanation",
    "English Translation",
    "Key Facts",
    "Timeline",
    "Related Monuments",
    "Quiz Questions",
    "Quiz Questions (Optional)",
    "Citations",
    "Confidence"
  ].filter((item) => item !== heading);
  const pattern = new RegExp(`${escaped}\\s*\\n([\\s\\S]*?)(?=\\n(?:${nextHeadings.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*\\n|$)`, "i");
  const match = answer.match(pattern);
  return match ? match[1].trim() : "";
}

function updateList(element, lines, fallback) {
  const items = lines
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
  element.innerHTML = "";
  const nextItems = items.length ? items : [fallback];
  nextItems.slice(0, 6).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    element.append(li);
  });
}

function updateInspector(answer) {
  const timeline = extractSection(answer, "Timeline") || extractSection(answer, "காலவரிசை");
  const related = extractSection(answer, "Related Monuments") || extractSection(answer, "தொடர்புடைய நினைவுச்சின்னங்கள்");
  const citations = extractSection(answer, "Citations") || extractSection(answer, "மேற்கோள்கள்");
  updateList(timelineList, timeline, currentCopy().timelineEmpty);
  updateList(relatedList, related, language.value === "tamil" ? "தொடர்புடைய நினைவுச்சின்னங்கள் முழு பதிலில் வரும்." : "Related monuments appear in the full answer.");
  updateList(citationList, citations, language.value === "tamil" ? "மேற்கோள்கள் முழு பதிலில் வரும்." : "Citations appear in the full answer.");
}

async function callAgent(payload) {
  let lastError = null;
  for (const endpoint of demoEndpoints) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const data = await response.json();
      if (endpoint === "/api/demo") {
        setService(true, currentCopy().demoMode, currentCopy().demoModeNote);
      } else {
        setService(true, currentCopy().liveAgent, currentCopy().liveAgentNote);
      }
      return data.answer;
    }
    lastError = await response.text();
  }
  throw new Error(lastError || "No endpoint returned an answer.");
}

async function sendMessage(text) {
  const payload = {
    message: text,
    mode: mode.value,
    voice_output: voiceOutput.checked,
    response_language: language.value
  };
  if (isSpeaking) stopSpeech();
  addMessage("user", text);
  const pendingMessage = addMessage("assistant", "", { pending: true });
  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = currentCopy().thinking;
  try {
    const answer = await callAgent(payload);
    pendingMessage.remove();
    const assistantMessage = addMessage("assistant", answer);
    updateInspector(answer);
    if (voiceOutput.checked) {
      const speakButton = assistantMessage.querySelector(".mini-button");
      speakAnswer(answer, speakButton);
    }
  } catch (error) {
    pendingMessage.remove();
    addMessage("assistant", `Unable to reach the agent.\n\n${error.message}`);
    setService(false, currentCopy().serviceIssue, currentCopy().serviceIssueNote);
  } finally {
    button.disabled = false;
    button.textContent = currentCopy().askButton;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  sendMessage(text);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt-ta]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = language.value === "english" ? button.dataset.promptEn : button.dataset.promptTa;
    input.focus();
  });
});

language.addEventListener("change", () => {
  if (isSpeaking) stopSpeech();
  if (recognition) recognition.lang = speechLang();
  applyLanguageUI();
});

voiceOutput.addEventListener("change", () => {
  if (!voiceOutput.checked && isSpeaking) {
    stopSpeech();
  }
});

micButton.addEventListener("click", () => {
  if (!recognition) return;
  recognition.lang = speechLang();
  if (isListening) {
    recognition.stop();
    return;
  }
  recognition.start();
});

voiceTestButton.addEventListener("click", () => {
  const text = language.value === "english" ? "Hello. I can speak the answer back to you." : "வணக்கம். நான் பதிலை உங்களுக்காக வாசிக்க முடியும்.";
  speakAnswer(text, voiceTestButton);
});

fetch("/health")
  .then((response) => {
    if (!response.ok) throw new Error("Health check failed.");
    applyLanguageUI();
    setService(true, currentCopy().serviceReady, currentCopy().serviceReadyNote);
  })
  .catch(() => {
    applyLanguageUI();
    setService(false, currentCopy().offline, currentCopy().offlineNote);
  });

applyLanguageUI();
setupSpeechRecognition();
if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
