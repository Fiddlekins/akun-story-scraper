import fs from "fs-extra";
import {credentialsPath} from "../../paths.js";

export async function getCredentials(logger) {
    let credentialsJson;
    try {
        credentialsJson = await fs.readFile(credentialsPath, 'utf8');
    } catch (err) {
        // File doesn't exist, move on
        return null;
    }
    let credentials;
    try {
        credentials = JSON.parse(credentialsJson);
    } catch (err) {
        logger.error(`${credentialsPath} found but not in valid JSON format`);
        return null;
    }
    if (credentials.username && credentials.password) {
        return credentials;
    } else {
        logger.error(`${credentialsPath} found but doesn't contain both username and password values`);
        return null;
    }
}

export async function setCredentials(credentials) {
    await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, '\t'), 'utf8');
}

export async function confirmCredentials(logger, akun, credentials) {
    let res;
    try {
        res = await akun.login(credentials.username, credentials.password);
    } catch (err) {
        throw new Error(`Unable to login: ${err}`);
    }
    logger.log(`Logged in as ${res['username']}!`);
}
