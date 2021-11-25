import Akun from 'akun-api';
import Logger from './Logger.js';
import Scraper from './Scraper.js';
import {readOrAskForCredentials} from "./credentials.js";
import IncrementalSaver from "./IncrementalSaver.js";
import StoryList from "./yamlStoryList.js";
import clap from 'clap';
import buildView from "./view/buildView.js";

const theCommand = clap.command("incremental")
	.option('-v, --verbose', 'Verbose (debug) output');

async function start() {
	const cli = theCommand.run();

	const logger = new Logger({debug: !!cli.options.verbose});

	const akun = new Akun({
		hostname: 'fiction.live'
	});

	await readOrAskForCredentials(akun, logger);

	const outputDirectory = '.';

	const scraper = new Scraper({
		akun,
		logger,
		outputDirectory,
		waitTime: 1000,
	});

	const storyList = new StoryList({workDir: outputDirectory});
	let targets = await storyList.read();
	const selectedIds = new Set(cli.literalArgs);
	if (selectedIds.size) {
		targets = targets.filter((t) => selectedIds.has(t.id));
	}

	for (const {id, chatMode, downloadImages, author, html} of targets) {
		try {
			const saver = new IncrementalSaver({workDir: outputDirectory});
			await scraper.archiveStory({
				storyId: id,
				chatMode,
				user: author,
				downloadImages,
				saver: saver
			});

			if (html) {
				await buildView(saver.getArchiveDir(), saver.getArchiveDir());
				await buildView(saver.getArchiveDir(), saver.getArchiveDir(), true);
			}
		} catch (err) {
			logger.error(`Unable to archive story ${id}: ${err}`);
			await scraper.logFatQuest(id);
		}
	}

	logger.log('\n\nFinished archiving!');
}

start().catch(console.error);
