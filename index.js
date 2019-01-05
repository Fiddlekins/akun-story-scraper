const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');
const Akun = require('akun-api');
const Scraper = require('./js/Scraper.js');

async function getCredentials() {
	let credentialsJson;
	try {
		credentialsJson = await fs.readFile('credentials.json', 'utf8');
	} catch (err) {
		// File doesn't exist, move on
		return null;
	}
	let credentials;
	try {
		credentials = JSON.parse(credentialsJson);
	} catch (err) {
		console.log(`credentials.json found but not in valid JSON format`);
		return null;
	}
	if (credentials.username && credentials.password) {
		return credentials;
	} else {
		console.log(`credentials.json found but doesn't contain both username and password values`);
		return null;
	}
}

async function setCredentials(credentials) {
	await fs.writeFile('credentials.json', JSON.stringify(credentials, null, '\t'), 'utf8');
}

async function getStoryList(listPath) {
	let listText;
	try {
		listText = await fs.readFile(listPath, 'utf8');
	} catch (err) {
		throw new Error(`List path does not exist: ${err}`);
	}
	return listText.split('\n').map(val => val.trim()).filter(val => val.length > 0);
}

async function confirmCredentials(akun, credentials) {
	let res;
	try {
		res = await akun.login(credentials.username, credentials.password);
	} catch (err) {
		throw new Error(`Unable to login: ${err}`);
	}
	console.log(`Logged in as ${res['username']}!`);
}

async function start() {
	let credentials = await getCredentials();
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
		hostname: 'fiction.live',
		connection: {
			hostname: 'rt.fiction.live'
		}
	});
	await confirmCredentials(akun, credentials);
	if (!storedCredentialsFound) {
		const { saveCredentials } = await inquirer.prompt({
			type: 'confirm',
			name: 'saveCredentials',
			message: 'Store credentials for next time? (Warning: will be stored in plaintext)'
		});
		if (saveCredentials) {
			await setCredentials(credentials);
		}
	}

	const { mode } = await inquirer.prompt({
		type: 'list',
		name: 'mode',
		message: 'Run in which mode?',
		choices: [
			{
				name: 'Scrape (Archives all stories)',
				value: 'scrape',
				short: 'Scrape'
			},
			{
				name: 'Targeted (Archives specific stories)',
				value: 'targeted',
				short: 'Targeted'
			}
		]
	});

	const { outputDirectory } = await inquirer.prompt({
		type: 'input',
		name: 'outputDirectory',
		message: 'Output directory for archived data:',
		default: path.join(__dirname, `data-${Date.now()}`)
	});

	const scraper = new Scraper({
		akun,
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
}

async function scrape(scraper) {
	const { sortType, startPage, endPage, skipChat, useSkipList } = await inquirer.prompt([
		{
			type: 'list',
			name: 'sortType',
			message: 'Sort type (determines the order to archive quests in):',
			choices: [
				{
					name: 'Ordered by creation date',
					value: Scraper.SORT_MODES.NEW,
					short: 'Creation date'
				},
				{
					name: 'Ordered by last update date',
					value: Scraper.SORT_MODES.UPDATED,
					short: 'Update date'
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
			name: 'useSkipList',
			message: 'Use a skip list to avoid archiving specific stories?',
			default: false
		}
	]);

	let skip = [];
	if (useSkipList) {
		const { skipListPath } = await inquirer.prompt({
			type: 'input',
			name: 'skipListPath',
			message: 'Skip list path:',
			default: path.join(__dirname, 'skiplist.txt')
		});
		skip = await getStoryList(skipListPath);
	}

	await scraper.archiveAllStories({ startPage, endPage, skipChat, sortType, skip });

	console.log('\n\nFinished archiving!');
}

async function targeted(scraper) {
	const { skipChat, useTargetList } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'skipChat',
			message: 'Skip chat:'
		},
		{
			type: 'confirm',
			name: 'useTargetList',
			message: 'Use a target list to archive specific stories?',
			default: true
		}
	]);

	let targets = [];
	if (useTargetList) {
		const { targetListPath } = await inquirer.prompt({
			type: 'input',
			name: 'targetListPath',
			message: 'Target list path:',
			default: path.join(__dirname, 'targetlist.txt')
		});
		targets = await getStoryList(targetListPath);
	} else {
		const { target } = await inquirer.prompt({
			type: 'input',
			name: 'target',
			message: 'Target story id (first alphanumeric hash segment from story URL):'
		});
		targets = [target];
	}

	for (const storyId of targets) {
		try {
			await scraper.archiveStory(storyId, skipChat);
		} catch (err) {
			console.log(`Unable to archive story ${storyId}: ${err}`);
			await scraper.logFatQuest(storyId);
		}
	}

	console.log('\n\nFinished archiving!');
}

start().catch(console.error);
