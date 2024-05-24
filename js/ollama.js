/* 
 ollama.js
 A simple (unofficial) wrapper for the Ollama API.
 Check out ollama.com for more information.
 
 This script is licensed under the MIT License. 

 by Ingo Sehnbruch, 2024
*/


class OllamaAPI {
    constructor(server = "http://127.0.0.1:11434") {
        this.server = server;
        this.defaultModelText = "llama2:latest";
        this.defaultModelImage = "llava:latest";
    }

    setServer(server) {
        this.server = server;
    }

    static async imgurl2base64(imgurl) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(imgurl);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    static escapeHTML(html) {
        if (!html) return html;
        return html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    async generate(prompt, callback = null, options = {}) {
        /*  
            Usage: prompt("Once upon a time", function(response) { console.log(response); });
            defaults to: model=llama2, no stream and local server.'

            callback: function to call with the generated text
            prompt: the text to generate from

            Optional parameters:

            messages: an array of messages to generate a chat from
            images: an array of image urls to generate a caption from

            systemprompt: a system prompt to use in addition to the user prompt
            model: the model to use (default: llama2)
            options: an object with options for the model (see below)

            responseOnly: if true, only the response text is returned, if false, the full response data is returned (default: true)
            noHtml: if true, html tags are escaped in the response (default: true) [only active if responseOnly=true]
            
            !!! experimental:
            stream: if true, the api will be used in stream mode (default: false)  
                    -> will result in getting first token only ... then you can call ollama again with the token as prompt ... not really useful^^
        */
        const {
            systemprompt = null,
            messages = [],
            images = [],
            model = null,
            responseOnly = true,
            noHtml = true,
            stream = false
        } = options;

        if (!prompt) {
            console.error("OLLAMA: no prompt provided");
            callback && callback(false);
            return;
        }

        const selectedModel = model || (images.length > 0 ? this.defaultModelImage : this.defaultModelText);
        const data = {
            model: selectedModel,
            stream,
            options: options.options || {},
        };

        // if we have messages, we are in chat mode 
        const chatMode = messages.length > 0;
        const endpoint = chatMode ? "/api/chat" : "/api/generate";

        if (chatMode) {
            // add chat messages with system prompt and user prompt            
            data.messages = [...messages, { role: "user", content: prompt }];
            if (systemprompt) {
                // add system prompt as first message in chat mode
                data.messages.unshift({ role: "system", content: systemprompt });
            }
        } else {
            data.prompt = prompt;
            if (systemprompt) {
                // add system prompt before user prompt in generate mode
                data.prompt = `${systemprompt}\n\n${data.prompt}`;
            }
        }

        // add images as base64 to data
        if (images.length > 0) {
            data.images = await Promise.all(images.map(async (img) => {
                return img.startsWith("data:image") ? img : await OllamaAPI.imgurl2base64(img);
            }));
        }
        
        // send the data to the server
        try {
            const response = await fetch(`${this.server}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (result.error) {
                console.error("OLLAMA DATA ERROR", result.error);
                callback && callback(false);
                return false;
            }

            let responseData = chatMode ? (responseOnly ? result.message.content : result) : (responseOnly ? result.response : result);
            if (noHtml && responseOnly) {
                responseData = OllamaAPI.escapeHTML(responseData);
            }

            callback && callback(responseData);
            return responseData;
        } catch (error) {
            console.error("OLLAMA ERROR", error);
            callback && callback(false);
            return false;
        }
    }

    async getModels(callback) {
        // get the available models from the server
        // (good way to check if the server is running and reachable)
        try {
            const response = await fetch(`${this.server}/api/tags`);
            const data = await response.json();
            callback && callback(data.models);
            return data.models;
        } catch (error) {
            console.log("OLLAMA: NO MODELS LOADED", error);
            callback && callback([]);
            return [];
        }
    }

    static getDefaultOptions() {
        // default options for the API (reduced to a minimum for simplicity)
        // All available options are documented here:
        // https://github.com/ollama/ollama/blob/main/docs/api.md#generate-request-with-options
        return {
            "temperature": 0.8,
            "repeat_penalty": 1.2
        };        
    }
}



