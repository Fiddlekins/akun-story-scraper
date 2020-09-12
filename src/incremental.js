import Akun from 'akun-api';
import Logger from './Logger.js';
import Scraper from './Scraper.js';
import {readOrAskForCredentials} from "./credentials.js";
import IncrementalSaver from "./IncrementalSaver.js";
import StoryList from "./yamlStoryList.js";

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

	const storyList = new StoryList({workDir: outputDirectory});
	const targets = await storyList.read();

	for (const {id, chatMode, downloadImages, author} of targets) {
		try {
			await scraper.archiveStory({
				storyId: id,
				chatMode,
				user: author,
				downloadImages,
				saver: new IncrementalSaver({workDir: outputDirectory})
			});
		} catch (err) {
			logger.error(`Unable to archive story ${id}: ${err}`);
			await scraper.logFatQuest(id);
		}
	}

	logger.log('\n\nFinished archiving!');
}

start().catch(console.error);
