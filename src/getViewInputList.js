import fs from 'fs-extra';
import path from 'path';
import isFolderStoryArchive from "./isFolderStoryArchive.js";

export default async function getViewInputList(inputPath) {
	const list = [];
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
