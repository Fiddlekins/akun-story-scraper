const fs = require('fs-extra');
const path = require('path');
const { JSDOM } = require('jsdom');
const prettyMs = require('pretty-ms');
const buildStory = require('./buildStory.js');
const getCSS = require('./getCSS.js');

async function buildView(dataPath, outputPath = dataPath) {
	const timeStart = Date.now();
	const name = dataPath.split(/[\\\/]/g).pop();
	const files = await fs.readdir(dataPath);
	let metadataPath;
	let chaptersPath;
	const chatPaths = [];
	for (const file of files) {
		const filePath = path.join(dataPath, file);
		if (/metadata\.json$/.test(file)) {
			metadataPath = filePath;
		} else if (/chapters\.json$/.test(file)) {
			chaptersPath = filePath;
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

	const [metadata, chapters] = await Promise.all([fs.readJSON(metadataPath), fs.readJSON(chaptersPath)]);

	const dom = new JSDOM(`<!DOCTYPE html>`);
	const css = await getCSS();
	const style = JSDOM.fragment(`<style>${css}</style>`);
	dom.window.document.querySelector('head').appendChild(style);

	buildStory(dom, metadata, chapters);

	await fs.ensureDir(outputPath);
	await fs.writeFile(path.join(outputPath, `${name}.html`), dom.serialize(), 'utf8');
	const timeElapsed = Date.now() - timeStart;
	console.log(`Built view in ${prettyMs(timeElapsed)} for ${name}`);
}

module.exports = buildView;
