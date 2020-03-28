import jsdom from 'jsdom';
import buildHeader from './buildHeader.js';
import buildUpdate from './buildUpdate.js';

const {JSDOM} = jsdom;

export default function buildStory(dom, metadata, chapters) {
	const doc = dom.window.document;

	// Add header
	doc.body.appendChild(buildHeader(metadata));

	// Add story
	doc.body.appendChild(JSDOM.fragment(`
<div id="story">
	<div id="main">
		<h1>Story</h1>
	</div>
	<div id="appendix">
		<h1>Appendix</h1>
	</div>
</div>`));
	const $main = doc.getElementById('main');
	const $appendix = doc.getElementById('appendix');

	// Add Content Pages
	let previousContentPageId = 'home';
	const contentPageTitleToIdMap = {};
	const appendixIds = [];
	const contentsPageExists = metadata['bm'] && metadata['bm'].length;
	if (contentsPageExists) {
		for (let bm of metadata['bm']) {
			const id = bm['id'];
			let title = bm['title'];
			const appendixIndicator = '#special ';
			contentPageTitleToIdMap[title] = id;
			let $targetContainer = $main;
			if (title.startsWith(appendixIndicator)) {
				title = title.slice(appendixIndicator.length);
				$targetContainer = $appendix;
				appendixIds.push(id);
			}
			if (bm['isFirst']) {
				previousContentPageId = id;
			}
			$targetContainer.appendChild(JSDOM.fragment(`
<div id="${id}" class="contentsPage">
	<h2>${title}</h2>
</div>`));
		}
	}

	// Add Content
	for (let update of chapters) {
		const $update = buildUpdate(update);
		if (!$update) {
			continue;
		}
		if (contentsPageExists) {
			// Get content page id from title
			let contentPageId = contentPageTitleToIdMap[update['t']];
			// If there isn't a valid id (because there was no title, or title doesn't exist in metadata list) then attach to previous content page
			if (!contentPageId) {
				contentPageId = previousContentPageId;
			}
			// Appendices only ever have one update in, the next title-less update is attached to the previous main content page
			if (!appendixIds.includes(contentPageId)) {
				// Update previous content page id for next title-less update
				previousContentPageId = contentPageId;
			}
			let $contentPage = doc.getElementById(contentPageId);
			if (!$contentPage) {
				// If the home content page hasn't been created yet then do so
				if (contentPageId === 'home') {
					const $home = JSDOM.fragment(`
<div id="home" class="contentsPage">
	<h2>Home</h2>
</div>`);
					$main.insertBefore($home, $main.firstChild);
					$contentPage = doc.getElementById('home');
				} else {
					throw new Error(`Something has gone wrong when finding a content page to attach an update to`);
				}
			}
			$contentPage.appendChild($update);
		} else {
			// If there's no content page then stick everything in main
			$main.appendChild($update);
		}
	}
}
