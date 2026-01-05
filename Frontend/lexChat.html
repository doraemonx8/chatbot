<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lex Chat</title>
    <style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        -webkit-user-select: none;
        scroll-behavior: smooth;
    }
    
    .auth-status {
        position: fixed;
        top: 10px;
        right: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: white;
        padding: 8px 15px;
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
    }
    
    .auth-status span {
        font-size: 12px;
        color: #666;
    }
    
    .logout-btn {
        background: #ff4444;
        color: white;
        border: none;
        padding: 5px 12px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
    }
    
    .logout-btn:hover {
        background: #cc0000;
    }
    </style>
    <link rel="stylesheet" href="./bot.css">
</head>

<body style="width: 100vw;height: 100dvh;">
    <h1>LexBuddy Compliance Chatbot</h1>
    
    <!-- Auth Status Bar -->
    <div class="auth-status" id="authStatus" style="display: none;">
        <span id="userEmail"></span>
        <button class="logout-btn" onclick="logout()">Logout</button>
    </div>
    
    <div id="fab" class="chatbot-Container" style="margin-top: 500px;">
        <div id="chatbot">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
        <div id="chatbot-corner"></div>
        <div id="antenna">
            <div id="beam"></div>
            <div id="beam-pulsar"></div>
        </div>
    </div>

    <div class="chat-bot" id="cb" style="display: none">
        <div class="chat-bot-inner">
            <div class="chat-header">
                <div class="chat-name">
                    <div class="chat-img">
                        <img src="https://cybernauts.online/haqam/assets/images/bot.png">
                    </div>
                    <div class="chat-status">
                        <h4>LexBot</h4>
                        <p>Online</p>
                    </div>

                    <div class="chat-controls">
                        <select id="modeSelector" class="mode-dropdown">
                            <option value="hybrid" selected>Hybrid</option>
                            <option value="vector">Vector</option>
                            <option value="graph">Graph</option>
                        </select>
                    </div>

                </div>
                <img id="cl" src="https://cybernauts.online/haqam/assets/images/close.png" class="close-chat">
            </div>

            <div class="chat-container">
                <div id="chatContainer"></div>
                <section class="submit-chat">
                    <div class="w-100">
                        <div class="mx-auto mt-8 d-flex justify-center w-100">
                            <button id="draggable">
                                <img src="https://cybernauts.online/haqam/assets2/images/hr.svg" class="chevron-up" alt="">
                            </button>
                        </div>
                        <div class="w-100 pdng-10" id="headingContainer">
                            <h5>Please select the <span id="selectionType"></span></h5>
                        </div>
                    </div>
                    <div class='suggestions' id="stepZeroSuggestions"></div>
                </section>
            </div>

            <section class="bottom-chat-container">
                <section class="submit-chat">
                    <div class='suggestions' style="display: none;">
                        <button id='suggestion-1'>
                            <h5>Petitioner's View</h5>
                        </button>
                        <button id='suggestion-2'>
                            <h5>Respondent's View</h5>
                        </button>
                        <button id='suggestion-3'>
                            <h5>Case summary</h5>
                        </button>
                    </div>
                </section>

                <div class="input-feild">
                    <input type="text" placeholder="Type something here" id="searchBox">
                    <div class="send-mic-btn">
                        <button id="speech" style="display: none;">
                            <img src="https://cybernauts.online/haqam/assets/images/mic.svg" alt="">
                        </button>

                        <button class="d-flex" id="sendButton">
                            <svg width="22" height="20" viewBox="0 0 84 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path id="planeSvg" d="M0.04 72L84 36L0.04 0L0 28L60 36L0 44L0.04 72Z" fill="#434343" />
                            </svg>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script>
        // Show auth status if logged in
        document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem('lexbot_auth_token');
            const email = localStorage.getItem('lexbot_user_email');
            
            if (token && email) {
                document.getElementById('authStatus').style.display = 'flex';
                document.getElementById('userEmail').textContent = email;
            }
        });
    </script>
    <script src="./bot_js.js?version=0.4"></script>
</body>
</html>