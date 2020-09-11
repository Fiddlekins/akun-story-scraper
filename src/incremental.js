import Akun from 'akun-api';
import Logger from './Logger.js';
import Scraper from './Scraper.js';
import {readOrAskForCredentials} from "./credentials.js";
import IncrementalSaver from "./IncrementalSaver.js";

const logger = new Logger({debug: false});

async function start() {
	const akun = new Akun({
		hostname: 'fiction.live'
	});

	await readOrAskForCredentials(akun, logger);

	const outputDirectory = '.';

	const scraper = new Scraper({
		akun,
		logger,
		outputDirectory
	});

	await targeted(scraper, outputDirectory);

	logger.log('\n\nFinished archiving!');
}

async function targeted(scraper, outputDirectory) {
	const targets = [{
		storyId: 'nGZdw54rui4RWPx68',
		// storyId: 'ezMa9rfweommJRhzt',
	}];

	for (const {storyId, skipChat, user} of targets) {
		try {
			await scraper.archiveStory({
				storyId,
				chatMode: 'fetch',
				// chatMode: 'read',
				user,
				downloadImages: true,
				saver: new IncrementalSaver({workDir: outputDirectory})
			});
		} catch (err) {
			logger.error(`Unable to archive story ${storyId}: ${err}`);
			await scraper.logFatQuest(storyId);
		}
	}
}

start().catch(console.error);
