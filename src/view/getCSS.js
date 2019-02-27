const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const postcss = require('postcss');
const precss = require('precss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');

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
	const { css } = await postcss([precss, autoprefixer, cssnano])
		.process(pcss, { from: 'src/app.css', to: 'dest/app.css' }); // from and to should be set properly to generate useful sourcemaps, but I haven't bothered
	return css;
}

async function getCSS() {
	if (!loadCSSPromise) {
		loadCSSPromise = loadCSS();
	}
	return await loadCSSPromise;
}

module.exports = getCSS;
