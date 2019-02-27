const { JSDOM } = require('jsdom');
const buildAuthor = require('./buildAuthor.js');
const removeElement = require('./removeElement.js');

function buildHeader(metadata) {
	const $header = JSDOM.fragment(`
<div id="header">
	<img class="coverImage" alt="Cover Image">
	<h1 class="title">${metadata['t']}</h1>
	<div class="authors"></div>
	<div class="tags">Tags: </div>
	<div class="description"></div>
	<div class="introduction"></div>
</div>`);
	if (metadata['i']) {
		$header.querySelector('.coverImage').src = metadata['i'][0];
	} else {
		removeElement($header.querySelector('.coverImage'));
	}
	if (metadata['d']) {
		$header.querySelector('.description').innerHTML = metadata['d'];
	}
	if (metadata['b']) {
		$header.querySelector('.introduction').innerHTML = metadata['b'];
	}
	if (metadata['ta']) {
		const $tags = $header.querySelector('.tags');
		metadata['ta'].map(tag => buildTag(tag, metadata['spoilerTags'].includes(tag))).filter(el => !!el).forEach(el => $tags.appendChild(el));
	} else {
		removeElement($header.querySelector('.tags'));
	}
	if (metadata['u']) {
		const $authors = $header.querySelector('.authors');
		metadata['u'].map(buildAuthor).filter(el => !!el).forEach(el => $authors.appendChild(el));
	}
	return $header;
}

function buildTag(tag, isSpoiler) {
	if (tag && tag !== '') {
		return JSDOM.fragment(`<span class="tag${isSpoiler ? ' spoiler' : ''}">${tag}</span>`);
	} else {
		return null;
	}
}

module.exports = buildHeader;
