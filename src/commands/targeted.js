import inquirer from "inquirer";
import buildTargetList from "./utils/buildTargetList.js";
import getStoryList from "./utils/getStoryList.js";
import {defaultTargetListPath} from "../paths.js";

export async function targeted(logger, scraper) {
    const {skipChat, useTargetList, downloadImages} = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'skipChat',
            message: 'Skip chat:'
        },
        {
            type: 'confirm',
            name: 'downloadImages',
            message: 'Download images:'
        },
        {
            type: 'confirm',
            name: 'useTargetList',
            message: 'Use a target list to archive specific stories?',
            default: true
        }
    ]);

    let targets;
    if (useTargetList) {
        const {targetListPath} = await inquirer.prompt({
            type: 'input',
            name: 'targetListPath',
            message: 'Target list path:',
            default: defaultTargetListPath
        });
        targets = await buildTargetList(await getStoryList(targetListPath), scraper, logger, skipChat);
    } else {
        const {target} = await inquirer.prompt({
            type: 'input',
            name: 'target',
            message: 'Target story id (first alphanumeric hash segment from story URL):'
        });
        targets = [{
            storyId: target,
            skipChat
        }];
    }

    for (const {storyId, skipChat, user} of targets) {
        try {
            await scraper.archiveStory({storyId, skipChat, user, downloadImages});
        } catch (err) {
            logger.error(`Unable to archive story ${storyId}: ${err}`);
            await scraper.logFatQuest(storyId);
        }
    }
}
