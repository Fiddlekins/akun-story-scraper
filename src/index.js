import Akun from 'akun-api';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import path from 'path';
import prettyMs from 'pretty-ms';
import {fileURLToPath} from 'url';
import buildTargetList from './buildTargetList.js';
import getStoryList from './getStoryList.js';
import getViewInputList from './getViewInputList.js';
import isFolderStoryArchive from './isFolderStoryArchive.js';
import Logger from './Logger.js';
import Scraper from './Scraper.js';
import buildView from './view/buildView.js';
import {readOrAskForCredentials} from "./credentials.js";

const logger = new Logger();
const projectRoot = path.join(fileURLToPath(import.meta.url), '..', '..');

async function start() {

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
		await view();
		return;
	}

	const akun = new Akun({
		hostname: 'fiction.live'
	});

	await readOrAskForCredentials(akun, logger);

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
			await targeted(scraper);
			break;
		default:
			throw new Error(`Invalid mode '${mode}' specified`);
	}

	logger.log('\n\nFinished archiving!');
}

async function scrape(scraper) {
	const {sortType, startPage, endPage, skipChat, downloadImages, useSkipList} = await inquirer.prompt([
		{
			type: 'list',
			name: 'sortType',
			message: 'Sort type (determines the order to archive quests in):',
			choices: [
				{
					name: 'Sort by the latest activity in the story, including chat posts',
					value: Scraper.SORT_MODES.LATEST,
					short: 'Latest'
				},
				{
					name: 'Sort by the latest posted chapter',
					value: Scraper.SORT_MODES.UPDATED_CHAPTER,
					short: 'UpdatedChapter'
				},
				{
					name: 'Sort by the most commented stories',
					value: Scraper.SORT_MODES.TOP,
					short: 'top'
				},
				{
					name: 'Sort by the story creation time',
					value: Scraper.SORT_MODES.NEW,
					short: 'new'
				}
			]
		},
		{
			type: 'input',
			name: 'startPage',
			message: 'Start page:',
			default: 1
		},
		{
			type: 'input',
			name: 'endPage',
			message: 'End page:',
			default: 1000
		},
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
			name: 'useSkipList',
			message: 'Use a skip list to avoid archiving specific stories?',
			default: false
		}
	]);

	let skip = [];
	if (useSkipList) {
		const {skipListPath} = await inquirer.prompt({
			type: 'input',
			name: 'skipListPath',
			message: 'Skip list path:',
			default: path.join(projectRoot, 'skiplist.txt')
		});
		skip = await getStoryList(skipListPath);
	}

	await scraper.archiveAllStories({startPage, endPage, skipChat, sortType, skip, downloadImages});
}

async function targeted(scraper) {
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
			default: path.join(projectRoot, 'targetlist.txt')
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
			await scraper.archiveStory({storyId, chatMode: skipChat ? 'skip' : 'fetch', user, downloadImages});
		} catch (err) {
			logger.error(`Unable to archive story ${storyId}: ${err}`);
			await scraper.logFatQuest(storyId);
		}
	}
}

async function view() {

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

start().catch(console.error);
