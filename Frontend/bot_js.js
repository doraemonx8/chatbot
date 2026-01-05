const $ = (selector) => {
  if (typeof selector !== 'string' || !selector.trim()) return null;
  return selector.startsWith('#')
    ? document.getElementById(selector.slice(1))
    : document.querySelector(selector);
};

const $$ = (selector) =>
    typeof selector === 'string' ? document.querySelectorAll(selector) : [];

const manageVolume = (isShow) => {
    if (isShow) {
         $$(".volume-play").forEach(el => el.style.display = 'block')
         $$(".volume-pause").forEach(el => el.style.display = 'none')
    } else { 
        $$(".volume-pause").forEach(el => el.style.display = 'block')
        $$(".volume-play").forEach(el => el.style.display = 'none')  
    }
};

const md = window.markdownit({
    html: false,        
    linkify: true,     
    breaks: true  
});

let caseNumberFlag = 0;
var selectedVoice;
const synth = window.speechSynthesis;

// Auth Token Management
const AUTH_TOKEN_KEY = 'lexbot_auth_token';
const AUTH_USER_KEY = 'lexbot_user_email';

const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
const setAuthToken = (token) => localStorage.setItem(AUTH_TOKEN_KEY, token);
const removeAuthToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
};
const getAuthUser = () => localStorage.getItem(AUTH_USER_KEY);
const setAuthUser = (email) => localStorage.setItem(AUTH_USER_KEY, email);

// Check if user is authenticated
const isAuthenticated = () => !!getAuthToken();

// Backend URL Configuration
// const API_BASE_URL = window.location.hostname === 'localhost' 
//     ? 'http://localhost:3000' 
//     : 'https://ai.nextclm.in/cb';

const API_BASE_URL = "http://localhost:3000"; //local testing

// Handle window refresh or close event
window.addEventListener("beforeunload", function() {
    synth.cancel();
});

document.addEventListener("DOMContentLoaded", function() {
    if (caseNumberFlag !== 0) {
        document.querySelector(".suggestions").style.display = "none";
    }
    
    // Check authentication on page load
    if (!isAuthenticated()) {
        showLoginModal();
    }
});

synth.onvoiceschanged = function () {
  let voices = synth.getVoices();
  voices.forEach(function (voice) {
    if (voice.name == "Microsoft Heera - English (India)") {
      selectedVoice = voice;
    } else {
      if (voice.name == "Lekha") {
        selectedVoice = voice;
      }
    }
  });
};

let currentlySpeaking = false;
let paused = false;

function speakText(text) {
    if (!synth) {
        alert("Text to speech not supported");
        return;
    }

    if (currentlySpeaking && !paused) {
        synth.cancel();
        currentlySpeaking = false;
        paused = true;
        manageVolume(true);
        return;
    }

    if (paused) {
        paused = false;
    }

    let utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.onend = function(e) {
        currentlySpeaking = false;
        paused = false;
        manageVolume(true);
    };

    utterance.onerror = function(e) {
        currentlySpeaking = false;
        paused = false;
        console.error("Speech synthesis error:", e);
        if (currentlySpeaking) {
            synth.cancel();
            manageVolume(false);
        } else {
            manageVolume(true);
        }
    };

    if (selectedVoice == "Microsoft Heera - English (India)") {
        utterance.rate = 1.3;
    } else {
        utterance.rate = 1.25;
    }

    currentlySpeaking = true;
    synth.speak(utterance);
}

// Speech Recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-IN";
recognition.continuous = false;
recognition.interimResults = false;

const speechBtn = document.getElementById("speech");
const searchBox = document.getElementById("searchBox");

let isListening = false;

speechBtn.addEventListener("click", () => {
  if (isListening) {
    recognition.stop();
    speechBtn.classList.remove("listening");
    isListening = false;
  } else {
    recognition.start();
    speechBtn.classList.add("listening");
    isListening = true;
  }
});

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log("Voice Input:", transcript);
  searchBox.value = transcript;
};

recognition.onerror = (event) => {
  console.error("Speech Recognition Error:", event.error);
  isListening = false;
};

recognition.onend = () => {
  isListening = false;
  speechBtn.classList.remove("listening");
};

document.getElementById("fab").addEventListener("click", function() {
    if (!isAuthenticated()) {
        showLoginModal();
        return;
    }
    
    document.getElementById("cb").style.display = "block";
    document.getElementById("cb").style.opacity = 1;
    setOpenStatus(1);
});

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("chatContainer").addEventListener("click", function (event) {
        const trg = event.target;
        if (trg.classList.contains("volume")) {
            let res = trg.parentElement.innerText.trim();
            let updatedMessage = res.replace(
                /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
                ""
            );

            const playBtn = trg.parentElement.querySelector('.volume-play');
            const pauseBtn = trg.parentElement.querySelector('.volume-pause');

            if (synth.speaking) {
                synth.cancel();
                manageVolume(true);
            }
            setTimeout(() => { 
                pauseBtn.style.display = 'block';
                playBtn.style.display = 'none';
            }, 100);
            
            speakText(updatedMessage);
        }
    });
});

document.getElementById("cl").addEventListener("click", function() {
    const cb = document.getElementById("cb");
    cb.style.opacity = 1;
    const fadeEffect = setInterval(function() {
        if (cb.style.opacity > 0) {
            cb.style.opacity -= 0.1;
        } else {
            clearInterval(fadeEffect);
            cb.style.display = "none";
        }
    }, 50);

    sessionStorage.removeItem("caseNumber");
    sessionStorage.removeItem("context");
    sessionStorage.removeItem("caseNumberFlag");
    caseNumberFlag = 0;
    synth.cancel();

    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = `
      <div class="chat" style="display: flex;">
        <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
        <div class="msg">
        <p class="speaker"><img src="./volume.svg" class="volume volume-play"><img style="display: none;" src="./volume-off.svg" class="volume volume-pause"></p>Hello!</div>
      </div>
      <div class="chat" style="display: flex;">
        <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
        <div class="msg"><p class="speaker"><img src="./volume.svg" class="volume volume-play"><img style="display: none;" src="./volume-off.svg" class="volume volume-pause"></p> I am LexBot.</div>
      </div>
    `;
    
    document.querySelectorAll(".chat-bubble").forEach((bubble) => bubble.remove());
    setOpenStatus(0);
});

function setChatData(from, message, time) {
    try {
        const existingData = sessionStorage.getItem("chatData");
        const data = existingData ? JSON.parse(existingData) : [];
        data.push({ from, message, time });
        sessionStorage.setItem("chatData", JSON.stringify(data));
    } catch (error) {
        console.error("Error saving chat data to sessionStorage:", error);
    }
}

function setOpenStatus(status) {
    try {
        sessionStorage.setItem("openStatus", status);
    } catch (error) {
        console.error("Error setting open status in sessionStorage:", error);
    }
}

function formatAMPM() {
    const date = new Date();
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesPadded = minutes < 10 ? `0${minutes}` : minutes;

    const strTime = `${hours}:${minutesPadded} ${ampm}`;
    return strTime;
}

const chatBubble = `<div class="chat d-flex chat-bubble"><div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div><div class="chat-bubble msg">
<div class="typing">
  <div class="dot"></div>
  <div class="dot"></div>
  <div class="dot"></div>
</div>
</div>
</div>`;

document.addEventListener("DOMContentLoaded", function() {
    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML += `
        <div class="chat" style="display: flex;">
            <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
            <div class="msg">
                <p class="speaker"><img src="/volume.svg" class="volume volume-play"/><img style="display: none;" class="volume volume-pause" src="./volume-off.svg"/>Hello!</p>
            </div>
        </div>
        <div class="chat" style="display: flex;">
            <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
            <div class="msg">
                <p class="speaker"><img src="./volume.svg" class="volume volume-play"><img style="display: none;" class="volume volume-pause" src="./volume-off.svg">I am LexBot.</p>
            </div>
        </div>
        ${chatBubble}
    `;

    setTimeout(() => {
        const bubbles = document.querySelectorAll(".chat-bubble");
        bubbles.forEach((bubble) => bubble.remove());
    }, 1000);

    const openStatus = sessionStorage.getItem("openStatus");
    const cb = document.getElementById("cb");
    const fab = document.getElementById("fab");

    if (openStatus === "1" && isAuthenticated()) {
        cb.style.display = "block";
        fab.style.display = "none";
    } else {
        cb.style.display = "none";
        fab.style.display = "block";
    }

    const contextData = sessionStorage.getItem("context");
    if (contextData) {
        const data = JSON.parse(contextData);
        data.forEach(({ isBot, message }) => {
            if (!isBot) return userResponse(message, 0);

            let val = message;
            if (typeof val === 'string') try { val = JSON.parse(val); } catch {}

            apiResponse(val?.response ? val : { response: message, memory: [], params: {} }, 0);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
        sessionStorage.setItem("context", "[]");
        sessionStorage.setItem("openStatus", "0");
    }
});

// Helper to manage Session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem("chatSessionId");
    if (!sessionId) {
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem("chatSessionId", sessionId);
        console.log("🆕 New session created:", sessionId);
    } else {
        console.log("♻️ Using existing session:", sessionId);
    }
    return sessionId;
}

// Streaming Chat Function
async function chatSend(msg = "") {
    if (!isAuthenticated()) {
        showLoginModal();
        return;
    }

    const searchBox = document.getElementById("searchBox");
    const searchButton = document.getElementById("sendButton");
    const modeSelector = document.getElementById("modeSelector");
    const chatContainer = document.getElementById("chatContainer");

    searchBox.disabled = true;
    searchButton.disabled = true;

    let chatVal = searchBox.value.trim() !== "" ? searchBox.value.trim() : msg;
    if (!chatVal) {
        searchBox.disabled = false;
        searchButton.disabled = false;
        return;
    }

    userResponse(chatVal);

    const payload = {
        message: chatVal,
        sessionId: getSessionId(),
        mode: modeSelector.value
    };

    const streamUrl = `${API_BASE_URL}/api/chat/stream`;

    try {
        const response = await fetch(streamUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(payload),
        });

        if (response.status === 401 || response.status === 403) {
            removeAuthToken();
            showLoginModal();
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const loadingBubble = document.querySelector(".chat-bubble");
        if (loadingBubble) loadingBubble.remove();

        const msgId = `bot-msg-${Date.now()}`;
        
        const botHtml = `
            <div class="chat" style="display: flex;">
                <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png" alt="Bot Image"></div>
                <div class="msg">
                    <p class="speaker">
                        <img src="./volume.svg" class="volume volume-play"/>
                        <img style="display: none;" class="volume volume-pause" src="./volume-off.svg"/>
                        <span id="${msgId}"></span><span id="${msgId}-cursor" class="cursor-blink"></span>
                    </p>
                </div>
            </div>`;

        chatContainer.insertAdjacentHTML("beforeend", botHtml);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const msgSpan = document.getElementById(msgId);
        const cursorSpan = document.getElementById(`${msgId}-cursor`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split("\n\n");
            buffer = lines.pop() || ""; 

            for (const line of lines) {
                if (!line.trim()) continue;
                
                if (line.startsWith("data: ")) {
                    const jsonStr = line.substring(6).trim();
                    if (jsonStr === "[DONE]") break;

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.type === "token") {
                            accumulatedText += data.content;
                            msgSpan.innerHTML = marked.parse(accumulatedText);
                            chatContainer.scrollTop = chatContainer.scrollHeight;

                        } else if (data.type === "done") {
                            if (cursorSpan) cursorSpan.remove();

                            searchBox.disabled = false;
                            searchButton.disabled = false;
                            searchBox.focus();

                            const completeResponseObj = {
                                response: accumulatedText,
                                memory: [],
                                params: { mode: payload.mode } 
                            };
                            
                            contextMessage(completeResponseObj, 1);
                            
                            sessionStorage.setItem("state", JSON.stringify({
                                memory: [],
                                params: completeResponseObj.params,
                            }));
                        } else if (data.type === "error") {
                            throw new Error(data.message || "Unknown streaming error");
                        }
                    } catch (e) {
                        console.error("Error parsing stream JSON:", e, "Line:", jsonStr);
                    }
                }
            }
        }

    } catch (error) {
        console.error("Streaming Error:", error);
        
        const cursorSpan = document.querySelector(".cursor-blink");
        if (cursorSpan) cursorSpan.remove();

        chatContainer.innerHTML += `<div class="chat"><div class="msg" style="color:red">Connection interrupted. Please try again. ${error.message}</div></div>`;
        searchBox.disabled = false;
        searchButton.disabled = false;
    }
}

const userResponse = (chatVal, via = "") => {
    const searchBox = document.getElementById("searchBox");
    const chatContainer = document.getElementById("chatContainer");

    searchBox.value = "";

    const userChatDiv = document.createElement("div");
    userChatDiv.className = "user-chat";
    userChatDiv.innerHTML = `<p class='user-msg'>${chatVal}</p>`;

    chatContainer.appendChild(userChatDiv);
    chatContainer.insertAdjacentHTML("beforeend", chatBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (via !== 0) {
        contextMessage(chatVal, 2);
    }
};

const apiResponse = (chatResponse, via) => {
    const chatContainer = document.getElementById("chatContainer");
    const responseBot = chatResponse.response;

    if (via !== 0) {
        contextMessage(chatResponse, 1);
    }

    sessionStorage.setItem(
        "state",
        JSON.stringify({
            memory: chatResponse.memory.slice(-7),
            params: chatResponse.params,
        })
    );

    const answerDiv = formatText(responseBot);
    let chatDiv = `<div class="chat" style="display: flex;">
        <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png" alt="Bot Image"></div>
        <div class="msg"><p class="speaker"><img src="./volume.svg" class="volume volume-play"/><img style="display: none;" class="volume volume-pause" src="./volume-off.svg"/>
        ${answerDiv}
    </p></div></div>`;

    chatContainer.insertAdjacentHTML("beforeend", chatDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const formatText = (input) => {
    return md.render(input);
};

document.addEventListener("DOMContentLoaded", function() {
    const sendButton = document.getElementById("sendButton");
    const searchBox = document.getElementById("searchBox");

    sendButton.addEventListener("click", function() {
        if (searchBox.value.trim() !== "") {
            chatSend();
        }
    });

    searchBox.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            if (searchBox.value.trim() !== "") {
                chatSend();
                event.preventDefault();
            }
        }
    });

    searchBox.disabled = false;
});

const contextMessage = (msg, via) => {
    try {
        let existingContext = JSON.parse(sessionStorage.getItem("context")) || [];
        let isBot = via === 1;

        let messageText = "";
        if (typeof msg === "string") {
            messageText = msg;
        } else if (msg && typeof msg === "object") {
            messageText = JSON.stringify(msg);
        } else {
            messageText = String(msg);
        }

        let newMessage = {
            message: messageText,
            isBot: isBot
        };

        existingContext.push(newMessage);

        if (existingContext.length > 50) {
            existingContext = existingContext.slice(-50);
        }

        sessionStorage.setItem("context", JSON.stringify(existingContext));
        console.log(`💾 Saved to UI context: ${isBot ? 'Bot' : 'User'} message`);
    } catch (e) {
        console.error("❌ Failed to save context:", e);
    }
};

// Session reset 
function clearChatSession() {
    try {
        const sessionId = sessionStorage.getItem("chatSessionId");
        
        sessionStorage.removeItem("context");
        sessionStorage.removeItem("chatSessionId");
        sessionStorage.removeItem("openStatus");
        
        const chatContainer = document.getElementById("chatContainer");
        chatContainer.innerHTML = `
            <div class="chat" style="display: flex;">
                <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
                <div class="msg">
                    <p class="speaker">
                        <img src="./volume.svg" class="volume volume-play"/>
                        <img style="display: none;" class="volume volume-pause" src="./volume-off.svg"/>
                        Hello!
                    </p>
                </div>
            </div>
            <div class="chat" style="display: flex;">
                <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
                <div class="msg">
                    <p class="speaker">
                        <img src="./volume.svg" class="volume volume-play">
                        <img style="display: none;" class="volume volume-pause" src="./volume-off.svg">
                        I am LexBot.
                    </p>
                </div>
            </div>
        `;
        
        console.log("✅ Frontend session cleared");
    } catch (e) {
        console.error("❌ Failed to clear session:", e);
    }
}
window.clearChatSession = clearChatSession;

// === AUTHENTICATION FUNCTIONS ===

function showLoginModal() {
    const modalHtml = `
        <div id="authModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
                <h2 style="margin-bottom: 20px; text-align: center;">Login to LexBot</h2>
                
                <div id="emailStep">
                    <input type="email" id="emailInput" placeholder="Enter your email" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <button id="sendOtpBtn" style="width: 100%; padding: 10px; background: #8FCC33; color: white; border: none; border-radius: 5px; cursor: pointer;">Send OTP</button>
                </div>
                
                <div id="otpStep" style="display: none;">
                    <p style="margin-bottom: 10px;">OTP sent to <strong id="sentEmail"></strong></p>
                    <input type="text" id="otpInput" placeholder="Enter 6-digit OTP" maxlength="6" style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px;">
                    <button id="verifyOtpBtn" style="width: 100%; padding: 10px; background: #8FCC33; color: white; border: none; border-radius: 5px; cursor: pointer;">Verify OTP</button>
                    <button id="backToEmailBtn" style="width: 100%; padding: 10px; margin-top: 10px; background: #ddd; border: none; border-radius: 5px; cursor: pointer;">Back</button>
                </div>
                
                <div id="authError" style="color: red; margin-top: 10px; text-align: center; display: none;"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('sendOtpBtn').addEventListener('click', sendOTP);
    document.getElementById('verifyOtpBtn').addEventListener('click', verifyOTP);
    document.getElementById('backToEmailBtn').addEventListener('click', () => {
        document.getElementById('emailStep').style.display = 'block';
        document.getElementById('otpStep').style.display = 'none';
        document.getElementById('authError').style.display = 'none';
    });
}


async function sendOTP() {
    const email = document.getElementById('emailInput').value.trim();
    const errorDiv = document.getElementById('authError');
    const btn = document.getElementById('sendOtpBtn'); 
    
    if (!email || !email.includes('@')) {
        errorDiv.textContent = 'Please enter a valid email';
        errorDiv.style.display = 'block';
        return;
    }

    const originalText = btn.innerHTML; 
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Sending...';
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('emailStep').style.display = 'none';
            document.getElementById('otpStep').style.display = 'block';
            document.getElementById('sentEmail').textContent = email;
            errorDiv.style.display = 'none';
        } else {
            errorDiv.textContent = data.error || 'Failed to send OTP';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function verifyOTP() {
    const email = document.getElementById('emailInput').value.trim();
    const otp = document.getElementById('otpInput').value.trim();
    const errorDiv = document.getElementById('authError');
    const btn = document.getElementById('verifyOtpBtn');
    
    if (!otp || otp.length !== 6) {
        errorDiv.textContent = 'Please enter 6-digit OTP';
        errorDiv.style.display = 'block';
        return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Verifying...';
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setAuthToken(data.token);
            setAuthUser(data.user);
            document.getElementById('authModal').remove();
            
            // Open chatbot if it was triggered
            const fab = document.getElementById("fab");
            if (fab) fab.click();
            
            // Refresh the page or UI to show logged in state (Optional)
            window.location.reload(); 
        } else {
            errorDiv.textContent = data.error || 'Invalid OTP';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Logout function
function logout() {
    removeAuthToken();
    clearChatSession();
    window.location.reload();
}
window.logout = logout;

document.addEventListener("DOMContentLoaded", function() {
    console.log("clearChatSession() - Reset everything");
    console.log("logout() - Logout from the system");
});