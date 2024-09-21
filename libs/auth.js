const { google } = require("googleapis");

const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive",
];

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

module.exports = {
    authorize: authorize,
};
