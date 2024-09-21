require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const {
    listFoldersAndSubfolders,
    listFilesInFolder,
    uploadFile,
} = require("./libs/driveFunctions");

const { authorize } = require("./libs/auth");

function getExt(filename) {
    return filename.split(".").pop();
}

// Caminho absoluto para a pasta de uploads
const uploadFolder = path.join(__dirname, "uploads");

// Verifica se a pasta 'uploads' existe; se não, cria a pasta
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
}

// Configura o multer para armazenar arquivos nessa pasta
const upload = multer({ dest: uploadFolder });

// Inicializa o servidor Express
const app = express();

// Ativa o CORS para todas as origens
app.use(cors());

app.post("/upload", upload.single("file"), async (req, res) => {
    const filePath = path.join(uploadFolder, req.file.filename);

    const folderId = req.body.folder;

    const extension = req.body.extension || getExt(req.file.originalname);

    const customName = req.body.customName
        ? req.body.customName + "." + extension
        : req.file.originalname;
    console.log("customName", customName);

    try {
        const authClient = await authorize();
        const response = await uploadFile(
            authClient,
            folderId,
            filePath,
            req.file.originalname,
            customName
        );

        fs.unlinkSync(filePath);
        return res.json(response);
    } catch (error) {
        console.error(error);
        return res.json({ error });
    }
});

app.get("/files", async (req, res) => {
    const folderId = req.query.folder;

    try {
        const authClient = await authorize();
        const response = await listFilesInFolder(authClient, folderId);
        res.json(response);
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});

app.get("/folders", async (req, res) => {
    const folderId = req.query.folder;

    try {
        const authClient = await authorize();
        const response = await listFoldersAndSubfolders(authClient, folderId);
        console.log(JSON.stringify(response, null, 2)); // Exibe o resultado formatado

        res.json(response);
    } catch (error) {
        console.log("error on listing folders", error);
        res.json({ message: "error on listing folders", error });
    }
});

// Middleware ro serve static files in root folder
app.use(express.static(path.join(__dirname, "/")));

// Endpoint for testing
app.get("/ping", (req, res) => {
    res.send("Server is running");
});

// Returns a json for any non specified route.
app.get("*", (req, res) => {
    res.json({ server: "ok" });
    // res.sendFile(path.join(__dirname, "/index.html"));
});

// Starts the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
