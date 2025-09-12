import Akun from "akun-api";
import inquirer from "inquirer";
import path from "node:path";
import {confirmCredentials, getCredentials, setCredentials} from "./utils/credentials.js";
import Logger from "../Logger.js";
import {projectRoot} from "../paths.js";
import Scraper from "../scrape/Scraper.js";
import {scrape} from "./scrape.js";
import {targeted} from "./targeted.js";
import {view} from "./view.js";

export async function main() {
    const logger = new Logger();

    const {mode} = await inquirer.prompt({
        type: 'list',
        name: 'mode',
        message: 'Run in which mode?',
        choices: [
            {
                name: 'Targeted (Archives specific stories)',
                value: 'targeted',
                short: 'Targeted'
            },
            {
                name: 'Scrape (Archives all stories)',
                value: 'scrape',
                short: 'Scrape'
            },
            {
                name: 'Build View (Convert archived data into viewable HTML)',
                value: 'view',
                short: 'Build View'
            }
        ]
    });

    if (mode === 'view') {
        await view(logger);
        return;
    }

    let credentials = await getCredentials(logger);
    const storedCredentialsFound = !!credentials;
    if (!storedCredentialsFound) {
        console.log('No stored credentials available, please input account details (recommended to use a new dummy account)');
        credentials = await inquirer.prompt([
            {
                type: 'input',
                name: 'username',
                message: 'Username:'
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password:'
            }
        ]);
    }
    const akun = new Akun({
        hostname: 'fiction.live'
    });
    await confirmCredentials(logger, akun, credentials);
    if (!storedCredentialsFound) {
        const {saveCredentials} = await inquirer.prompt({
            type: 'confirm',
            name: 'saveCredentials',
            message: 'Store credentials for next time? (Warning: will be stored in plaintext)'
        });
        if (saveCredentials) {
            await setCredentials(credentials);
        }
    }

    const {outputDirectory} = await inquirer.prompt({
        type: 'input',
        name: 'outputDirectory',
        message: 'Output directory for archived data:',
        default: path.join(projectRoot, `data-${Date.now()}`)
    });

    const scraper = new Scraper({
        akun,
        logger,
        outputDirectory
    });

    switch (mode) {
        case 'scrape':
            await scrape(scraper);
            break;
        case 'targeted':
            await targeted(logger, scraper);
            break;
        default:
            throw new Error(`Invalid mode '${mode}' specified`);
    }

    logger.log('\n\nFinished archiving!');
}
