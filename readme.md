# Ollama.js - Local AI Task Outsourcing for Web Projects

### Ollama.js is a lightweight JavaScript wrapper for the Ollama API, designed to facilitate the use of local large language models (LLMs) in web projects.

By leveraging Ollama, developers can offload AI tasks to the **client side**(!), ensuring a scalable and **privacy-conscious**(!) solution.

Ollama itself is easy to install, cross-platform, perfectly well-maintained. It offers a variety of models out of the box. All that for free. Why not use it in your web projects? 

## Features:

- **Local AI Task Processing:** Offload AI tasks to the client side, reducing server load and enhancing privacy.
- **Multiple Models:** Access a wide range of models provided by Ollama.
- **Cross-Platform Compatibility:** Works seamlessly on Windows, macOS, and Linux.
- **Easy Installation and Usage:** Simple setup process with comprehensive documentation (for ollama).
- **Flexible Usage:** Even if it is designed to connect to a local Ollama instance on the client, you can use ollama.js to connect to any other Ollama instance: in your local network or via the web.
- **Tiny:** only 2.23 KB
- **No costs:** As free as it can be!

## Usage

### Basic Usage Example:

```javascript
// Import and initialize the OllamaAPI
const api = new OllamaAPI();

// Generate text
api.generate("Once upon a time", function(response) {
    console.log(response);
});
```

### Advanced Example using Options:

```javascript
const api = new OllamaAPI();
const options = {
    systemprompt: "You are a not-really-funny assistant.",
    messages: [
        { role: "user", content: "Once upon a time..."},
        { role: "assistant", content: "...everything was cheaper."} 
    ],
    model: "llama3:latest",
    responseOnly: true,
    noHtml: true,
    stream: false
};

api.generate("That was bad. Please try again.", function(response) {
    console.log(response);
}, options);
```

## Example Chat Application:

An example chat application is included to demonstrate the use of ollama.js in a project.

It has some nice features like text-to-speech, chat message handling, and dynamic settings adjustment - just to keep it interesting. The ollama part is as easy as the "advanced" example above. 

(check the 'example_chat'-files)

## End credits

### Roadmap

This repo is rather an idea-showcase / get-started-template than a real project. I guess I'll add other examples based on some projects I'm working on. (The chat-example is easy to follow - not the most creative, though.^^)

### Contributing:

As stated above, I'm not sure where this is going from here - but contributions in any form are always welcome!

### License:

This project is licensed under the MIT License. Use as you please; no restrictions, no guarantees.