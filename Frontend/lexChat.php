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
    </style>
    <link rel="stylesheet" href="./bot.css">
</head>

<body style="width: 100vw;height: 100dvh;">
    <h1>LexBuddy Compliance Chatbot</h1>
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
                            <!-- <option value="hybrid" selected>Hybrid</option> -->
                            <option value="vector" selected>Vector</option>
                            <option value="graph">Graph</option>
                        </select>
                    </div>

                </div>
                <img id="cl" src="https://cybernauts.online/haqam/assets/images/close.png" class="close-chat">
            </div>
            <!-- <div class="chat">
                    <div class="chat-img">
                        <img src="assets/images/bot.png">
                    </div>
                    <p class="msg" id="answer-container">
    
    
                    </p>
                </div> -->

            <div class="chat-container">
                <div id="chatContainer"></div>
                <section class="submit-chat">
                    <div class="w-100">
                        <div class="mx-auto mt-8 d-flex justify-center w-100">
                            <button id="draggable">
                                <img src="assets2/images/hr.svg" class="chevron-up" alt="">
                            </button>
                        </div>
                        <div class="w-100 pdng-10" id="headingContainer">
                            <h5>Please select the <span id="selectionType"></span></h5>
                        </div>
                    </div>
                    <div class='suggestions' id="stepZeroSuggestions">
                        <!-- <div>
                            <button class="initial-state-suggestion " data-value="103">Delhi</button>
                        </div>
                        <div>
                            <button class="initial-state-suggestion " data-value="102">Rajasthan</button>
                        </div>
                        <div>
                            <button class="initial-state-suggestion " data-value="101">Maharashtra</button>
                        </div>
                        <div>
                            <button class="initial-state-suggestion " data-value="104">Haryana</button>
                        </div> -->
                        
                        <!-- <a class="initial-state-suggestion-viewmore " data-value="viewMore">View more</a> -->
                    </div>
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
                    <div class="send-mic-btn"><button id="speech" style="display: none;"><img
                                src="https://cybernauts.online/haqam/assets/images/mic.svg" alt=""></button>

                        <button class="d-flex" id="sendButton"><svg width="22" height="20" viewBox="0 0 84 72"
                                fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path id="planeSvg" d="M0.04 72L84 36L0.04 0L0 28L60 36L0 44L0.04 72Z" fill="#434343" />
                            </svg></button>
                    </div>
                </div>
            </section>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="./bot_js.js?version=0.3"></script>
</body>
</html>