(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    const DOM = {
        preview: $("preview"),
        consoleBox: $("consoleBox"),
        devOutput: $("devOutput"),
        projectSelect: $("projectSelect"),
        fileTree: $("fileTree"),
        tabs: $("tabs"),
        overlay: $("overlay"),
        overlayStatus: $("overlayStatus"),
        notifications: $("notifications"),
        languageSelect: $("languageSelect"),
        extensionsPanel: $("extensionsPanel"),
        commandPalette: $("commandPalette"),
        commandInput: $("commandInput"),
        commandList: $("commandList"),
        settingsModal: $("settingsModal"),
        settingsProjectName: $("settingsProjectName"),
        settingsPreviewMode: $("settingsPreviewMode"),
        assetUpload: $("assetUpload"),
        assetList: $("assetList"),
        zipImportInput: $("zipImportInput"),
        terminalOutput: $("terminalOutput"),
        terminalInput: $("terminalInput"),
        recentModal: $("recentModal"),
        recentList: $("recentList"),
        snippetModal: $("snippetModal")
    };

    const STORAGE_KEY = "nexide-nexus";
    const SNAPSHOT_KEY = "nexide-nexus-snapshots";
    const RECENT_KEY = "nexide-nexus-recent";

    let editor = null;
    let snapshotTimer = null;

    const state = {
        currentProject: "Default Project",
        currentFile: "index.html",
        previewMode: "desktop",
        forcedLanguage: "auto",
        autoRun: false,
        errors: [],
        projects: {
            "Default Project": {
                "index.html": `<h1>Hello Quest 3</h1>
<p>NexIDE VR Nexus works!</p>
<button onclick="console.log('Button clicked')">Click Me</button>`,
                "style.css": `body {
    font-family: Arial;
    background: #111122;
    color: white;
    padding: 30px;
}`,
                "app.js": `console.log("Preview app loaded");`,
                "README.md": `# NexIDE VR Nexus

Quest-friendly browser IDE with Monaco, recovery, snippets, ZIP export, assets, terminal, and templates.`,
                "config.json": `{
  "name": "NexIDE VR",
  "version": "Nexus"
}`,
                "assets/": "",
                "scripts/": ""
            }
        },
        extensions: {
            "HTML Runner": true,
            "CSS Injector": true,
            "JavaScript Runner": true,
            "Markdown Preview": true,
            "JSON Validator": true,
            "Asset Viewer": true,
            "ZIP Export": true,
            "ZIP Import": true,
            "Quest UI Pack": true,
            "Theme Marketplace": true,
            "Terminal UI": true,
            "Crash Recovery": true,
            "Snippet Manager": true,
            "Recent Projects": true,
            "GitHub Panel": true,
            "Python Preview": false,
            "Java Preview": false,
            "C# Preview": false,
            "C++ Preview": false
        }
    };

    function files() {
        return state.projects[state.currentProject];
    }

    function getValue() {
        return editor ? editor.getValue() : "";
    }

    function setValue(value) {
        if (editor) editor.setValue(value || "");
    }

    function notify(message, type = "info") {
        const note = document.createElement("div");
        note.className = "notification " + type;
        note.textContent = message;
        DOM.notifications.appendChild(note);
        setTimeout(() => note.remove(), 3500);
    }

    function log(message) {
        DOM.consoleBox.innerHTML += "\n" + message;
        DOM.consoleBox.scrollTop = DOM.consoleBox.scrollHeight;
    }

    function terminal(message) {
        DOM.terminalOutput.innerHTML += "\n" + message;
        DOM.terminalOutput.scrollTop = DOM.terminalOutput.scrollHeight;
    }

    function saveAll() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadAll() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
            Object.assign(state, JSON.parse(saved));
        } catch {
            notify("Save data failed to load", "warn");
        }
    }

    function saveCurrentFile() {
        files()[state.currentFile] = getValue();
        saveAll();
    }

    function createAutoSnapshot() {
        if (!state.extensions["Crash Recovery"]) return;

        const snapshots = loadSnapshots();
        snapshots.unshift({
            name: "Auto Snapshot",
            time: new Date().toISOString(),
            project: state.currentProject,
            file: state.currentFile,
            data: JSON.parse(JSON.stringify(state.projects))
        });

        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, 10)));
    }

    function createSnapshot() {
        saveCurrentFile();

        const snapshots = loadSnapshots();
        snapshots.unshift({
            name: prompt("Snapshot name:", "Manual Snapshot") || "Manual Snapshot",
            time: new Date().toISOString(),
            project: state.currentProject,
            file: state.currentFile,
            data: JSON.parse(JSON.stringify(state.projects))
        });

        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, 20)));
        notify("Snapshot created");
    }

    function loadSnapshots() {
        try {
            return JSON.parse(localStorage.getItem(SNAPSHOT_KEY)) || [];
        } catch {
            return [];
        }
    }

    function restoreSnapshot() {
        const snapshots = loadSnapshots();

        if (!snapshots.length) {
            notify("No snapshots found", "warn");
            return;
        }

        const list = snapshots.map((s, i) => `${i}: ${s.name} — ${s.time}`).join("\n");
        const choice = prompt("Restore snapshot number:\n" + list, "0");

        if (choice === null) return;

        const snapshot = snapshots[Number(choice)];

        if (!snapshot) {
            notify("Invalid snapshot", "error");
            return;
        }

        state.projects = snapshot.data;
        state.currentProject = snapshot.project;
        state.currentFile = snapshot.file;

        saveAll();
        refreshUI();
        runProject();

        notify("Snapshot restored");
    }

    function snapshotViewer() {
        const snapshots = loadSnapshots();

        DOM.devOutput.innerText = snapshots.length
            ? snapshots.map((s, i) => `${i}: ${s.name}\n${s.time}\nProject: ${s.project}\n`).join("\n")
            : "No snapshots found.";
    }

    function addRecentProject(name) {
        let recent = [];

        try {
            recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
        } catch {
            recent = [];
        }

        recent = recent.filter(item => item !== name);
        recent.unshift(name);

        localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
    }

    function openRecentProjects() {
        DOM.recentList.innerHTML = "";

        let recent = [];

        try {
            recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
        } catch {
            recent = [];
        }

        if (!recent.length) {
            DOM.recentList.innerHTML = "<div class='recent-item'>No recent projects.</div>";
        }

        recent.forEach(name => {
            const item = document.createElement("div");
            item.className = "recent-item";
            item.textContent = name;
            item.onclick = () => {
                if (state.projects[name]) switchProject(name);
                closeRecentProjects();
            };
            DOM.recentList.appendChild(item);
        });

        DOM.recentModal.classList.remove("hidden");
    }

    function closeRecentProjects() {
        DOM.recentModal.classList.add("hidden");
    }

    function openSnippetManager() {
        DOM.snippetModal.classList.remove("hidden");
    }

    function closeSnippetManager() {
        DOM.snippetModal.classList.add("hidden");
    }

    function insertSavedSnippet(type) {
        const snippets = {
            "html-card": `<div class="card">
    <h2>Card Title</h2>
    <p>Card content here.</p>
</div>`,
            "js-click": `document.querySelector("button").addEventListener("click", () => {
    console.log("Clicked");
});`,
            "css-button": `button {
    background: #22f0d0;
    color: #050512;
    border: none;
    padding: 12px 18px;
    border-radius: 8px;
}`,
            "html-navbar": `<nav>
    <strong>NexIDE</strong>
    <a href="#">Home</a>
    <a href="#">Projects</a>
</nav>`,
            "js-function": `function myFunction() {
    console.log("Function running");
}`
        };

        setValue(getValue() + "\n" + snippets[type]);
        saveCurrentFile();
        closeSnippetManager();
        notify("Snippet inserted");
    }

    function detectLanguage(name = state.currentFile) {
        if (state.forcedLanguage !== "auto") return state.forcedLanguage;
        if (name.endsWith(".html")) return "html";
        if (name.endsWith(".css")) return "css";
        if (name.endsWith(".js")) return "javascript";
        if (name.endsWith(".json")) return "json";
        if (name.endsWith(".md")) return "markdown";
        if (name.endsWith(".py")) return "python";
        if (name.endsWith(".java")) return "java";
        if (name.endsWith(".cs")) return "csharp";
        if (name.endsWith(".cpp") || name.endsWith(".cxx") || name.endsWith(".cc")) return "cpp";
        return "plaintext";
    }

    function applyLanguage() {
        if (!editor || !window.monaco) return;
        const lang = detectLanguage();
        monaco.editor.setModelLanguage(editor.getModel(), lang);
        $("statusLanguage").innerText = "Language: " + lang;
        DOM.languageSelect.value = state.forcedLanguage;
    }

    function updateStatus(text = "Ready") {
        const value = getValue();

        $("statusProject").innerText = "Project: " + state.currentProject;
        $("statusFile").innerText = "File: " + state.currentFile;
        $("statusLanguage").innerText = "Language: " + detectLanguage();
        $("statusLines").innerText = "Lines: " + value.split("\n").length;
        $("statusChars").innerText = "Characters: " + value.length;
        $("statusMode").innerText = "Mode: " + state.previewMode;
        $("statusSaved").innerText = text;

        DOM.overlayStatus.textContent = `${state.currentProject} | ${state.currentFile} | ${text}`;
    }

    function renderProjects() {
        DOM.projectSelect.innerHTML = "";

        Object.keys(state.projects).forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            option.selected = name === state.currentProject;
            DOM.projectSelect.appendChild(option);
        });
    }

    function renderTree() {
        DOM.fileTree.innerHTML = "";

        Object.keys(files()).forEach(name => {
            const item = document.createElement("div");
            item.className = "tree-item";
            item.textContent = name;

            if (name.endsWith("/")) item.classList.add("folder");
            if (name === state.currentFile) item.classList.add("active");

            item.onclick = () => {
                if (!name.endsWith("/")) loadFile(name);
            };

            DOM.fileTree.appendChild(item);
        });
    }

    function renderTabs() {
        DOM.tabs.innerHTML = "";

        Object.keys(files()).forEach(name => {
            if (name.endsWith("/")) return;

            const tab = document.createElement("div");
            tab.className = "tab";
            tab.textContent = name;

            if (name === state.currentFile) tab.classList.add("active");

            tab.onclick = () => loadFile(name);
            DOM.tabs.appendChild(tab);
        });
    }

    function renderExtensions() {
        DOM.extensionsPanel.innerHTML = "";

        Object.keys(state.extensions).forEach(name => {
            const card = document.createElement("div");
            card.className = "extension-card";
            if (state.extensions[name]) card.classList.add("active");
            card.textContent = `${state.extensions[name] ? "✓" : "○"} ${name}`;

            card.onclick = () => {
                state.extensions[name] = !state.extensions[name];
                saveAll();
                renderExtensions();
                notify(`${name}: ${state.extensions[name] ? "Enabled" : "Disabled"}`);
            };

            DOM.extensionsPanel.appendChild(card);
        });
    }

    function renderAssets() {
        DOM.assetList.innerHTML = "";

        Object.keys(files())
            .filter(name => name.startsWith("assets/") && !name.endsWith("/"))
            .forEach(name => {
                const item = document.createElement("div");
                item.className = "asset-item";
                item.textContent = name;

                if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(name)) item.classList.add("image");
                if (/\.(mp3|wav|ogg)$/i.test(name)) item.classList.add("audio");
                if (/\.(mp4|webm)$/i.test(name)) item.classList.add("video");

                item.onclick = () => loadFile(name);
                DOM.assetList.appendChild(item);
            });
    }

    function refreshUI() {
        renderProjects();
        renderTree();
        renderTabs();
        renderExtensions();
        renderAssets();

        $("currentFile").innerText = state.currentFile;
        setValue(files()[state.currentFile] || "");

        applyLanguage();
        setPreviewMode(state.previewMode, false);
        updateStatus();
    }

    function loadFile(name) {
        saveCurrentFile();
        state.currentFile = name;
        refreshUI();
        notify("Opened " + name);
    }

    function switchProject(name) {
        saveCurrentFile();
        state.currentProject = name;

        const projectFiles = files();

        state.currentFile = projectFiles["index.html"] !== undefined
            ? "index.html"
            : Object.keys(projectFiles).find(f => !f.endsWith("/"));

        addRecentProject(name);
        refreshUI();
        runProject();
        notify("Switched project");
    }

    function newProject() {
        const name = prompt("Project name:", "New Project");
        if (!name) return;
        if (state.projects[name]) return notify("Project exists", "error");

        state.projects[name] = {
            "index.html": `<h1>${name}</h1><p>New Nexus project ready.</p>`,
            "style.css": `body { font-family: Arial; background:#050512; color:white; padding:30px; }`,
            "app.js": `console.log("${name} loaded");`,
            "README.md": `# ${name}`,
            "assets/": "",
            "scripts/": ""
        };

        state.currentProject = name;
        state.currentFile = "index.html";
        addRecentProject(name);

        saveAll();
        refreshUI();
        runProject();

        notify("Project created");
    }

    function newFile() {
        const name = prompt("File name:", "new-file.html");
        if (!name) return;
        if (files()[name]) return notify("File exists", "error");

        files()[name] = "";
        state.currentFile = name;

        saveAll();
        refreshUI();

        notify("File created");
    }

    function newFolder() {
        const name = prompt("Folder name:", "folder");
        if (!name) return;

        const folder = name.endsWith("/") ? name : name + "/";
        if (files()[folder]) return notify("Folder exists", "error");

        files()[folder] = "";
        saveAll();
        refreshUI();

        notify("Folder created");
    }

    function renameItem() {
        const newName = prompt("Rename:", state.currentFile);
        if (!newName || files()[newName]) return notify("Rename cancelled", "warn");

        files()[newName] = files()[state.currentFile];
        delete files()[state.currentFile];

        state.currentFile = newName.endsWith("/")
            ? Object.keys(files()).find(f => !f.endsWith("/"))
            : newName;

        saveAll();
        refreshUI();

        notify("Renamed");
    }

    function deleteItem() {
        if (Object.keys(files()).length <= 1) return notify("Need at least one file", "error");
        if (!confirm("Delete " + state.currentFile + "?")) return;

        delete files()[state.currentFile];

        state.currentFile = Object.keys(files()).find(f => !f.endsWith("/"));

        saveAll();
        refreshUI();
        runProject();

        notify("Deleted");
    }

    function duplicateFile() {
        if (state.currentFile.endsWith("/")) return;

        const copyName = state.currentFile.replace(".", "-copy.");

        if (files()[copyName]) return notify("Copy exists", "error");

        files()[copyName] = files()[state.currentFile];
        state.currentFile = copyName;

        saveAll();
        refreshUI();

        notify("Duplicated");
    }

    function clearConsole() {
        DOM.consoleBox.innerHTML = "[SYSTEM] Console cleared.";
    }

    function runProject() {
        saveCurrentFile();
        clearConsole();
        state.errors = [];

        const f = files();

        if (state.currentFile.endsWith(".md")) return runMarkdown(f[state.currentFile]);
        if (state.currentFile.endsWith(".json")) return runJSON(f[state.currentFile]);

        if (/\.(py|java|cs|cpp|cxx|cc)$/i.test(state.currentFile)) {
            return runPreviewOnly(detectLanguage(), f[state.currentFile]);
        }

        const html = f["index.html"] || "";
        const css = f["style.css"] || "";
        const js = f["app.js"] || "";

        DOM.preview.srcdoc = `
<!DOCTYPE html>
<html>
<head><style>${css}</style></head>
<body>
${html}
<script>
const oldLog = console.log;
const oldWarn = console.warn;
const oldError = console.error;

console.log = msg => {
    parent.postMessage({ type: "log", message: String(msg) }, "*");
    oldLog(msg);
};

console.warn = msg => {
    parent.postMessage({ type: "warn", message: String(msg) }, "*");
    oldWarn(msg);
};

console.error = msg => {
    parent.postMessage({ type: "error", message: String(msg) }, "*");
    oldError(msg);
};

window.onerror = (message, source, line) => {
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

        log("[SYSTEM] Web preview started.");
        updateStatus("Preview Updated");
        notify("Preview updated");
    }

    function runMarkdown(markdown = "") {
        const html = markdown
            .replace(/^# (.*$)/gim, "<h1>$1</h1>")
            .replace(/^## (.*$)/gim, "<h2>$1</h2>")
            .replace(/^- (.*$)/gim, "<li>$1</li>")
            .replace(/\n/g, "<br>");

        DOM.preview.srcdoc = `<body style="font-family:Arial;padding:30px">${html}</body>`;
        log("[MARKDOWN] Preview rendered.");
        notify("Markdown preview");
    }

    function runJSON(json = "") {
        try {
            const parsed = JSON.parse(json);
            DOM.preview.srcdoc = `<pre style="padding:20px;font-size:16px">${escapeHTML(JSON.stringify(parsed, null, 2))}</pre>`;
            log("[JSON] Valid JSON.");
            notify("Valid JSON");
        } catch (err) {
            log("[JSON ERROR] " + err.message);
            notify("JSON error", "error");
        }
    }

    function runPreviewOnly(lang, code = "") {
        DOM.preview.srcdoc = `
<body style="font-family:Arial;padding:30px">
<h1>${lang.toUpperCase()} Preview</h1>
<p>Editing supported. Execution needs a backend runtime later.</p>
<pre>${escapeHTML(code)}</pre>
</body>`;
        log("[RUNTIME] " + lang + " execution requires backend.");
        notify(lang + " preview only", "warn");
    }

    function escapeHTML(text = "") {
        return text.replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c]));
    }

    function autoRunToggle() {
        state.autoRun = !state.autoRun;
        saveAll();
        notify("Auto Run: " + (state.autoRun ? "ON" : "OFF"));
    }

    function setPreviewMode(mode, announce = true) {
        state.previewMode = mode;

        DOM.preview.classList.remove("mobile", "quest");

        if (mode === "mobile") DOM.preview.classList.add("mobile");
        if (mode === "quest") DOM.preview.classList.add("quest");

        $("statusMode").innerText = "Mode: " + mode;

        if (announce) notify("Preview mode: " + mode);

        saveAll();
    }

    function fullscreenPreview() {
        if (DOM.preview.requestFullscreen) DOM.preview.requestFullscreen();
        else notify("Fullscreen unsupported", "warn");
    }

    function changeLanguage(lang) {
        state.forcedLanguage = lang;
        applyLanguage();
        saveAll();
        notify("Language: " + lang);
    }

    function projectSearch() {
        const query = prompt("Search project:");
        if (!query) return;

        const results = [];

        Object.keys(files()).forEach(file => {
            if (file.endsWith("/")) return;

            files()[file].split("\n").forEach((line, i) => {
                if (line.includes(query)) {
                    results.push(`${file}:${i + 1} — ${line.trim()}`);
                }
            });
        });

        DOM.devOutput.innerText = results.length
            ? "Search Results:\n\n" + results.join("\n")
            : "No results.";

        notify(results.length ? "Search complete" : "No results", results.length ? "info" : "warn");
    }

    function replaceText() {
        const find = prompt("Find:");
        if (!find) return;

        const replace = prompt("Replace with:");
        if (replace === null) return;

        setValue(getValue().split(find).join(replace));
        saveCurrentFile();
        updateStatus("Replaced");

        notify("Replaced text");
    }

    function installTemplate(type) {
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
                code: `# NexIDE VR\n\n- Markdown preview\n- Quest ready`
            },
            json: {
                file: "config.json",
                code: `{\n  "project": "NexIDE VR",\n  "quest": true\n}`
            },
            python: {
                file: "main.py",
                code: `print("Hello from NexIDE VR")`
            }
        };

        const t = templates[type];
        if (!t) return notify("Template missing", "error");

        if (t.file) {
            files()[t.file] = t.code;
            state.currentFile = t.file;
        } else {
            files()["index.html"] = t.html;
            files()["style.css"] = t.css;
            files()["app.js"] = t.js;
            state.currentFile = "index.html";
        }

        saveAll();
        refreshUI();
        runProject();

        notify("Template installed");
    }

    function askNexAI() {
        const ask = prompt("Ask NexAI:");
        if (!ask) return;

        const q = ask.toLowerCase();

        if (q.includes("login")) {
            files()["index.html"] = `<div class="card"><h1>Login</h1><input placeholder="Username"><input type="password" placeholder="Password"><button onclick="console.log('Login clicked')">Login</button></div>`;
            files()["style.css"] = `body{background:#050512;color:white;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh}.card{background:#111122;padding:30px;border-radius:12px}input{display:block;margin:10px 0;padding:12px}`;
            files()["app.js"] = `console.log("Login page loaded");`;
            state.currentFile = "index.html";
            refreshUI();
            runProject();
            return;
        }

        if (q.includes("portfolio")) return installTemplate("portfolio");
        if (q.includes("dashboard")) return installTemplate("dashboard");
        if (q.includes("python")) return installTemplate("python");

        if (q.includes("explain")) {
            log("[NEXAI] HTML/CSS/JS run in-browser. Python/Java/C#/C++ need a backend runtime later.");
            return notify("Explanation in console");
        }

        if (q.includes("fix")) {
            log("[NEXAI] Check console errors, broken IDs, JSON validity, and missing tags.");
            return notify("Fix tips in console");
        }

        log("[NEXAI] Try: login, portfolio, dashboard, python, explain, fix.");
    }

    function uploadAssets() {
        DOM.assetUpload.click();
    }

    async function handleAssetUpload(event) {
        const uploaded = Array.from(event.target.files || []);

        for (const file of uploaded) {
            const dataUrl = await readFileAsDataURL(file);
            files()["assets/" + file.name] = dataUrl;
        }

        saveAll();
        refreshUI();

        notify("Assets uploaded");
    }

    function readFileAsDataURL(file) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    async function exportZip() {
        if (!window.JSZip) return notify("JSZip missing", "error");

        saveCurrentFile();

        const zip = new JSZip();

        Object.keys(files()).forEach(name => {
            if (!name.endsWith("/")) zip.file(name, files()[name]);
        });

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = state.currentProject.replace(/\s+/g, "-") + ".zip";
        a.click();

        URL.revokeObjectURL(url);

        notify("ZIP exported");
    }

    function importZip() {
        DOM.zipImportInput.click();
    }

    async function handleZipImport(event) {
        if (!window.JSZip) return notify("JSZip missing", "error");

        const file = event.target.files[0];
        if (!file) return;

        const zip = await JSZip.loadAsync(file);
        const importedFiles = {};

        for (const name of Object.keys(zip.files)) {
            if (zip.files[name].dir) {
                importedFiles[name] = "";
            } else {
                importedFiles[name] = await zip.files[name].async("string");
            }
        }

        const projectName = file.name.replace(".zip", "");

        state.projects[projectName] = importedFiles;
        state.currentProject = projectName;
        state.currentFile = importedFiles["index.html"] !== undefined
            ? "index.html"
            : Object.keys(importedFiles)[0];

        saveAll();
        refreshUI();
        runProject();

        notify("ZIP imported");
    }

    function exportProject() {
        saveCurrentFile();

        files()["export.json"] = JSON.stringify({
            project: state.currentProject,
            files: files()
        }, null, 2);

        state.currentFile = "export.json";
        refreshUI();

        notify("JSON exported");
    }

    function importProject() {
        const data = prompt("Paste exported NexIDE JSON:");
        if (!data) return;

        try {
            const imported = JSON.parse(data);
            if (!imported.files) return notify("Invalid format", "error");

            state.projects[imported.project || "Imported Project"] = imported.files;
            state.currentProject = imported.project || "Imported Project";
            state.currentFile = "index.html";

            saveAll();
            refreshUI();
            runProject();

            notify("Project imported");
        } catch {
            notify("Import failed", "error");
        }
    }

    const commandMap = {
        "Run Project": runProject,
        "New File": newFile,
        "New Folder": newFolder,
        "Snapshot": createSnapshot,
        "Restore Snapshot": restoreSnapshot,
        "Recent Projects": openRecentProjects,
        "Snippets": openSnippetManager,
        "Export JSON": exportProject,
        "Export ZIP": exportZip,
        "Import ZIP": importZip,
        "Toggle VR Mode": toggleQuestMode,
        "Toggle Theme": toggleTheme,
        "Open Settings": openProjectSettings,
        "Install Portfolio": () => installTemplate("portfolio"),
        "Install Dashboard": () => installTemplate("dashboard")
    };

    function openCommandPalette() {
        DOM.commandPalette.classList.remove("hidden");
        renderCommands("");
        DOM.commandInput.value = "";
        DOM.commandInput.focus();
    }

    function closeCommandPalette() {
        DOM.commandPalette.classList.add("hidden");
    }

    function renderCommands(filter = "") {
        DOM.commandList.innerHTML = "";

        Object.keys(commandMap)
            .filter(name => name.toLowerCase().includes(filter.toLowerCase()))
            .forEach(name => {
                const item = document.createElement("div");
                item.className = "command-item";
                item.textContent = name;
                item.onclick = () => {
                    commandMap[name]();
                    closeCommandPalette();
                };
                DOM.commandList.appendChild(item);
            });
    }

    function openProjectSettings() {
        DOM.settingsProjectName.value = state.currentProject;
        DOM.settingsPreviewMode.value = state.previewMode;
        DOM.settingsModal.classList.remove("hidden");
    }

    function closeProjectSettings() {
        DOM.settingsModal.classList.add("hidden");
    }

    function saveProjectSettings() {
        const newName = DOM.settingsProjectName.value.trim();

        if (newName && newName !== state.currentProject && !state.projects[newName]) {
            state.projects[newName] = files();
            delete state.projects[state.currentProject];
            state.currentProject = newName;
        }

        setPreviewMode(DOM.settingsPreviewMode.value);
        saveAll();
        refreshUI();
        closeProjectSettings();

        notify("Settings saved");
    }

    function handleTerminalKey(event) {
        if (event.key !== "Enter") return;

        const cmd = DOM.terminalInput.value.trim();
        DOM.terminalInput.value = "";

        runTerminalCommand(cmd);
    }

    function runTerminalCommand(cmd) {
        terminal("> " + cmd);

        const parts = cmd.split(" ");
        const base = parts[0];

        if (base === "help") terminal("Commands: help, ls, cat <file>, run, clear, projects, current, snapshot, restore");
        else if (base === "ls") terminal(Object.keys(files()).join("\n"));
        else if (base === "cat") terminal(files()[parts[1]] || "File not found");
        else if (base === "run") runProject();
        else if (base === "clear") DOM.terminalOutput.innerHTML = "Terminal cleared.";
        else if (base === "projects") terminal(Object.keys(state.projects).join("\n"));
        else if (base === "current") terminal(state.currentProject + " / " + state.currentFile);
        else if (base === "snapshot") createSnapshot();
        else if (base === "restore") restoreSnapshot();
        else terminal("Unknown command. Type help.");
    }

    function setThemePack(theme) {
        document.body.classList.remove("light", "matrix", "cyber");

        if (theme !== "dark") document.body.classList.add(theme);

        localStorage.setItem("nexide-theme-pack", theme);
        notify("Theme: " + theme);
    }

    function loadThemePack() {
        setThemePack(localStorage.getItem("nexide-theme-pack") || "dark");
    }

    function toggleTheme() {
        document.body.classList.contains("light")
            ? setThemePack("dark")
            : setThemePack("light");
    }

    function toggleQuestMode() {
        document.body.classList.toggle("quest");
        notify("VR Mode toggled");
    }

    function toggleOverlay() {
        DOM.overlay.classList.toggle("hidden");
    }

    function inspectDOM() {
        const html = files()["index.html"] || "";
        const tags = html.match(/<[^/!][^>]*>/g) || [];
        DOM.devOutput.innerText = "DOM Tags Found:\n" + tags.join("\n");
    }

    function inspectCSS() {
        const css = files()["style.css"] || "";
        const rules = css.match(/{/g) || [];
        DOM.devOutput.innerText = "CSS Rules: " + rules.length + "\n\n" + css.slice(0, 700);
    }

    function storageViewer() {
        DOM.devOutput.innerText = "LocalStorage Keys:\n" + Object.keys(localStorage).join("\n");
    }

    function performanceStats() {
        let total = 0;

        Object.keys(files()).forEach(file => {
            total += files()[file].length;
        });

        DOM.devOutput.innerText = `Performance Stats
Files: ${Object.keys(files()).length}
Total Characters: ${total}
Estimated Load: Lightweight
Quest Mode: ${document.body.classList.contains("quest")}`;
    }

    function networkInfo() {
        DOM.devOutput.innerText = `Network Tab
External Requests: Monaco CDN + JSZip CDN
Mode: Browser Preview
GitHub Pages: Active
Quest Compatible: Yes`;
    }

    function errorViewer() {
        DOM.devOutput.innerText = state.errors.length
            ? "Errors:\n" + state.errors.join("\n")
            : "No errors detected.";
    }

    function assetManager() {
        const assets = Object.keys(files()).filter(file => file.startsWith("assets/") && !file.endsWith("/"));
        DOM.devOutput.innerText = assets.length ? "Assets:\n" + assets.join("\n") : "No assets yet.";
    }

    function githubPanel() {
        DOM.devOutput.innerText = `GitHub Integration
Repo: tyl-droid/NexIDE-VR
Pages: https://tyl-droid.github.io/NexIDE-VR/
Status: Manual sync for now`;
    }

    function extensionInfo() {
        DOM.devOutput.innerText =
            "Extensions\n" +
            Object.keys(state.extensions)
                .map(name => `${state.extensions[name] ? "Enabled" : "Disabled"} - ${name}`)
                .join("\n");
    }

    window.addEventListener("message", event => {
        if (!event.data || !event.data.type) return;

        if (event.data.type === "log") {
            log("[LOG] " + event.data.message);
        }

        if (event.data.type === "warn") {
            log("[WARN] " + event.data.message);
            notify("Warning: " + event.data.message, "warn");
        }

        if (event.data.type === "error") {
            state.errors.push(event.data.message);
            log("[ERROR] " + event.data.message);
            notify("Error: " + event.data.message, "error");
        }
    });

    function initMonaco() {
        require.config({
            paths: {
                vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.49.0/min/vs"
            }
        });

        require(["vs/editor/editor.main"], () => {
            editor = monaco.editor.create($("editor"), {
                value: files()[state.currentFile] || "",
                language: detectLanguage(),
                theme: "vs-dark",
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 15,
                wordWrap: "on"
            });

            editor.onDidChangeModelContent(() => {
                saveCurrentFile();
                updateStatus("Auto Saved");

                if (state.autoRun) runProject();
            });

            refreshUI();
            runProject();
            notify("Monaco loaded");
        });
    }

    DOM.commandInput.addEventListener("input", () => renderCommands(DOM.commandInput.value));

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => notify("Offline mode ready"))
            .catch(() => notify("Service worker failed", "warn"));
    }

    Object.assign(window, {
        newProject,
        newFile,
        newFolder,
        renameItem,
        deleteItem,
        duplicateFile,
        runProject,
        autoRunToggle,
        projectSearch,
        replaceText,
        askNexAI,
        createSnapshot,
        restoreSnapshot,
        snapshotViewer,
        openRecentProjects,
        closeRecentProjects,
        openSnippetManager,
        closeSnippetManager,
        insertSavedSnippet,
        toggleQuestMode,
        toggleOverlay,
        toggleTheme,
        exportProject,
        importProject,
        exportZip,
        importZip,
        uploadAssets,
        handleAssetUpload,
        handleZipImport,
        openCommandPalette,
        closeCommandPalette,
        openProjectSettings,
        closeProjectSettings,
        saveProjectSettings,
        setPreviewMode,
        fullscreenPreview,
        switchProject,
        changeLanguage,
        installTemplate,
        inspectDOM,
        inspectCSS,
        storageViewer,
        performanceStats,
        networkInfo,
        errorViewer,
        assetManager,
        githubPanel,
        extensionInfo,
        clearConsole,
        handleTerminalKey,
        setThemePack
    });

    loadAll();
    loadThemePack();
    addRecentProject(state.currentProject);
    initMonaco();

    snapshotTimer = setInterval(createAutoSnapshot, 5000);
})();