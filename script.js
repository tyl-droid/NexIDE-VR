const runBtn = document.getElementById("runBtn");
const topRunBtn = document.getElementById("topRunBtn");
const statusText = document.getElementById("status");
const consoleBox = document.getElementById("console");

function runProject() {
    statusText.textContent = "Status: Running...";
    consoleBox.innerHTML += "<br>> Starting NexIDE VR...";
    consoleBox.innerHTML += "<br>> Loading editor...";
    consoleBox.innerHTML += "<br>> Checking project files...";

    setTimeout(() => {
        consoleBox.innerHTML += "<br>> Build Successful";
        consoleBox.innerHTML += "<br>> No Errors Found";
        consoleBox.innerHTML += "<br>> Ready for Quest Browser";
        statusText.textContent = "Status: Finished";
        consoleBox.scrollTop = consoleBox.scrollHeight;
    }, 1000);
}

runBtn.addEventListener("click", runProject);
topRunBtn.addEventListener("click", runProject);