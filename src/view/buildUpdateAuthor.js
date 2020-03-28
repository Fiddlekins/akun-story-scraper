import jsdom from 'jsdom';
import formatAvatarSrc from './formatAvatarSrc.js';

const {JSDOM} = jsdom;

export default function buildUpdateAuthor(username, avatar) {
	if (username) {
		if (avatar) {
			return JSDOM.fragment(`
<span class="author">
	<img class="avatar" src="${formatAvatarSrc(avatar)}" alt="avatar">
	<span class="username">${username}</span>
</span>`);
		} else {
			return JSDOM.fragment(`
<span class="author">
	<span class="username">${username}</span>
</span>`);
		}
	} else {
		return null;
	}
}
