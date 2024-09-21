const { google } = require("googleapis");
const fs = require("fs");

async function listFilesInFolder(authClient, folderId) {
    const drive = google.drive({ version: "v3", auth: authClient });

    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents`, // Query string to list files in folder
            pageSize: 1000,
            fields: "nextPageToken, files(id, name)", // Fields to show in results
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
            return [];
        }
    } catch (error) {
        console.error("Error fetching files:", error.message);
        return error;
    }
}

async function listFoldersAndSubfolders(authClient, parentFolderId) {
    const drive = google.drive({ version: "v3", auth: authClient });
    // List 1st level folders
    const firstLevelFolders = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`, // Query for folders only
        pageSize: 1000,
        fields: "nextPageToken, files(id, name)",
    });

    const foldersAndSubfolders = [];

    for (const folder of firstLevelFolders.data.files) {
        const subfolderResponse = await drive.files.list({
            q: `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`, // Query for subfolders
            pageSize: 1000,
            fields: "nextPageToken, files(id, name)",
        });

        foldersAndSubfolders.push({
            name: folder.name, // Name of the 1st level folder
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

// Send files to Google Drive
async function uploadFile(
    authClient,
    folderId,
    filePath,
    fileName,
    customName
) {
    const drive = google.drive({ version: "v3", auth: authClient });

    const response = await drive.files.create({
        requestBody: {
            name: customName || fileName,
            mimeType: "application/octet-stream",
            parents: [folderId],
        },
        media: {
            body: fs.createReadStream(filePath),
        },
        fields: "id, name",
    });

    // const updatedFileList = await listFiles(authClient);
    return {
        uploadedFile: response.data,
        // updatedFileList,
    };
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
// async function listFiles(authClient) {
//     const drive = google.drive({ version: "v3", auth: authClient });
//     const res = await drive.files.list({
//         fields: "files(id, name)",
//     });
//     const files = res.data.files;
//     if (files.length === 0) {
//         console.log("No files found.");
//         return;
//     }

//     return files;
// }

module.exports = {
    listFilesInFolder: listFilesInFolder,
    listFoldersAndSubfolders: listFoldersAndSubfolders,
    uploadFile: uploadFile,
};
