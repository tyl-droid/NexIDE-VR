const preview = document.getElementById("preview");
const consoleBox = document.getElementById("consoleBox");
const devOutput = document.getElementById("devOutput");
const projectSelect = document.getElementById("projectSelect");
const fileTree = document.getElementById("fileTree");
const tabs = document.getElementById("tabs");
const overlay = document.getElementById("overlay");
const overlayStatus = document.getElementById("overlayStatus");
const notifications = document.getElementById("notifications");
const languageSelect = document.getElementById("languageSelect");
const extensionsPanel = document.getElementById("extensionsPanel");

let monacoEditor;
let currentProject = "Default Project";
let currentFile = "index.html";
let previewMode = "desktop";
let autoRun = false;
let forcedLanguage = "auto";
let errors = [];

let projects = {
    "Default Project": {
        "index.html": `<h1>Hello Quest 3</h1>
<p>NexIDE VR VS works!</p>
<button onclick="console.log('Button clicked')">Click Me</button>`,
        "style.css": `body {
    font-family: Arial;
    background: #111122;
    color: white;
    padding: 30px;
}`,
        "app.js": `console.log("Preview app loaded");`,
        "README.md": `# NexIDE VR

This file is Markdown.

- Monaco Editor
- Extensions
- Multi-language preview`,
        "config.json": `{
  "name": "NexIDE VR",
  "version": "VS"
}`,
        "main.py": `print("Python preview only for now")`,
        "assets/": "",
        "scripts/": ""
    }
};

const extensions = {
    "HTML Runner": true,
    "CSS Injector": true,
    "JavaScript Runner": true,
    "Markdown Preview": true,
    "JSON Formatter": true,
    "Python Preview": false,
    "Java Preview": false,
    "C# Preview": false,
    "C++ Preview": false,
    "Theme Pack": true,
    "Quest UI Pack": true
};

function getFiles() {
    return projects[currentProject];
}

function getEditorValue() {
    return monacoEditor ? monacoEditor.getValue() : "";
}

function setEditorValue(value) {
    if (monacoEditor) monacoEditor.setValue(value || "");
}

function notify(message, type = "info") {
    const note = document.createElement("div");
    note.className = "notification " + type;
    note.textContent = message;
    notifications.appendChild(note);

    setTimeout(() => note.remove(), 3500);
}

function updateOverlay(message) {
    overlayStatus.textContent = message;
}

function toggleOverlay() {
    overlay.classList.toggle("hidden");
}

function saveAll() {
    localStorage.setItem("nexide-vs", JSON.stringify({
        currentProject,
        currentFile,
        previewMode,
        autoRun,
        forcedLanguage,
        projects
    }));
}

function loadAll() {
    const saved = localStorage.getItem("nexide-vs");
    if (!saved) return;

    const data = JSON.parse(saved);
    currentProject = data.currentProject || currentProject;
    currentFile = data.currentFile || currentFile;
    previewMode = data.previewMode || previewMode;
    autoRun = data.autoRun || false;
    forcedLanguage = data.forcedLanguage || "auto";
    projects = data.projects || projects;
}

function saveCurrentFile() {
    getFiles()[currentFile] = getEditorValue();
    saveAll();
}

function logConsole(message) {
    consoleBox.innerHTML += "\n" + message;
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearConsole() {
    consoleBox.innerHTML = "[SYSTEM] Console cleared.";
    notify("Console cleared");
}

function detectLanguage(fileName) {
    if (forcedLanguage !== "auto") return forcedLanguage;

    if (fileName.endsWith(".html")) return "html";
    if (fileName.endsWith(".css")) return "css";
    if (fileName.endsWith(".js")) return "javascript";
    if (fileName.endsWith(".json")) return "json";
    if (fileName.endsWith(".md")) return "markdown";
    if (fileName.endsWith(".py")) return "python";
    if (fileName.endsWith(".java")) return "java";
    if (fileName.endsWith(".cs")) return "csharp";
    if (fileName.endsWith(".cpp") || fileName.endsWith(".cxx") || fileName.endsWith(".cc")) return "cpp";

    return "plaintext";
}

function applyLanguage() {
    const lang = detectLanguage(currentFile);
    if (monacoEditor) {
        monaco.editor.setModelLanguage(monacoEditor.getModel(), lang);
    }

    document.getElementById("statusLanguage").innerText = "Language: " + lang;
    languageSelect.value = forcedLanguage;
}

function changeLanguage(lang) {
    forcedLanguage = lang;
    applyLanguage();
    saveAll();
    notify("Language set to " + lang);
}

function renderProjects() {
    projectSelect.innerHTML = "";

    Object.keys(projects).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        option.selected = name === currentProject;
        projectSelect.appendChild(option);
    });
}

function renderTree() {
    const files = getFiles();
    fileTree.innerHTML = "";

    Object.keys(files).forEach(name => {
        const item = document.createElement("div");
        item.className = "tree-item";
        item.textContent = name;

        if (name.endsWith("/")) item.classList.add("folder");
        if (name === currentFile) item.classList.add("active");

        item.onclick = () => {
            if (!name.endsWith("/")) loadFile(name);
        };

        fileTree.appendChild(item);
    });
}

function renderTabs() {
    const files = getFiles();
    tabs.innerHTML = "";

    Object.keys(files).forEach(name => {
        if (name.endsWith("/")) return;

        const tab = document.createElement("div");
        tab.className = "tab";
        tab.textContent = name;

        if (name === currentFile) tab.classList.add("active");

        tab.onclick = () => loadFile(name);
        tabs.appendChild(tab);
    });
}

function renderExtensions() {
    extensionsPanel.innerHTML = "";

    Object.keys(extensions).forEach(name => {
        const card = document.createElement("div");
        card.className = "extension-card";
        if (extensions[name]) card.classList.add("active");

        card.textContent = `${extensions[name] ? "✓" : "○"} ${name}`;

        card.onclick = () => {
            extensions[name] = !extensions[name];
            renderExtensions();
            notify(name + ": " + (extensions[name] ? "Enabled" : "Disabled"));
        };

        extensionsPanel.appendChild(card);
    });
}

function updateStatus(text = "Ready") {
    const value = getEditorValue();

    document.getElementById("statusProject").innerText = "Project: " + currentProject;
    document.getElementById("statusFile").innerText = "File: " + currentFile;
    document.getElementById("statusLines").innerText = "Lines: " + value.split("\n").length;
    document.getElementById("statusChars").innerText = "Characters: " + value.length;
    document.getElementById("statusMode").innerText = "Mode: " + previewMode;
    document.getElementById("statusSaved").innerText = text;

    updateOverlay(currentProject + " | " + currentFile + " | " + text);
}

function refreshUI() {
    renderProjects();
    renderTree();
    renderTabs();
    renderExtensions();

    document.getElementById("currentFile").innerText = currentFile;
    setEditorValue(getFiles()[currentFile] || "");

    applyLanguage();
    setPreviewMode(previewMode, false);
    updateStatus();
}

function loadFile(name) {
    saveCurrentFile();
    currentFile = name;
    refreshUI();
    notify("Opened " + name);
}

function switchProject(name) {
    saveCurrentFile();

    currentProject = name;

    const files = getFiles();
    currentFile = files["index.html"] !== undefined ? "index.html" : Object.keys(files).find(f => !f.endsWith("/"));

    refreshUI();
    runProject();

    notify("Switched to " + name);
}

function newProject() {
    const name = prompt("Project name:", "New Project");
    if (!name) return;

    if (projects[name]) {
        notify("Project already exists", "error");
        return;
    }

    projects[name] = {
        "index.html": `<h1>${name}</h1><p>New VS project ready.</p>`,
        "style.css": `body { font-family: Arial; background:#050512; color:white; padding:30px; }`,
        "app.js": `console.log("${name} loaded");`,
        "README.md": `# ${name}`,
        "assets/": "",
        "scripts/": ""
    };

    currentProject = name;
    currentFile = "index.html";

    saveAll();
    refreshUI();
    runProject();
    notify("Project created: " + name);
}

function newFile() {
    const name = prompt("File name:", "new-file.html");
    if (!name) return;

    const files = getFiles();
    if (files[name]) {
        notify("File already exists", "error");
        return;
    }

    files[name] = "";
    currentFile = name;

    saveAll();
    refreshUI();
    notify("File created: " + name);
}

function newFolder() {
    const name = prompt("Folder name:", "folder");
    if (!name) return;

    const folderName = name.endsWith("/") ? name : name + "/";
    const files = getFiles();

    if (files[folderName]) {
        notify("Folder already exists", "error");
        return;
    }

    files[folderName] = "";
    saveAll();
    refreshUI();
    notify("Folder created: " + folderName);
}

function renameItem() {
    const files = getFiles();
    const newName = prompt("Rename:", currentFile);

    if (!newName || files[newName]) {
        notify("Rename cancelled or already exists", "warn");
        return;
    }

    files[newName] = files[currentFile];
    delete files[currentFile];

    currentFile = newName.endsWith("/") ? Object.keys(files).find(f => !f.endsWith("/")) : newName;

    saveAll();
    refreshUI();
    notify("Renamed to " + newName);
}

function deleteItem() {
    const files = getFiles();

    if (Object.keys(files).length <= 1) {
        notify("You need at least one file", "error");
        return;
    }

    if (!confirm("Delete " + currentFile + "?")) return;

    delete files[currentFile];
    currentFile = Object.keys(files).find(f => !f.endsWith("/"));

    saveAll();
    refreshUI();
    runProject();
    notify("Deleted item");
}

function duplicateFile() {
    const files = getFiles();
    if (currentFile.endsWith("/")) return;

    const copyName = currentFile.replace(".", "-copy.");
    if (files[copyName]) {
        notify("Copy already exists", "error");
        return;
    }

    files[copyName] = files[currentFile];
    currentFile = copyName;

    saveAll();
    refreshUI();
    notify("Duplicated as " + copyName);
}

function runProject() {
    saveCurrentFile();
    clearConsole();
    errors = [];

    const files = getFiles();
    const lang = detectLanguage(currentFile);

    if (currentFile.endsWith(".md")) {
        runMarkdown(files[currentFile]);
        return;
    }

    if (currentFile.endsWith(".json")) {
        runJSON(files[currentFile]);
        return;
    }

    if (
        currentFile.endsWith(".py") ||
        currentFile.endsWith(".java") ||
        currentFile.endsWith(".cs") ||
        currentFile.endsWith(".cpp")
    ) {
        runPreviewOnly(lang, files[currentFile]);
        return;
    }

    const html = files["index.html"] || "";
    const css = files["style.css"] || "";
    const js = files["app.js"] || "";

    preview.srcdoc = `
<!DOCTYPE html>
<html>
<head>
<style>${css}</style>
</head>
<body>
${html}
<script>
const oldLog = console.log;
const oldWarn = console.warn;
const oldError = console.error;

console.log = function(msg) {
    parent.postMessage({ type: "log", message: String(msg) }, "*");
    oldLog(msg);
};

console.warn = function(msg) {
    parent.postMessage({ type: "warn", message: String(msg) }, "*");
    oldWarn(msg);
};

console.error = function(msg) {
    parent.postMessage({ type: "error", message: String(msg) }, "*");
    oldError(msg);
};

window.onerror = function(message, source, line) {
    parent.postMessage({ type: "error", message: message + " at line " + line }, "*");
};

try {
${js}
} catch (err) {
    parent.postMessage({ type: "error", message: err.message }, "*");
}
<\/script>
</body>
</html>`;

    logConsole("[SYSTEM] Web preview started.");
    updateStatus("Preview Updated");
    notify("Preview updated");
}

function runMarkdown(markdown) {
    const html = markdown
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^- (.*$)/gim, "<li>$1</li>")
        .replace(/\n/g, "<br>");

    preview.srcdoc = `<body style="font-family:Arial;padding:30px">${html}</body>`;
    logConsole("[MARKDOWN] Preview rendered.");
    notify("Markdown preview rendered");
}

function runJSON(json) {
    try {
        const parsed = JSON.parse(json);
        preview.srcdoc = `<pre style="padding:20px;font-size:16px">${JSON.stringify(parsed, null, 2)}</pre>`;
        logConsole("[JSON] Valid JSON.");
        notify("Valid JSON");
    } catch (err) {
        logConsole("[JSON ERROR] " + err.message);
        notify("JSON error", "error");
    }
}

function runPreviewOnly(lang, code) {
    preview.srcdoc = `
<body style="font-family:Arial;padding:30px">
<h1>${lang.toUpperCase()} Preview</h1>
<p>This language is supported for editing and preview, but execution needs a backend runtime.</p>
<pre>${escapeHTML(code)}</pre>
</body>`;
    logConsole("[RUNTIME] " + lang + " execution requires backend runtime.");
    notify(lang + " preview only", "warn");
}

function escapeHTML(text) {
    return text.replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
}

window.addEventListener("message", event => {
    if (!event.data || !event.data.type) return;

    if (event.data.type === "log") {
        logConsole("[LOG] " + event.data.message);
        notify("Log: " + event.data.message);
    }

    if (event.data.type === "warn") {
        logConsole("[WARN] " + event.data.message);
        notify("Warn: " + event.data.message, "warn");
    }

    if (event.data.type === "error") {
        errors.push(event.data.message);
        logConsole("[ERROR] " + event.data.message);
        notify("Error: " + event.data.message, "error");
    }
});

function autoRunToggle() {
    autoRun = !autoRun;
    saveAll();
    notify("Auto Run: " + (autoRun ? "ON" : "OFF"));
}

function setPreviewMode(mode, announce = true) {
    previewMode = mode;
    preview.classList.remove("mobile", "quest");

    if (mode === "mobile") preview.classList.add("mobile");
    if (mode === "quest") preview.classList.add("quest");

    document.getElementById("statusMode").innerText = "Mode: " + mode;

    if (announce) notify("Preview mode: " + mode);

    saveAll();
}

function fullscreenPreview() {
    if (preview.requestFullscreen) preview.requestFullscreen();
    else notify("Fullscreen unsupported here", "warn");
}

function searchText() {
    const search = prompt("Search:");
    if (!search) return;

    const files = getFiles();
    let results = [];

    Object.keys(files).forEach(file => {
        if (!file.endsWith("/") && files[file].includes(search)) results.push(file);
    });

    notify(results.length ? "Found in: " + results.join(", ") : "Not found", results.length ? "info" : "warn");
    logConsole(results.length ? "[SEARCH] Found in: " + results.join(", ") : "[SEARCH] Not found.");
}

function replaceText() {
    const find = prompt("Find:");
    if (!find) return;

    const replace = prompt("Replace with:");
    if (replace === null) return;

    setEditorValue(getEditorValue().split(find).join(replace));
    saveCurrentFile();
    updateStatus("Replaced");
    notify("Replaced text in " + currentFile);
}

function askNexAI() {
    const ask = prompt("Ask NexAI:");
    if (!ask) return;

    const q = ask.toLowerCase();
    const files = getFiles();

    if (q.includes("login")) {
        files["index.html"] = `<div class="card"><h1>Login</h1><input placeholder="Username"><input type="password" placeholder="Password"><button onclick="console.log('Login clicked')">Login</button></div>`;
        files["style.css"] = `body{background:#050512;color:white;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh}.card{background:#111122;padding:30px;border-radius:12px}input{display:block;margin:10px 0;padding:12px}`;
        files["app.js"] = `console.log("Login page loaded");`;

        currentFile = "index.html";
        refreshUI();
        runProject();
        notify("AI created login page");
        return;
    }

    if (q.includes("python")) {
        files["main.py"] = `print("Hello from NexIDE VR")`;
        currentFile = "main.py";
        refreshUI();
        runProject();
        notify("AI created Python file");
        return;
    }

    if (q.includes("portfolio")) {
        installTemplate("portfolio");
        notify("AI created portfolio");
        return;
    }

    if (q.includes("dashboard")) {
        installTemplate("dashboard");
        notify("AI created dashboard");
        return;
    }

    if (q.includes("explain")) {
        logConsole("[NEXAI] NexIDE supports browser-executable languages now. Python/Java/C#/C++ need a backend runtime later.");
        notify("Explanation sent to console");
        return;
    }

    if (q.includes("fix")) {
        logConsole("[NEXAI] Check missing IDs, unclosed tags, syntax errors, JSON validity, and console errors.");
        notify("Fix advice sent to console");
        return;
    }

    logConsole("[NEXAI] Try: create login page, create portfolio, create dashboard, create python file, explain code, fix code.");
    notify("NexAI response in console");
}

function installTemplate(type) {
    const files = getFiles();

    const templates = {
        portfolio: {
            html: `<h1>My Portfolio</h1><p>Developer | Designer | Creator</p><div class="card">NexIDE VR Project</div>`,
            css: `body{font-family:Arial;background:#050512;color:white;padding:40px}.card{background:#111122;padding:20px;border-radius:10px}`,
            js: `console.log("Portfolio loaded");`
        },
        dashboard: {
            html: `<h1>Dashboard</h1><div class="grid"><div>Users: 1204</div><div>Projects: 32</div><div>Status: Online</div></div>`,
            css: `body{font-family:Arial;background:#050512;color:white;padding:30px}.grid{display:grid;gap:15px}.grid div{background:#111122;padding:20px;border-radius:10px}`,
            js: `console.log("Dashboard loaded");`
        },
        todo: {
            html: `<h1>Todo App</h1><input id="task" placeholder="Task"><button onclick="addTask()">Add</button><ul id="list"></ul>`,
            css: `body{font-family:Arial;background:#050512;color:white;padding:30px}`,
            js: `function addTask(){const li=document.createElement("li");li.textContent=document.getElementById("task").value;document.getElementById("list").appendChild(li);console.log("Task added");}`
        },
        markdown: {
            file: "README.md",
            code: `# NexIDE VR

## Markdown Preview

- Works in browser
- Quest-friendly
- No backend needed`
        },
        json: {
            file: "config.json",
            code: `{
  "project": "NexIDE VR",
  "mode": "browser",
  "quest": true
}`
        },
        python: {
            file: "main.py",
            code: `print("Hello from NexIDE VR")
print("Python execution needs backend later")`
        }
    };

    const t = templates[type];

    if (!t) {
        notify("Template not found", "error");
        return;
    }

    if (t.file) {
        files[t.file] = t.code;
        currentFile = t.file;
    } else {
        files["index.html"] = t.html;
        files["style.css"] = t.css;
        files["app.js"] = t.js;
        currentFile = "index.html";
    }

    refreshUI();
    saveAll();
    runProject();
    notify("Installed template: " + type);
}

function inspectDOM() {
    const html = getFiles()["index.html"] || "";
    const tags = html.match(/<[^/!][^>]*>/g) || [];
    devOutput.innerText = "DOM Tags Found:\n" + tags.join("\n");
    notify("DOM tree updated");
}

function inspectCSS() {
    const css = getFiles()["style.css"] || "";
    const rules = css.match(/{/g) || [];
    devOutput.innerText = "CSS Rules: " + rules.length + "\n\n" + css.slice(0, 700);
    notify("CSS inspected");
}

function storageViewer() {
    devOutput.innerText = "LocalStorage Keys:\n" + Object.keys(localStorage).join("\n");
    notify("Storage viewed");
}

function performanceStats() {
    const files = getFiles();
    let total = 0;

    Object.keys(files).forEach(file => total += files[file].length);

    devOutput.innerText =
        "Performance Stats\nFiles: " + Object.keys(files).length +
        "\nTotal Characters: " + total +
        "\nEstimated Load: Lightweight\nQuest Mode: " + document.body.classList.contains("quest");

    notify("Performance stats updated");
}

function networkInfo() {
    devOutput.innerText =
        "Network Tab\nExternal Requests: Monaco CDN only\nMode: Browser Preview\nQuest Compatible: Yes\nGitHub Pages: Active";
    notify("Network info updated");
}

function errorViewer() {
    devOutput.innerText = errors.length ? "Errors:\n" + errors.join("\n") : "No errors detected.";
    notify(errors.length ? "Errors found" : "No errors");
}

function assetManager() {
    const files = getFiles();
    const assets = Object.keys(files).filter(file => file.startsWith("assets/") && !file.endsWith("/"));

    devOutput.innerText = assets.length
        ? "Assets:\n" + assets.join("\n")
        : "No assets yet. Create files inside assets/ like assets/logo.svg";

    notify("Asset manager opened");
}

function githubPanel() {
    devOutput.innerText =
        "GitHub Integration\nRepo: tyl-droid/NexIDE-VR\nPages: https://tyl-droid.github.io/NexIDE-VR/\nStatus: Manual sync for now";
    notify("GitHub panel opened");
}

function extensionInfo() {
    devOutput.innerText =
        "Extensions\n" + Object.keys(extensions).map(name => `${extensions[name] ? "Enabled" : "Disabled"} - ${name}`).join("\n");
}

function toggleQuestMode() {
    document.body.classList.toggle("quest");
    notify("VR Mode toggled");
}

function toggleTheme() {
    document.body.classList.toggle("light");
    localStorage.setItem("nexide-theme", document.body.classList.contains("light") ? "light" : "dark");
    notify("Theme toggled");
}

function loadTheme() {
    if (localStorage.getItem("nexide-theme") === "light") document.body.classList.add("light");
}

function exportProject() {
    saveCurrentFile();

    const data = JSON.stringify({ project: currentProject, files: getFiles() }, null, 2);
    getFiles()["export.json"] = data;
    currentFile = "export.json";

    refreshUI();
    updateStatus("Exported");
    notify("Export saved to export.json");
}

function importProject() {
    const data = prompt("Paste exported NexIDE JSON:");
    if (!data) return;

    try {
        const imported = JSON.parse(data);

        if (!imported.files) {
            notify("Invalid project format", "error");
            return;
        }

        projects[imported.project || "Imported Project"] = imported.files;
        currentProject = imported.project || "Imported Project";
        currentFile = "index.html";

        saveAll();
        refreshUI();
        runProject();
        notify("Project imported");
    } catch {
        notify("Import failed", "error");
    }
}

function initMonaco() {
    require.config({
        paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs"
        }
    });

    require(["vs/editor/editor.main"], function () {
        monacoEditor = monaco.editor.create(document.getElementById("editor"), {
            value: getFiles()[currentFile] || "",
            language: detectLanguage(currentFile),
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 15,
            wordWrap: "on"
        });

        monacoEditor.onDidChangeModelContent(() => {
            saveCurrentFile();
            updateStatus("Auto Saved");

            if (autoRun) runProject();
        });

        refreshUI();
        runProject();
        notify("Monaco Editor loaded");
    });
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
        .then(() => notify("Offline mode ready"))
        .catch(() => notify("Service worker failed", "warn"));
}

loadAll();
loadTheme();
renderExtensions();
initMonaco();