/* 
 example_chat.js
A simple chat example using ollama.js
 
 This script is licensed under the MIT License. 

 by Ingo Sehnbruch, 2024
*/


// speak text
function speak(text) {
    // check if tts is enabled
    if (!document.getElementById("tts").checked) {
        return;
    }
    if (!speechSynthesis) {
        console.log("SpeechSynthesis not supported.");
        return;
    }
    
    // check if speaking
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    // filter out any emoticons and code blocks
    let speech = text //text.replace(/[\uD800-\uDFFF]./g, "")
    speech = speech.replace(/```python[\s\S]*?```/g, "(Python-code attached.)");
    speech = speech.replace(/```[\s\S]*?```/g, "(Code attached.)");

    // filter stuff, like remove "https://" when speaking
    speech = speech.replace(/https:\/\//g, "");
    speech = speech.replace(/http:\/\//g, "");
    speech = speech.replace(/www\./g, "");

    speech = speech.replace(/\*/g, ""); // it reads * as "asterisk"... so remove it..?
    speech = speech.replace(/_/g, " "); // it reads _ as "underscore"... so replace it..?
    
    speech = speech.replace(/`/g, ""); // it reads ` as "backtick"... so remove it..?
    speech = speech.replace(/"/g, ""); // not needed.. we talk.. quotes are not needed..?
        
    speech = speech.trim();
    if (speech.length == 0) {
        return;
    }

    // set voice
    const voiceSelect = document.getElementById('ttsvoice')
    const selectedVoice = voiceSelect.options[voiceSelect.selectedIndex].getAttribute('data-name')
    const voices = window.speechSynthesis.getVoices()
    const ttsvoice = voices.find(voice => voice.name === selectedVoice)
    const ttsrate = parseFloat(document.getElementById("ttsrate").value); // 0.1 - 10
    
    // output speech
    const utterance = new SpeechSynthesisUtterance(speech);
    utterance.voice = ttsvoice;
    utterance.rate = ttsrate;
    speechSynthesis.speak(utterance);

    console.log("Speaking: " + speech);
}

// append message to chat
function appendMessage(content, isUser = true) {
    const messageDiv = document.createElement("div");
    // set style to codeblocks
    messageDiv.className = `message ${isUser ? "user-message" : "assistant-message"}`;
    //messageDiv.innerText = content;

    // now we filter code blocks
    let divcontent = content
    divcontent = divcontent.replace(/\n/g, "<br>");
    const codeBlocks = divcontent.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
        for (const codeBlock of codeBlocks) {
            // remove first and last line
            const newblock = codeBlock.split("<br>").slice(1, -1).join("<br>").replace(/<br>/g, "\n");
            divcontent = divcontent.replace(codeBlock, `<pre class="codeblock">${newblock}</pre>`);
                                
        }
    }
    messageDiv.innerHTML = divcontent;

    messageDiv.addEventListener("click", () => {
        speak(content);
    });
    document.getElementById("messages").appendChild(messageDiv);
}

// callback after API call
function llmCallback(reply) {
    // handle msg
    appendMessage(reply, false);
    messages.push({ role: "assistant", content: reply });
    // handle gui
    document.getElementById("processing").classList.add("d-none");
    document.getElementById("btn-generate").disabled = false;
    // tts message
    if (document.getElementById("tts").checked) {
        speak(reply);
    }
}

// do the magic
function generateText() {
    const model = document.getElementById("model").value;
    const prompt = document.getElementById("prompt").value;
    const systemprompt = document.getElementById("systemprompt").value;

    if (!prompt) {
        console.log("No prompt.");
        return;
    }

    // handle gui
    document.getElementById("prompt").value = "";
    document.getElementById("processing").classList.remove("d-none");
    document.getElementById("btn-generate").disabled = true;

    // handle messages
    appendMessage(prompt, true);
    messages.push({ role: "user", content: prompt });

    // prepare call
    const options = {};
    const optionInputs = document.getElementsByClassName("option");
    let value;
    for (const input of optionInputs) {
        if (input.dataset.type === "number") {
            value = parseFloat(input.value);
        } else if (input.dataset.type === "boolean") {
            value = input.value === "true";
        } else if (input.dataset.type === "object") {
            value = JSON.parse(input.value);
        } else if (input.dataset.type === "string") {
            if (input.value.startsWith("[") && input.value.endsWith("]")) {
                value = JSON.parse(input.value);
            } else {
                value = input.value;
            }
        } else {
            value = input.value;
        }
        options[input.name] = value;
    }

    //! call the API
    ollamaAPI.generate(prompt, (response) => {
        llmCallback(response);
    }, { model, options, systemprompt, messages });
}


// clear chat messages (gui and messages array)
function resetChat() {
    document.getElementById("messages").innerHTML = "";
    messages = [];
    if (speechSynthesis) {
        speechSynthesis.cancel();
    }
}


// load models and options on page load
function init_chat() {
    server = readCookie("server");
    document.getElementById("server").value = server;
    document.getElementById("server-setup").value = server;

    // handle gui
    document.getElementById("connected").classList.add("d-none");
    document.getElementById("connection-error").classList.add("d-none");
    document.getElementById("connecting").classList.remove("d-none");            
    document.getElementById("not-connected").classList.remove("d-none");            

    // Load & handle models
    const modelSelect = document.getElementById("model");
    
    ollamaAPI.getModels((models) => {
        if (!models || models.length === 0) {
            console.log("No models found.");
            document.getElementById("connecting").classList.add("d-none");
            document.getElementById("connection-error").classList.remove("d-none");
        } else {
            console.log("Models loaded.");
            document.getElementById("not-connected").classList.add("d-none");
            document.getElementById("connected").classList.remove("d-none");
        
            models.sort((a, b) => a.name.localeCompare(b.name));
            models.forEach((model) => {
                const option = document.createElement("option");
                option.value = model.name;
                option.text = model.name;
                modelSelect.appendChild(option);
            });

            // select model
            if (model) {
                try {
                    modelSelect.value = model;
                } catch (e) {
                    model = null;
                }
            } 
            if (!model) {
                model = models[0].value;
                setCookie("model", model, 365);
            }
            modelSelect.dispatchEvent(new Event("change"));
        }
    });            

    // Load & handle options
    const options = OllamaAPI.getDefaultOptions();
    const optionsDiv = document.getElementById("options");

    for (const [key, value] of Object.entries(options)) {
        const row = document.createElement("div");
        row.className = "form-group row mb-2";
        optionsDiv.appendChild(row);

        const col1 = document.createElement("label");
        col1.className = "col-sm-4 col-form-label";
        col1.innerText = key;
        row.appendChild(col1);

        const col2 = document.createElement("div");
        col2.className = "col-sm-8";
        row.appendChild(col2);

        const input = document.createElement("input");
        input.type = "text";
        input.value = value;
        input.name = key;
        input.dataset.type = typeof value;
        input.className = "option form-control";
        col2.appendChild(input);
    }

    // update system prompt info
    if (!systemprompt) {
        systemprompt = "You tell stories about blue robots on Mars";
    } else {
        document.getElementById("systemprompt").value = systemprompt;
    }
    document.getElementById("systemprompt_info").innerText = document.getElementById("systemprompt").value;

    // tts enabled?
    const tts = readCookie("tts");
    console.log("TTS: " + tts);
    if (tts == "false") {
        document.getElementById("tts").checked = false;
    } else {
        document.getElementById("tts").checked = true;
    }
}

// we use cookies to store the settings

// read cookie
function readCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// set cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}


//! Initialize the API for the chat example
        
let server = readCookie("server") || "http://127.0.0.1:11434";
let model = readCookie("model") || null;
let systemprompt = readCookie("systemprompt") || null;

let messages = [];
const ollamaAPI = new OllamaAPI(server);

// set/refresh cookies
setCookie("server", server, 365);
setCookie("model", model, 365);
setCookie("systemprompt", systemprompt, 365);

// listeners...

// enter key in prompt triggers generate
document.getElementById("prompt").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        generateText();
    }
});

// buttons
document.getElementById("btn-generate").addEventListener("click", generateText);
document.getElementById("btn-reset").addEventListener("click", resetChat);

// init chat on connection error (via connect button)
document.getElementById("btn-connect").addEventListener("click", () => {
    init_chat();
});

// update server 
document.getElementById("server").addEventListener("input", () => {
    const val = document.getElementById("server").value;
    ollamaAPI.setServer(val);
    setCookie("server", val, 365);
});
document.getElementById("server-setup").addEventListener("input", () => {
    const val = document.getElementById("server-setup").value;
    ollamaAPI.setServer(val);
    setCookie("server", val, 365);
});

// update systemprompt
document.getElementById("systemprompt").addEventListener("input", () => {
    const val = document.getElementById("systemprompt").value;
    document.getElementById("systemprompt_info").innerText = val;
    setCookie("systemprompt", val, 365);
});

// update model
document.getElementById("model").addEventListener("change", () => {
    const val = document.getElementById("model").value;
    document.getElementById("model_selected").innerText = val;
    setCookie("model", val, 365);
});

// update tts-switch
document.getElementById("tts").addEventListener("change", () => {
    if (document.getElementById("tts").checked) {
        speak("Text-To-Speech enabled.");
    } else {
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
    }
    setCookie("tts", document.getElementById("tts").checked.toString(), 365);
});

// update tts voice
document.getElementById("ttsvoice").addEventListener("change", () => {
    const val = document.getElementById("ttsvoice").value;
    setCookie("ttsvoice", val, 365);
    console.log("TTS Voice: " + val);
});

// update tts rate
document.getElementById("ttsrate").addEventListener("input", () => {
    const val = document.getElementById("ttsrate").value;
    setCookie("ttsrate", val, 365);
});

// for userexperience only ... scroll to settings when settings are shown ... 
document.getElementById("btn-toggleSettings").addEventListener("click", () => {
    if (!document.getElementById("settings").classList.contains("show")) {
        // scroll to bottom after settings are shown
        setTimeout(() => {
            window.scrollTo(0, document.body.scrollHeight);
        }, 300);
    }
});

// using a listener to wait for the voices to be loaded
window.speechSynthesis.onvoiceschanged = function() {
    const ttsvoices = speechSynthesis.getVoices();
    // populate voice select with available voices
    const voiceSelect = document.getElementById('ttsvoice')
    ttsvoices.forEach(voice => {
        const option = document.createElement('option')
        option.textContent = voice.name
        option.setAttribute('data-lang', voice.lang)
        option.setAttribute('data-name', voice.name)
        voiceSelect.appendChild(option)
    })
    // set selected voice
    let selectedVoice = readCookie("ttsvoice", ttsvoices[0].name);
    if (!ttsvoices.find(voice => voice.name === selectedVoice)) {
        selectedVoice = ttsvoices[0].name;
    } else {
        voiceSelect.value = selectedVoice;
    }
    setCookie("ttsvoice", selectedVoice, 365);

    // remove this listener
    window.speechSynthesis.onvoiceschanged = null;
};

