const { JSDOM } = require('jsdom');
const formatTimestamp = require('./formatTimestamp.js');
const buildUpdateAuthor = require('./buildUpdateAuthor.js');
const buildChapter = require('./buildChapter.js');
const buildChoice = require('./buildChoice.js');
const buildReaderPost = require('./buildReaderPost.js');
const buildUnrecognisedUpdateType = require('./buildUnrecognisedUpdateType.js');

function buildUpdate(update) {
	const $update = JSDOM.fragment(`
<div id="${update['_id']}" class="update ${update['nt']}">
	<div class="contentMetadata">
		<span class="authors"></span>
		<span class="date">${formatTimestamp(update['ut'])}</span>	
	</div>
	<div class="content"></div>
</div>`);
	const $authors = $update.querySelector('.authors');
	if (Array.isArray(update['u'])) {
		update['u'].map(u => buildUpdateAuthor(u['n'], u['a'])).filter(el => !!el).forEach(el => $authors.appendChild(el));
	} else {
		$authors.appendChild(buildUpdateAuthor(update['u']));
	}

	const $content = $update.querySelector('.content');
	switch (update['nt']) {
		case 'chapter':
			buildChapter($content, update);
			break;
		case 'choice':
			buildChoice($content, update);
			break;
		case 'readerPost':
			buildReaderPost($content, update);
			break;
		default:
			buildUnrecognisedUpdateType($content, update);
	}
	return $update;
}

module.exports = buildUpdate;
