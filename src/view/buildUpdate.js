import jsdom from 'jsdom';
import buildChapter from './buildChapter.js';
import buildChoice from './buildChoice.js';
import buildReaderPost from './buildReaderPost.js';
import buildUnrecognisedUpdateType from './buildUnrecognisedUpdateType.js';
import buildUpdateAuthor from './buildUpdateAuthor.js';
import formatTimestamp from './formatTimestamp.js';

const {JSDOM} = jsdom;

export default function buildUpdate(update) {
	const $update = JSDOM.fragment(`
<div id="${update['_id']}" class="update ${update['nt']}">
	<div class="contentMetadata">
		<span class="authors"></span>
		<span class="date">${formatTimestamp(update['ct'])}</span>	
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
		case 'review':
			return null;
		default:
			buildUnrecognisedUpdateType($content, update);
	}
	return $update;
}
