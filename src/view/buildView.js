import fs from 'fs-extra';

import jsdom from 'jsdom';
import path from 'path';
import prettyMs from 'pretty-ms';
import buildStory from './buildStory.js';
import getCSS from './getCSS.js';
import {imageURLParser} from "../imageURLParser.js";

const {JSDOM} = jsdom;

export default async function buildView(dataPath, outputPath = dataPath, localResources = false) {
	const timeStart = Date.now();
	const name = dataPath.split(/[\\\/]/g).pop();
	const files = await fs.readdir(dataPath);
	let metadataPath;
	let chaptersPath;
	let storyImageMapPath;
	const chatPaths = [];
	for (const file of files) {
		const filePath = path.join(dataPath, file);
		if (file.endsWith("metadata.json")) {
			metadataPath = filePath;
		} else if (file.endsWith("chapters.json")) {
			chaptersPath = filePath;
		} else if (file.endsWith("imagemap-story.json")) {
			storyImageMapPath = filePath;
		} else {
			const match = file.match(/chat\.([0-9]+)\.json$/);
			if (match) {
				chatPaths[parseInt(match[1], 10)] = filePath;
			}
		}
	}
	for (let i = 0; i < chatPaths.length; i++) {
		if (!chatPaths[i]) {
			console.error(`Chat seems to be missing section ${i}`);
		}
	}

	const [metadata, chapters, storyImageMap] = await Promise.all([
		fs.readJSON(metadataPath),
		fs.readJSON(chaptersPath),
		fs.readJSON(storyImageMapPath),
	]);

	const dom = new JSDOM(`<!DOCTYPE html>`);
	const css = await getCSS();
	const meta = JSDOM.fragment(`<meta charset="utf-8"/>`);
	dom.window.document.querySelector('head').appendChild(meta);
	const style = JSDOM.fragment(`<style>${css}</style>`);
	dom.window.document.querySelector('head').appendChild(style);

	buildStory(
		dom,
		metadata,
		chapters,
		(url) => localResources && storyImageMap[url] && `images/${storyImageMap[url]}` || imageURLParser(url)
	);

	await fs.ensureDir(outputPath);
	const outputFileName = localResources ? `${name}.local.html` : `${name}.html`;
	await fs.writeFile(path.join(outputPath, outputFileName), dom.serialize(), 'utf8');
	const timeElapsed = Date.now() - timeStart;
	console.log(`Built view in ${prettyMs(timeElapsed)} for ${name}`);
}
