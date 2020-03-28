import jsdom from 'jsdom';
import formatAvatarSrc from './formatAvatarSrc.js';

const {JSDOM} = jsdom;

export default function buildAuthor(author) {
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
