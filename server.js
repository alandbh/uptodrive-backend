require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
var path = require("path");
// import path from "path";
const cors = require("cors");

// Configurações do Google Drive

const FOLDER_ID = process.env.FOLDER_ID;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

/**
 * Authorize with service account and get jwt client
 *
 */
async function authorize() {
    const jwtClient = new google.auth.JWT(
        CLIENT_EMAIL,
        null,
        PRIVATE_KEY,
        SCOPES
    );
    await jwtClient.authorize();
    return jwtClient;
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

    // console.log("CUSTOM", req.body.customName);

    // return;

    authorize()
        .then((authClient) => {
            uploadFile(
                authClient,
                filePath,
                req.file.originalname,
                req.customname
            );
        })
        .catch(console.error);
});

// Exemplo de upload para o Google Drive
async function uploadFile(authClient, filePath, fileName, customName) {
    console.log("FILE_PATH", filePath);
    console.log("FILE_NAME", fileName);
    console.log("CUSTOM", customName);

    const drive = google.drive({ version: "v3", auth: authClient });

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType: "application/octet-stream",
            parents: [FOLDER_ID],
        },
        media: {
            body: fs.createReadStream(filePath),
        },
        fields: "id",
    });

    // Deleta o arquivo temporário após o upload
    fs.unlinkSync(filePath);

    console.log(response.data);
    listFiles(authClient);
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
    const drive = google.drive({ version: "v3", auth: authClient });
    const res = await drive.files.list({
        pageSize: 10,
        fields: "nextPageToken, files(id, name)",
    });
    const files = res.data.files;
    if (files.length === 0) {
        console.log("No files found.");
        return;
    }

    console.log("Files:");
    files.map((file) => {
        console.log(`${file.name} (${file.id})`);
    });
}

// Middleware para servir arquivos estáticos na raiz do projeto
app.use(express.static(path.join(__dirname, "/")));

// Endpoint para testar o servidor
app.get("/ping", (req, res) => {
    res.send("Server is running");
});

// Servir a página principal (index.html) em qualquer rota que não for específica
app.get("*", (req, res) => {
    res.json({ server: "ok" });
    // res.sendFile(path.join(__dirname, "/index.html"));
});

// Inicia o servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
