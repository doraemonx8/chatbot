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

// Handle window refresh or close event
window.addEventListener("beforeunload", function() {
    synth.cancel(); // Stop any ongoing speech synthesis
});

// Handle document readiness and conditions for displaying elements
document.addEventListener("DOMContentLoaded", function() {
    if (caseNumberFlag !== 0) {
        document.querySelector(".suggestions").style.display = "none";
        console.log(caseNumberFlag, "+--==");
    }
});

// Handles changes in the available voices
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
let paused = false; // New variable to track toggle state

function speakText(text) {
    if (!synth) {
        alert("Text to speech not supported");
        return;
    }

    // Toggle logic — if speaking and not paused, stop it
    if (currentlySpeaking && !paused) {
        console.log("Speech is ongoing. Stopping now.");
        synth.cancel();
        currentlySpeaking = false;
        paused = true; // Mark as paused/toggled off
       manageVolume(true);
        return;
    }

    // If paused and user clicks again — start speech again
    if (paused) {
        console.log("Restarting speech after pause.");
        paused = false; // Reset pause flag
    }

    let utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(selectedVoice, "selectedVoice");
    }

    utterance.onend = function(e) {
        console.log("Finished speaking in " + e.elapsedTime + " seconds.");
        console.log("Speech finished");
        currentlySpeaking = false;
        paused = false; // Reset paused on completion
        manageVolume(true);
    };

    utterance.onerror = function(e) {
        currentlySpeaking = false;
        paused = false; // Reset paused on error
        console.error("Speech synthesis error:", e);
        if (currentlySpeaking) {
            console.log("Currently Speaking. Cancelling previous utterance");
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



const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-IN"; // Set to "en-US" or "en-IN" as per your preference
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
    speechBtn.classList.add("listening"); // show active mic
    isListening = true;
  }
});

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log("Voice Input:", transcript);
  searchBox.value = transcript;
//   chatSend(transcript); // Automatically send as message
};

recognition.onerror = (event) => {
  console.error("Speech Recognition Error:", event.error);
  isListening = false;
};

recognition.onend = () => {
  isListening = false;
  speechBtn.classList.remove("listening");
};


// function speakText(text) {
//     if (!synth) {
//         alert("Text to speech not supported");
//         return;
//     }
//     if (currentlySpeaking) {
//         console.log("Currently Speaking. Cancelling previous utterance");
//         synth.stop();
//     }

//     let utterance = new SpeechSynthesisUtterance(text);
//     if (selectedVoice) {
//         utterance.voice = selectedVoice;
//         console.log(selectedVoice, "selectedVoice");
//     }

//     utterance.onend = function(e) {
//         console.log("Finished speaking in " + e.elapsedTime + " seconds.");
//         console.log("Speech finished");
//         currentlySpeaking = false;
//         manageVolume(true);
       
//     };

//     utterance.onerror = function(e) {
//         currentlySpeaking = false;
//         console.error("Speech synthesis error:", e);
//         if (currentlySpeaking) {
//             console.log("Currently Speaking. Cancelling previous utterance");
//             synth.cancel();
//             manageVolume(false);
//         } else {
//            manageVolume(true);
//         }
//     };

//     if (selectedVoice == "Microsoft Heera - English (India)") {
//         utterance.rate = 1.3;
//     } else {
//         utterance.rate = 1.25;
//     }

//     currentlySpeaking = true;
    
//     synth.speak(utterance);
// }

document.getElementById("fab").addEventListener("click", function() {
    document.getElementById("cb").style.display = "block"; // Equivalent to jQuery's fadeIn()
    document.getElementById("cb").style.opacity = 1;
    setOpenStatus(1);

    // document.getElementById("chatContainer").addEventListener("click", function (event) {
    //         console.log("Chat Container",event.target);
            
    //         if (event.target.classList.contains("speaker")) {
    //             let msgText = event.target.closest(".msg");
    //             let spanContent = msgText.querySelector("span").innerHTML;
    //             msgText.querySelector("span").innerHTML = ""; // Remove span contents

    //             let res = msgText.textContent.trim();
    //             let updatedMessage = res.replace(
    //                 /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    //                 ""
    //             );
    //             msgText.querySelector("span").innerHTML = spanContent; // Restore the span contents
    //             console.log(res);

    //             const play = event.target.querySelector(".play");
    //             const pause = event.target.querySelector(".pause");

    //             if (synth.speaking) {
    //                 synth.cancel();
    //                 pause.style.display = "none";
    //                 play.style.display = "block";
    //             } else {
    //                 speakText(updatedMessage);
    //                 pause.style.display = "block";
    //                 play.style.display = "none";
    //             }
    //         }
    //     });
});

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("chatContainer").addEventListener("click", function (event) {
        console.log("Chat Container", event.target);
        const trg = event.target;
        if (trg.classList.contains("volume")) {
            let res = trg.parentElement.innerText.trim();
            let updatedMessage = res.replace(
                /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
                ""
            );
            console.log(updatedMessage);

            // if (synth.speaking) {
            //     synth.cancel();
            //     trg.previousSibling.style.display = "none";
            //     trg.style.display = "block";
            // } else {
            //     speakText(updatedMessage);
            //     console.log(trg.nextSibling);
            //     trg.nextSibling.style.display = "block";
            //     trg.style.display = "none";
            // }

        
            const playBtn = trg.parentElement.querySelector('.volume-play');
            const pauseBtn = trg.parentElement.querySelector('.volume-pause');

            if (synth.speaking) {
                synth.cancel();
                manageVolume(true);
            }
            setTimeout(() => { 
                pauseBtn.style.display = 'block';
                playBtn.style.display = 'none';
            },100);
            
            speakText(updatedMessage);
        }
        });
});

document.getElementById("cl").addEventListener("click", function() {
    const cb = document.getElementById("cb");
    cb.style.opacity = 1; // Ensure it's visible to start fade out
    const fadeEffect = setInterval(function() {
        if (cb.style.opacity > 0) {
            cb.style.opacity -= 0.1;
        } else {
            clearInterval(fadeEffect);
            cb.style.display = "none"; // Hide after fade out
        }
    }, 50);

    sessionStorage.removeItem("caseNumber");
    sessionStorage.removeItem("context");
    sessionStorage.removeItem("caseNumberFlag");
    caseNumberFlag = 0;
    synth.cancel();

    const chatContainer = document.getElementById("chatContainer");
    chatContainer.innerHTML = ""; // Clear the chat container

    // Create and append new chat messages to the container
    chatContainer.innerHTML += `
      <div class="chat" style="display: flex;">
        <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
        <div class="msg">
        <p class="speaker"><img src="./volume.svg"><img style="display: none;" src="./volume-off.svg"></p>Hello!</div>
      </div>
      <div class="chat" style="display: flex;">
        <div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div>
        <div class="msg"><p class="speaker"><img src="./volume.svg"><img style="display: none;" src="./volume-off.svg"></p> I am LexBot.</div>
      </div>
    `;
    // chatContainer.appendChild(chatBubble.cloneNode(true));  // Clone and append the chat bubble
    document
        .querySelectorAll(".chat-bubble")
        .forEach((bubble) => bubble.remove()); // Remove extra chat bubbles if any
    setOpenStatus(0);
});

function setChatData(from, message, time) {
    try {
        // Retrieve the existing chat data or initialize it if not present
        const existingData = sessionStorage.getItem("chatData");
        const data = existingData ? JSON.parse(existingData) : [];

        // Push the new chat message to the array
        data.push({ from, message, time });

        // Save the updated array back to sessionStorage
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
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesPadded = minutes < 10 ? `0${minutes}` : minutes;

    const strTime = `${hours}:${minutesPadded} ${ampm}`;
    return strTime;
}

const anchorify = (text) => {
    // Regex to match fully qualified URLs
    const fullUrlRegex =
        /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
    const textWithLinks = text.replace(
        fullUrlRegex,
        "<a href='$1' target='_blank'>$1</a>"
    );

    // Regex to match "www." links without protocols
    const wwwRegex = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    return textWithLinks.replace(
        wwwRegex,
        '$1<a target="_blank" href="http://$2">$2</a>'
    );
};

const removeLink = (text) => {
    // Regular expression to match URLs
    const urlRegex =
        /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

    // Optional: Log matched URLs for debugging
    const matchedUrls = text.match(urlRegex);
    console.log("Matched URLs:", matchedUrls ? matchedUrls.join(", ") : "None");

    // Replace found URLs with an empty string
    return text.replace(urlRegex, "");
};

const chatBubble = `<div class="chat d-flex chat-bubble"><div class="chat-img"><img src="https://cybernauts.online/haqam/assets/images/bot2.png"></div><div class="chat-bubble msg">
<div class="typing">
  <div class="dot"></div>
  <div class="dot"></div>
  <div class="dot"></div>
</div>
</div>
</div>`;

document.addEventListener("DOMContentLoaded", function() {
    // Append initial chat messages and bubbles
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

    // Remove chat bubble after 1 second
    setTimeout(() => {
        const bubbles = document.querySelectorAll(".chat-bubble");
        bubbles.forEach((bubble) => bubble.remove());
    }, 1000);

    // Manage chat display based on session status
    const openStatus = sessionStorage.getItem("openStatus");
    const cb = document.getElementById("cb");
    const fab = document.getElementById("fab");

    if (openStatus === "1") {
        cb.style.display = "block";
        fab.style.display = "none";
    } else {
        cb.style.display = "none";
        fab.style.display = "block";
    }

    // Handle historical chat data
    const contextData = sessionStorage.getItem("context");
    if (contextData) {
        const data = JSON.parse(contextData);
        console.log("Data:", data);

        // data.forEach((entry) => {
        //     if (!entry.isBot) {
        //         userResponse(entry.message, 0);
        //     } else {
        //         apiResponse(entry.message, 0);
        //     }
        // });

        data.forEach(({ isBot, message }) => {
            if (!isBot) return userResponse(message, 0);

            let val = message;
            // Attempt to parse only if it's a string
            if (typeof val === 'string') try { val = JSON.parse(val); } catch {}

            // Use the parsed object if valid, otherwise wrap the original message safely
            apiResponse(val?.response ? val : { response: message, memory: [], params: {} }, 0);
        });
        // Scroll to the bottom of the chat container
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } else {
        sessionStorage.setItem("context", "[]");
        sessionStorage.setItem("openStatus", "0");
    }
});

// function userResponse(message, via) {
//     const chatContainer = document.getElementById('chatContainer');
//     chatContainer.innerHTML += `<div class="user-chat"><p class='user-msg'>${message}</p></div>`;
//     if (via !== 0) {
//         contextMessage(message, 2);
//     }
// }

// function apiResponse(message, via) {
//     const chatContainer = document.getElementById('chatContainer');
//     chatContainer.innerHTML += `<div class="chat"><p class='msg'>${message}</p></div>`;
//     if (via !== 0) {
//         contextMessage(message, 1);
//     }
// }

// function contextMessage(msg, type) {
//     let context = sessionStorage.getItem('context');
//     context = context ? JSON.parse(context) : [];
//     context.push({ message: msg, type });
//     sessionStorage.setItem('context', JSON.stringify(context));
// }

document.addEventListener("DOMContentLoaded", function() {
    const sendButton = document.getElementById("sendButton");
    const searchBox = document.getElementById("searchBox");

    sendButton.addEventListener("click", function() {
        if (searchBox.value.trim() !== "") {
            chatSend();
        }
    });
});

document.addEventListener("DOMContentLoaded", function() {
    const searchBox = document.getElementById("searchBox");

    searchBox.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            if (searchBox.value.trim() !== "") {
                chatSend();
                event.preventDefault();
            }
        }
    });
});

document.addEventListener("DOMContentLoaded", function() {
    const searchBox = document.getElementById("searchBox");
    searchBox.disabled = false; // This enables the input box if it was previously disabled
});


function getCitations(data, scope, state) {
    const actIds = new Set();
    const actIdToNameMap = {};
    const actIdToComplianceIdMap = {};

    data.forEach(obj => {
        const actId = obj.act_id || obj.actId;

        if(scope.toLowerCase()==="central" || (state && obj.state.toLowerCase()===state.toLowerCase())){ //so that to ensure citation opens up correct act only (based on scope & state)
            
            actIds.add(actId);
        }

        actIdToNameMap[actId] = obj.actName;

        if (obj.complianceId) {
            if (!actIdToComplianceIdMap[actId]) {
                actIdToComplianceIdMap[actId] = [];
            }
            actIdToComplianceIdMap[actId].push(obj.complianceId);
        }
    });

    let html = '<div>';
    Array.from(actIds).forEach((actId, index) => {
        const name = actIdToNameMap[actId];
        const complianceIds = actIdToComplianceIdMap[actId];
        const complianceText = complianceIds ? complianceIds.join(" ,") : (index + 1);

        html += `<a style="margin-left:3px;" target="_blank" href="https://lexbuddy.com/lexbuddylibrary/lexbuddydetails?adv_search=&scope=${scope}&state=${state || ""}&multi_state=&laws=&key_checkbox=&act_list_name=${encodeURIComponent(name)}&act_list=${actId}&Next=Submit">ref - ${complianceText}</a>`;
    });
    html += '</div>';

    return html;
}


// function chatSend(msg = "", id = "", type = "") {
//     // caseNumberFlag++;

//     const searchBox = document.getElementById("searchBox");
//     const searchButton = document.getElementById("sendButton");
//     searchBox.disabled = true;
//     searchButton.disabled = true;

//     let chatVal = searchBox.value.trim() !== "" ? searchBox.value.trim() : msg;

//     // Display user chat
//     userResponse(chatVal);
//     fetch(`https://ai.nextclm.in/${window.location.pathname.includes("lexChat2") ? "cb1" :"cb"}/api/chat`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//                 message: chatVal,
//                 state: sessionStorage.getItem("state"),
//                 actId: type === "act" ? id : null,
//                 complianceId: type === "compliance" ? id : null
//             }),
//         })
//         .then((response) => response.json())
//         .then((data) => {
//             document.querySelector(".chat-bubble").remove();
//             searchBox.disabled = false;
//             searchButton.disabled = false;

//             console.log("data from api =>",data);
//             // Populate chat response
//             apiResponse(data);
//             document.querySelector("#searchBox").focus();

//         })
//         .catch((error) => {
//             console.error("Error:", error);
//             alert("Upload Failed");
//         });
// }

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

//chat

// function chatSend(msg = "") {
//     const searchBox = document.getElementById("searchBox");
//     const searchButton = document.getElementById("sendButton");
//     const modeSelector = document.getElementById("modeSelector"); 
    
//     searchBox.disabled = true;
//     searchButton.disabled = true;

//     let chatVal = searchBox.value.trim() !== "" ? searchBox.value.trim() : msg;
//     if (!chatVal) {
//         searchBox.disabled = false;
//         searchButton.disabled = false;
//         return;
//     }

//     // Display user message
//     userResponse(chatVal);

//     // Prepare Payload
//     const payload = {
//         message: chatVal,
//         sessionId: getSessionId(),
//         mode: modeSelector.value 
//     };

//     fetch(`https://ai.nextclm.in/${window.location.pathname.includes("lexChat2") ? "cb1" :"cb"}/api/chat`, { 
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(payload),
//         })
//         .then((response) => {
//             if (!response.ok) {
//                 throw new Error(`Server Error: ${response.statusText}`);
//             }
//             return response.json();
//         })
//         .then((data) => {
//             // Remove loading bubble
//             const loadingBubble = document.querySelector(".chat-bubble");
//             if(loadingBubble) loadingBubble.remove();
            
//             searchBox.disabled = false;
//             searchButton.disabled = false;

//             console.log("Backend Response:", data);

//             // backend returns { response: "...", sessionId: "..." }
//             if (data.response) {
//                 const formattedData = {
//                     response: data.response,
//                     memory: [], // Add dummy memory if your frontend logic relies on it
//                     params: { mode: payload.mode }
//                 };
//                 apiResponse(formattedData);
//             } else {
//                 console.error("Unexpected response format");
//             }

//             document.querySelector("#searchBox").focus();
//         })
//         .catch((error) => {
//             console.error("Error:", error);
//             const loadingBubble = document.querySelector(".chat-bubble");
//             if(loadingBubble) loadingBubble.remove();
            
//             searchBox.disabled = false;
//             searchButton.disabled = false;
            
//             // Show error in chat
//             const chatContainer = document.getElementById("chatContainer");
//             chatContainer.innerHTML += `<div class="chat"><div class="msg" style="color:red">Error: Could not connect to server. Ensure backend is running on port 3000.</div></div>`;
//         });
// }

//chat/stream

async function chatSend(msg = "") {
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

    // contextMessage(chatVal, 2); // 2 = user

    userResponse(chatVal);

    const payload = {
        message: chatVal,
        sessionId: getSessionId(),
        mode: modeSelector.value
    };

    // const baseUrl = `https://ai.nextclm.in/${window.location.pathname.includes("lexChat2") ? "cb1" : "cb"}`;
    // const streamUrl = `${baseUrl}/api/chat/stream`;
    const streamUrl = "http://localhost:3000/api/chat/stream"

    try {
        const response = await fetch(streamUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

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

            // SSE events are separated by double newline \n\n
            const lines = buffer.split("\n\n");
            
            // Keep the last partial line in the buffer
            buffer = lines.pop() || ""; 

            for (const line of lines) {
                if (!line.trim()) continue; // Skip empty lines
                
                if (line.startsWith("data: ")) {
                    const jsonStr = line.substring(6).trim(); // Remove "data: " prefix
                    if (jsonStr === "[DONE]") break;

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.type === "token") {
                            accumulatedText += data.content;
                            
                            msgSpan.innerHTML = marked.parse(accumulatedText);
                            chatContainer.scrollTop = chatContainer.scrollHeight;

                        } else if (data.type === "done") {
                            if (cursorSpan) cursorSpan.remove();

                            // contextMessage(accumulatedText, 1); // 1 = bot

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

        chatContainer.innerHTML += `<div class="chat"><div class="msg" style="color:red">Connection interrupted. Please try again.</div></div>`;
        searchBox.disabled = false;
        searchButton.disabled = false;
    }
}

const userResponse = (chatVal, via = "") => {
    const searchBox = document.getElementById("searchBox");
    const chatContainer = document.getElementById("chatContainer");

    // Clear the search box input
    searchBox.value = "";

    console.log(chatVal);

    // Create a new div element for user chat
    const userChatDiv = document.createElement("div");
    userChatDiv.className = "user-chat";
    userChatDiv.innerHTML = `<p class='user-msg'>${chatVal}</p>`;

    // Append the new chat to the chat container
    chatContainer.appendChild(userChatDiv);

    // Append the chat bubble for visual effect
    chatContainer.insertAdjacentHTML("beforeend", chatBubble);

    // Scroll to the bottom of the chat container
    chatContainer.scrollTop = chatContainer.scrollHeight;

    console.log("Respvia:", via);

    // Optionally, handle additional logic based on 'via' parameter
    if (via !== 0) {
        contextMessage(chatVal, 2);
    }
};

const apiResponse = (chatResponse, via) => {
    const chatContainer = document.getElementById("chatContainer");

    // console.log("chat response =>", chatResponse);
    const responseBot = chatResponse.response;

    console.log("response =>", responseBot);
    if (via !== 0) {
        contextMessage(chatResponse, 1);
    }

    //storing state
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
        
        ${answerDiv}.
        ${chatResponse.params.scopes && chatResponse.params.scopes.length <=1 && !chatResponse.params.isOffTopic ? getCitations(chatResponse.params.data,chatResponse.params.geographyType || "central",chatResponse.params.state) :""}
    </p>
    `;

    chatDiv += `</div></div>`;
    chatContainer.insertAdjacentHTML("beforeend", chatDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;
    //checking if multiple acts/compliances are to be chosen
    if (chatResponse.params.requestType === "list_request" && chatResponse.params.tool.dataType==="act" && chatResponse.params.data.length > 1) {
        
        const totalActs = chatResponse.params.data;
        let dataOffset = 0;
        const maxPerPage = 4;

        const container = document.querySelector("#stepZeroSuggestions");

        const renderActs = () => {
            let html = "";

            const end = Math.min(dataOffset + maxPerPage, totalActs.length);
            for (let i = dataOffset; i < end; i++) {
                const act = totalActs[i];
                html += `
          <div class='suggestion-div'>
            <button class="genral-details" data-type="act" data-value="${btoa(act.actId)}">${act.name}</button>
          </div>`;
            }

            if(dataOffset == 0){
                html += `<a class="initial-state-suggestion-viewmore " data-value="viewMore">View more</a>`
                container.innerHTML=html;
            }else{
                container.innerHTML+=html;
            }
            
            dataOffset = end;

            

            // Show or hide the view more button
            if (dataOffset >= totalActs.length) {
                document.querySelector(".initial-state-suggestion-viewmore").style.display="none";
            } else {
                document.querySelector(".initial-state-suggestion-viewmore").style.display="block";
            }
        };

        renderActs();

        container.style.display = "flex";
        document.querySelector("#selectionType").textContent = "Act";
        document.querySelector("#draggable").click();

        document.querySelector(".initial-state-suggestion-viewmore").addEventListener("click", () => {
            renderActs();
        });


        document.querySelector("#stepZeroSuggestions").addEventListener("click", botOptionsClick);


        return;
    } else if (chatResponse.params.requestType === "list_request" && chatResponse.params.tool.dataType==="compliance" && chatResponse.params.data.length > 1) {


        const totalCompliances = chatResponse.params.data;
        let dataOffset = 0;
        const maxPerPage = 4;

        const container = document.querySelector("#stepZeroSuggestions");

        const renderCompliances = () => {
            let html = "";

            const end = Math.min(dataOffset + maxPerPage, totalCompliances.length);
            for (let i = dataOffset; i < end; i++) {
                const compliance = totalCompliances[i];
                html += `
            <div class='suggestion-div'>
              <button class="genral-details" data-type="compliance" data-value="${btoa(compliance.complianceId)}">${compliance.application.slice(0,40)}...</button>
            </div>`;
            }

            if(dataOffset == 0){
                html += `<a class="initial-state-suggestion-viewmore " data-value="viewMore">View more</a>`
                container.innerHTML=html;
            }else{
                container.innerHTML+=html;
            }
            dataOffset = end;

             // Show or hide the view more button
             if (dataOffset >= totalCompliances.length) {
                document.querySelector(".initial-state-suggestion-viewmore").style.display="none";
            } else {
                document.querySelector(".initial-state-suggestion-viewmore").style.display="block";
            }

          
        };


        renderCompliances();

        container.style.display = "flex";
        document.querySelector("#selectionType").textContent = "Compliance";
        document.querySelector("#draggable").click();

        document.querySelector(".initial-state-suggestion-viewmore").addEventListener("click", () => {
            renderCompliances();
        });


        document.querySelector("#stepZeroSuggestions").addEventListener("click", botOptionsClick);

        return;


    }
   
};

const isValidURL = (url) => {
    const pattern = new RegExp(
        "^(https?:\\/\\/)?" + // protocol
        "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name and extension
        "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
        "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
        "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
        "(\\#[-a-z\\d_]*)?$",
        "i"
    ); // fragment locator
    return !!pattern.test(url) && url !== null && url !== "N/A" && url !== "";
};

// const formatText = (input) => {
//     return input
//         .replace(/\n/g, "<br>") // Replace newlines with <br>
//         .replace(/###(.*?)###/g, "<em>$1</em>") // Replace ###text### with <em>text</em>
//         .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Replace **text** with <strong>text</strong>
// };

const formatText = (input) => {
    return md.render(input);
};


document.addEventListener("DOMContentLoaded", function() {
    // Get all elements with specified IDs and convert NodeList to array for easier handling.
    const suggestions = ["#suggestion-1", "#suggestion-2", "#suggestion-3"].map(
        (id) => document.querySelector(id)
    );

    // Add click event listeners to each suggestion element.
    suggestions.forEach(function(suggestion) {
        suggestion.addEventListener("click", function() {
            // Hide all elements with the 'suggestions' class.
            document.querySelectorAll(".suggestions").forEach(function(el) {
                el.style.display = "none";
            });

            // Retrieve the text within the <h5> element of the clicked suggestion.
            let text = this.querySelector("h5").textContent;

            // Send the retrieved text to the chat handling function.
            chatSend(text);
        });
    });
});

// const contextMessage = (msg, via) => {
//     // Retrieve the 'context' from sessionStorage, or initialize it as an empty array if it doesn't exist
//     let existingContext = JSON.parse(sessionStorage.getItem("context")) || [];

//     // Determine if the message is from the bot based on the 'via' parameter
//     let isBot = via === 1;

//     // Create the new message object
//     let newMessage = {
//         message: msg,
//         isBot: isBot,
//     };

//     // Push the new message to the context array
//     existingContext.push(newMessage);

//     // Update the 'context' in sessionStorage with the modified array
//     sessionStorage.setItem("context", JSON.stringify(existingContext));
// };

// Save message to frontend context
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
        
        // Now valid because messageText is guaranteed to be a string
        console.log(`💾 Saved to UI context: ${isBot ? 'Bot' : 'User'} message (${messageText.substring(0, 30)}...)`);
    } catch (e) {
        console.error("❌ Failed to save context:", e);
    }
};

document.querySelector("#draggable").addEventListener("click", function() {
    const bottomSheet = document.querySelector(".submit-chat");
    const chatContainer = document.getElementById("chatContainer");

    if (!bottomSheet.classList.contains("open")) {
        chatContainer.classList.remove("opened");
    }

    if (bottomSheet.classList.contains("slide-top")) {
        bottomSheet.classList.remove("slide-top");
        bottomSheet.classList.add("slide-bottom");
        bottomSheet.classList.remove("open");
        chatContainer.classList.remove("opened");
    } else {
        bottomSheet.classList.add("slide-top");
        bottomSheet.classList.remove("slide-bottom");
        bottomSheet.classList.add("open");
        chatContainer.classList.add("opened");
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
});



const botOptionsClick = async (e) => {

    try {

        if (e.target && e.target.classList.contains("genral-details")) {
            const id = atob(e.target.getAttribute("data-value"));
            const type = e.target.getAttribute("data-type");
            const name = e.target.textContent.trim();

            console.log("id =>", id);
            document.querySelectorAll(".genral-details").forEach((button) => {
                // button.style.display = "none";
            });


            const container = document.querySelector("#stepZeroSuggestions");
            container.style.display = "none";
            document.querySelector("#draggable").click();

            chatSend(`I want to know more about ${name}`, id, type);
        }

    } catch (err) {

        console.error("act click error : ", err);
    }
}

//session reset 
function clearChatSession() {
    try {
        const sessionId = sessionStorage.getItem("chatSessionId");
        
        // Clear frontend storage
        sessionStorage.removeItem("context");
        sessionStorage.removeItem("chatSessionId");
        sessionStorage.removeItem("openStatus");
        
        // Clear UI
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
        console.log(`⚠️ Backend session '${sessionId}' will remain until server restart`);
        console.log("💡 New session will be created on next message");
        
    } catch (e) {
        console.error("❌ Failed to clear session:", e);
    }
}
window.clearChatSession = clearChatSession;

document.addEventListener("DOMContentLoaded", function() {
    console.log("clearChatSession() - Reset everything");
});