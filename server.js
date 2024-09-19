require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { google } = require("googleapis");
const fs = require("fs");
var path = require("path");
// import path from "path";
const cors = require("cors");
const getfilelist = require("./getfilelist");

// Configurações do Google Drive

const FOLDER_ID = process.env.FOLDER_ID;
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
];

function getExt(filename) {
    return filename.split(".").pop();
}

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

    const customName =
        req.body.customName + "." + getExt(req.file.originalname);

    authorize()
        .then((authClient) => {
            uploadFile(
                authClient,
                filePath,
                req.file.originalname,
                customName
            ).then((response) => res.json(response));
        })
        .catch(console.error);
});

// Exemplo de upload para o Google Drive
async function uploadFile(authClient, filePath, fileName, customName) {
    const drive = google.drive({ version: "v3", auth: authClient });

    const response = await drive.files.create({
        requestBody: {
            name: customName || fileName,
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

    // console.log(response.data);
    const updatedFileList = await listFiles(authClient);
    return {
        uploadedFile: response.data,
        updatedFileList,
    };
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
    const drive = google.drive({ version: "v3", auth: authClient });
    const res = await drive.files.list({
        pageSize: 1000,
        fields: "nextPageToken, files(id, name)",
    });
    const files = res.data.files;
    if (files.length === 0) {
        console.log("No files found.");
        return;
    }

    return files;
}

app.get("/upload", async (req, res) => {
    // const folderId = "1YEe9xlq56ycrajjPGiQ0Ia68y3e2C6lC";

    const folderId = req.query.folder;

    console.log({ folderId });
    // return;

    try {
        const authClient = await authorize();
        const response = await listFilesInFolder(authClient, folderId);
        res.json(response);
    } catch (error) {
        console.log(error);
        res.json({ error });
    }
});

async function listFilesInFolder(authClient, folderId) {
    // const folderId = "115JMYddkOBmE_yI9iKTu72UIM0A1EuII";

    // const resource = {
    //     auth: authClient,
    //     id: folderId,
    //     fields: "files(name,id)",
    // };

    // getfilelist.GetFileList(resource, function (err, res) {
    //     // or getfilelist.GetFolderTree(resource, function(err, res) {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     }
    //     console.log(res);
    // });

    // return;

    const drive = google.drive({ version: "v3", auth: authClient });

    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents`, // Query para listar os arquivos da pasta
            pageSize: 1000,
            fields: "nextPageToken, files(id, name)", // Campos que você deseja listar
        });

        const files = response.data.files;
        if (files.length) {
            console.log("Files:");
            files.map((file) => {
                console.log(`${file.name} (${file.id})`);
            });
            return files;
        } else {
            console.log("No files found.");
            return { response: "no files found" };
        }
    } catch (error) {
        console.error("Error fetching files:", error.message);
        return error;
    }
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
