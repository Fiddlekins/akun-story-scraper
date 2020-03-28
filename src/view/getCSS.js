import autoprefixer from 'autoprefixer';
import crypto from 'crypto';
import cssnano from 'cssnano';
import fs from 'fs-extra';
import path from 'path';
import postcss from 'postcss';
import precss from 'precss';
import {fileURLToPath} from "url";

const __dirname = path.join(fileURLToPath(import.meta.url), '..');
let loadCSSPromise;

async function loadCSS() {
	const pcss = await fs.readFile(path.join(__dirname, 'pcss', 'main.pcss'), 'utf8');
	const hash = crypto.createHash('sha1').update(pcss, 'utf8').digest('hex');
	let css;
	const cssPath = path.join(__dirname, 'css');
	await fs.ensureDir(cssPath);
	try {
		css = await fs.readFile(path.join(cssPath, `${hash}.css`), 'utf8');
	} catch (err) {
		// A pre-generated CSS file for the current PCSS doesn't exist, so make a new one
		css = await buildCSS(pcss);
		// Save new CSS
		await fs.writeFile(path.join(cssPath, `${hash}.css`), css, 'utf8');
	}
	return css;
}

async function buildCSS(pcss) {
	const {css} = await postcss([precss, autoprefixer, cssnano])
		.process(pcss, {from: 'src/app.css', to: 'dest/app.css'}); // from and to should be set properly to generate useful sourcemaps, but I haven't bothered
	return css;
}

export default async function getCSS() {
	if (!loadCSSPromise) {
		loadCSSPromise = loadCSS();
	}
	return await loadCSSPromise;
}
