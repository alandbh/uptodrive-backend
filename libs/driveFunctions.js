const { google } = require("googleapis");

async function listFoldersAndSubfolders(authClient, parentFolderId) {
    const drive = google.drive({ version: "v3", auth: authClient });
    // Lista as pastas de primeiro nível
    const firstLevelFolders = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`, // Filtra apenas pastas
        pageSize: 1000,
        fields: "nextPageToken, files(id, name)", // Campos que você deseja listar
    });

    const foldersAndSubfolders = [];

    // Percorre cada pasta de primeiro nível
    for (const folder of firstLevelFolders.data.files) {
        const subfolderResponse = await drive.files.list({
            q: `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`, // Lista as subpastas
            pageSize: 1000,
            fields: "nextPageToken, files(id, name)", // Campos que você deseja listar
        });

        foldersAndSubfolders.push({
            name: folder.name, // Nome da pasta de primeiro nível
            id: folder.id,
            type: "player",
            subfolders: subfolderResponse.data.files.map((subfolder) => ({
                id: subfolder.id,
                name: subfolder.name,
                type: "journey",
            })),
        });
    }

    return foldersAndSubfolders;
}

module.exports = {
    listFoldersAndSubfolders: listFoldersAndSubfolders,
};
