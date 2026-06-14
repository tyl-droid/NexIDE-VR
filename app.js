const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const consoleBox = document.getElementById("consoleBox");
const devOutput = document.getElementById("devOutput");
const projectSelect = document.getElementById("projectSelect");
const fileTree = document.getElementById("fileTree");
const tabs = document.getElementById("tabs");

let currentProject = "Default Project";
let currentFile = "index.html";
let previewMode = "desktop";
let autoRun = false;
let errors = [];

let projects = {
    "Default Project": {
        "index.html": `<h1>Hello Quest 3</h1>
<p>NexIDE VR Omega works!</p>
<button onclick="console.log('Button clicked')">Click Me</button>`,
        "style.css": `body {
    font-family: Arial;
    background: #111122;
    color: white;
    padding: 30px;
}`,
        "app.js": `console.log("Preview app loaded");`,
        "assets/": "",
        "scripts/": ""
    }
};

function getFiles() {
    return projects[currentProject];
}

function saveAll() {
    localStorage.setItem("nexide-omega", JSON.stringify({
        currentProject,
        currentFile,
        previewMode,
        projects
    }));
}

function loadAll() {
    const saved = localStorage.getItem("nexide-omega");
    if (!saved) return;

    const data = JSON.parse(saved);
    currentProject = data.currentProject || currentProject;
    currentFile = data.currentFile || currentFile;
    previewMode = data.previewMode || previewMode;
    projects = data.projects || projects;
}

function saveCurrentFile() {
    getFiles()[currentFile] = editor.value;
    saveAll();
}

function logConsole(message) {
    consoleBox.innerHTML += "\n" + message;
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearConsole() {
    consoleBox.innerHTML = "[SYSTEM] Console cleared.";
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

        if (name.endsWith("/")) {
            item.classList.add("folder");
        }

        if (name === currentFile) {
            item.classList.add("active");
        }

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

        if (name === currentFile) {
            tab.classList.add("active");
        }

        tab.onclick = () => loadFile(name);
        tabs.appendChild(tab);
    });
}

function updateStatus(text = "Ready") {
    const value = editor.value;

    document.getElementById("statusProject").innerText = "Project: " + currentProject;
    document.getElementById("statusFile").innerText = "File: " + currentFile;
    document.getElementById("statusLines").innerText = "Lines: " + value.split("\n").length;
    document.getElementById("statusChars").innerText = "Characters: " + value.length;
    document.getElementById("statusMode").innerText = "Mode: " + previewMode;
    document.getElementById("statusSaved").innerText = text;
}

function refreshUI() {
    renderProjects();
    renderTree();
    renderTabs();
    document.getElementById("currentFile").innerText = currentFile;
    editor.value = getFiles()[currentFile] || "";
    setPreviewMode(previewMode, false);
    updateStatus();
}

function loadFile(name) {
    saveCurrentFile();
    currentFile = name;
    editor.value = getFiles()[currentFile] || "";
    refreshUI();
}

function switchProject(name) {
    saveCurrentFile();
    currentProject = name;
    const files = getFiles();
    currentFile = files["index.html"] !== undefined ? "index.html" : Object.keys(files).find(f => !f.endsWith("/"));
    refreshUI();
    runPreview();
}

function newProject() {
    const name = prompt("Project name:", "New Project");
    if (!name) return;
    if (projects[name]) return alert("Project already exists.");

    projects[name] = {
        "index.html": `<h1>${name}</h1><p>New project ready.</p>`,
        "style.css": `body { font-family: Arial; background:#050512; color:white; padding:30px; }`,
        "app.js": `console.log("${name} loaded");`,
        "assets/": "",
        "scripts/": ""
    };

    currentProject = name;
    currentFile = "index.html";
    saveAll();
    refreshUI();
    runPreview();
}

function newFile() {
    const name = prompt("File name:", "new-file.html");
    if (!name) return;
    const files = getFiles();
    if (files[name]) return alert("File already exists.");

    files[name] = "";
    currentFile = name;
    saveAll();
    refreshUI();
}

function newFolder() {
    const name = prompt("Folder name:", "folder");
    if (!name) return;

    const folderName = name.endsWith("/") ? name : name + "/";
    const files = getFiles();

    if (files[folderName]) return alert("Folder already exists.");

    files[folderName] = "";
    saveAll();
    refreshUI();
}

function renameItem() {
    const files = getFiles();
    const newName = prompt("Rename:", currentFile);
    if (!newName || files[newName]) return;

    files[newName] = files[currentFile];
    delete files[currentFile];

    currentFile = newName.endsWith("/") ? Object.keys(files).find(f => !f.endsWith("/")) : newName;
    saveAll();
    refreshUI();
}

function deleteItem() {
    const files = getFiles();

    if (Object.keys(files).length <= 1) return alert("You need at least one file.");
    if (!confirm("Delete " + currentFile + "?")) return;

    delete files[currentFile];
    currentFile = Object.keys(files).find(f => !f.endsWith("/"));

    saveAll();
    refreshUI();
    runPreview();
}

function duplicateFile() {
    const files = getFiles();
    if (currentFile.endsWith("/")) return;

    const copyName = currentFile.replace(".", "-copy.");
    if (files[copyName]) return alert("Copy already exists.");

    files[copyName] = files[currentFile];
    currentFile = copyName;

    saveAll();
    refreshUI();
}

function runPreview() {
    saveCurrentFile();
    clearConsole();
    errors = [];

    const files = getFiles();
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
console.log = function(msg) {
    parent.postMessage({ type: "log", message: String(msg) }, "*");
    oldLog(msg);
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

    logConsole("[SYSTEM] Preview started.");
    updateStatus("Preview Updated");
}

window.addEventListener("message", event => {
    if (!event.data || !event.data.type) return;

    if (event.data.type === "log") {
        logConsole("[LOG] " + event.data.message);
    }

    if (event.data.type === "error") {
        errors.push(event.data.message);
        logConsole("[ERROR] " + event.data.message);
    }
});

function autoRunToggle() {
    autoRun = !autoRun;
    logConsole("[SYSTEM] Auto Run: " + (autoRun ? "ON" : "OFF"));
}

function setPreviewMode(mode, announce = true) {
    previewMode = mode;
    preview.classList.remove("mobile", "quest");

    if (mode === "mobile") preview.classList.add("mobile");
    if (mode === "quest") preview.classList.add("quest");

    document.getElementById("statusMode").innerText = "Mode: " + mode;

    if (announce) logConsole("[PREVIEW] Mode set to " + mode);
    saveAll();
}

function fullscreenPreview() {
    if (preview.requestFullscreen) {
        preview.requestFullscreen();
    } else {
        alert("Fullscreen not supported here.");
    }
}

function searchText() {
    const search = prompt("Search:");
    if (!search) return;

    const files = getFiles();
    let results = [];

    Object.keys(files).forEach(file => {
        if (!file.endsWith("/") && files[file].includes(search)) results.push(file);
    });

    logConsole(results.length ? "[SEARCH] Found in: " + results.join(", ") : "[SEARCH] Not found.");
}

function replaceText() {
    const find = prompt("Find:");
    if (!find) return;

    const replace = prompt("Replace with:");
    if (replace === null) return;

    editor.value = editor.value.split(find).join(replace);
    saveCurrentFile();
    updateStatus("Replaced");
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
        runPreview();
        return;
    }

    if (q.includes("explain")) {
        logConsole("[NEXAI] index.html is structure, style.css is design, app.js is logic.");
        return;
    }

    if (q.includes("fix")) {
        logConsole("[NEXAI] Check closing tags, missing semicolons, broken IDs, and console errors.");
        return;
    }

    if (q.includes("optimize")) {
        logConsole("[NEXAI] Remove unused CSS, keep JS small, and reduce repeated markup.");
        return;
    }

    logConsole("[NEXAI] Try: create login page, explain code, fix code, optimize code.");
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
        chat: {
            html: `<h1>Chat App</h1><div id="chat"></div><input id="msg"><button onclick="sendMsg()">Send</button>`,
            css: `body{font-family:Arial;background:#050512;color:white;padding:30px}#chat{background:#111122;min-height:150px;padding:10px}`,
            js: `function sendMsg(){chat.innerHTML+="<p>"+msg.value+"</p>";msg.value="";console.log("Message sent");}`
        },
        store: {
            html: `<h1>Storefront</h1><div class="product"><h2>Product</h2><button onclick="console.log('Added to cart')">Add to Cart</button></div>`,
            css: `body{font-family:Arial;background:#050512;color:white;padding:30px}.product{background:#111122;padding:20px;border-radius:10px}`,
            js: `console.log("Store loaded");`
        },
        gameui: {
            html: `<h1>Game UI</h1><p>Health: <span id="hp">100</span></p><button onclick="damage()">Take Damage</button>`,
            css: `body{font-family:Arial;background:#050512;color:white;text-align:center;padding:50px}`,
            js: `let hp=100;function damage(){hp-=10;document.getElementById("hp").textContent=hp;console.log("HP: "+hp);}`
        }
    };

    const t = templates[type];
    files["index.html"] = t.html;
    files["style.css"] = t.css;
    files["app.js"] = t.js;

    currentFile = "index.html";
    refreshUI();
    saveAll();
    runPreview();
}

function inspectDOM() {
    const html = getFiles()["index.html"] || "";
    const tags = html.match(/<[^/!][^>]*>/g) || [];
    devOutput.innerText = "DOM Tags Found:\n" + tags.join("\n");
}

function inspectCSS() {
    const css = getFiles()["style.css"] || "";
    const rules = css.match(/{/g) || [];
    devOutput.innerText = "CSS Rules: " + rules.length + "\n\n" + css.slice(0, 700);
}

function storageViewer() {
    devOutput.innerText = "LocalStorage Keys:\n" + Object.keys(localStorage).join("\n");
}

function performanceStats() {
    const files = getFiles();
    let total = 0;

    Object.keys(files).forEach(file => total += files[file].length);

    devOutput.innerText =
        "Performance Stats\nFiles: " + Object.keys(files).length +
        "\nTotal Characters: " + total +
        "\nEstimated Load: Lightweight";
}

function networkInfo() {
    devOutput.innerText = "Network Tab\nExternal Requests: 0\nMode: Local Preview\nQuest Compatible: Yes";
}

function errorViewer() {
    devOutput.innerText = errors.length ? "Errors:\n" + errors.join("\n") : "No errors detected.";
}

function toggleQuestMode() {
    document.body.classList.toggle("quest");
    logConsole("[QUEST] Quest mode toggled.");
}

function toggleTheme() {
    document.body.classList.toggle("light");
    localStorage.setItem("nexide-theme", document.body.classList.contains("light") ? "light" : "dark");
}

function loadTheme() {
    if (localStorage.getItem("nexide-theme") === "light") {
        document.body.classList.add("light");
    }
}

function exportProject() {
    saveCurrentFile();

    const data = JSON.stringify({
        project: currentProject,
        files: getFiles()
    }, null, 2);

    getFiles()["export.json"] = data;
    currentFile = "export.json";

    refreshUI();
    updateStatus("Exported");
    logConsole("[EXPORT] Project JSON placed in export.json");
}

editor.addEventListener("input", () => {
    saveCurrentFile();
    updateStatus("Auto Saved");
    if (autoRun) runPreview();
});

loadAll();
loadTheme();
refreshUI();
runPreview();