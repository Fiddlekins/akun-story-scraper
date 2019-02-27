const { JSDOM } = require('jsdom');
const formatAvatarSrc = require('./formatAvatarSrc.js');

function buildAuthor(author) {
	if (author['n'] && author['n'] !== '') {
		const $author = JSDOM.fragment(`
<div class="author">
	<img class="avatar" alt="avatar">
	<span class="username">${author['n']}</span>
</div>`);
		const $img = $author.querySelector('.avatar');
		if (author['a']) {
			$img.src = formatAvatarSrc(author['a'], 256);
		} else {
			$img.src = `https://placehold.it/256x256`;
		}
		return $author;
	} else {
		return null;
	}
}

module.exports = buildAuthor;
