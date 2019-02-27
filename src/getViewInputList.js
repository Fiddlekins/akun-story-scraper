const fs = require('fs-extra');
const path = require('path');
const isFolderStoryArchive = require('./isFolderStoryArchive.js');

async function getViewInputList(inputPath) {
	list = [];
	await trawlSubfoldersForArchives(inputPath, list);
	return list;
}

async function trawlSubfoldersForArchives(inputPath, list) {
	if (await isFolderStoryArchive(inputPath)) {
		list.push(inputPath);
	}
	try {
		const files = await fs.readdir(inputPath);
		await Promise.all(files.map(file => trawlSubfoldersForArchives(path.join(inputPath, file), list)));
	} catch (err) {
	}
}

module.exports = getViewInputList;
