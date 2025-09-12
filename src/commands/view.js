import fs from "fs-extra";
import inquirer from "inquirer";
import path from "node:path";
import prettyMs from "pretty-ms";
import getViewInputList from "./utils/getViewInputList.js";
import isFolderStoryArchive from "./utils/isFolderStoryArchive.js";
import {projectRoot} from "../paths.js";
import buildView from "../view/buildView.js";


export async function view(logger) {
    const dataFolder = (await fs.readdir(projectRoot)).filter(file => file.startsWith('data-')).pop();
    const defaultInputPath = dataFolder && path.join(projectRoot, dataFolder);

    const {mode, inputPath, outputType} = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'Run in which mode?',
            choices: [
                {
                    name: 'Multi (Build views for multiple archives)',
                    value: 'multi',
                    short: 'Multi'
                },
                {
                    name: 'Single (Build view for single archive)',
                    value: 'single',
                    short: 'Single'
                }
            ]
        },
        {
            type: 'input',
            name: 'inputPath',
            message: 'Specify input path:',
            default: defaultInputPath
        },
        {
            type: 'list',
            name: 'outputType',
            message: 'Output files where?',
            choices: [
                {
                    name: 'In situ (The new files will be placed in the same folder as the archive files used to generate them)',
                    value: 'insitu',
                    short: 'In situ'
                },
                {
                    name: 'Elsewhere (The new files will be placed in a single folder of your choosing)',
                    value: 'elsewhere',
                    short: 'Elsewhere'
                }
            ]
        }
    ]);
    let outputPath;
    if (outputType === 'elsewhere') {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'outputPath',
                message: 'Specify output path:',
                default: path.join(projectRoot, 'views')
            }
        ]);
        outputPath = answers['outputPath'];
    }
    if (mode === 'single') {
        if (await isFolderStoryArchive(inputPath)) {
            await buildView(inputPath, outputPath);
        } else {
            logger.error('Input path did not recognised as an archive');
        }
    } else {
        const inputPaths = await getViewInputList(inputPath);
        if (inputPaths.length) {
            const timeStart = Date.now();
            logger.log('Detected following archives:');
            inputPaths.forEach(input => logger.log(input));
            for (const input of inputPaths) {
                await buildView(input, outputPath);
            }
            const timeElapsed = Date.now() - timeStart;
            console.log(`Built all views in ${prettyMs(timeElapsed)}`);
        } else {
            logger.error(`Couldn't detect any archives within input path`);
        }
    }

}
