const express = require("express");
const cors = require("cors");
const vm = require("vm");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        name: "NexIDE VR Backend",
        status: "online",
        version: "1.0.0"
    });
});

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        message: "Backend healthy"
    });
});

app.post("/run/javascript", (req, res) => {
    const code = String(req.body.code || "");

    const logs = [];

    const sandbox = {
        console: {
            log: (...args) => logs.push(args.join(" ")),
            warn: (...args) => logs.push("[WARN] " + args.join(" ")),
            error: (...args) => logs.push("[ERROR] " + args.join(" "))
        }
    };

    try {
        vm.createContext(sandbox);

        vm.runInContext(code, sandbox, {
            timeout: 1000
        });

        res.json({
            ok: true,
            language: "javascript",
            logs
        });
    } catch (error) {
        res.json({
            ok: false,
            language: "javascript",
            error: error.message,
            logs
        });
    }
});

app.post("/run/python-preview", (req, res) => {
    const code = String(req.body.code || "");

    res.json({
        ok: true,
        language: "python-preview",
        message: "Python execution is not enabled yet. This endpoint previews code only.",
        output: code
    });
});

app.listen(PORT, () => {
    console.log(`NexIDE VR Backend running on port ${PORT}`);
});