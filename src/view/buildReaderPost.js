import jsdom from 'jsdom';

const {JSDOM} = jsdom;

export default function buildReaderPost($content, update) {
	if (update['votes']) {
		const $votes = JSDOM.fragment(`
<div class="votes">
	<div class="title">Write-ins:</div>
	<div class="posts"></div>
</div>
		`);
		const $posts = $votes.querySelector('.posts');
		Object.keys(update['votes']).forEach(key => {
			$posts.appendChild(JSDOM.fragment(`<div>${update['votes'][key]}</div>`));
		});
		$content.appendChild($votes);
	}
	if (update['dice']) {
		const $dice = JSDOM.fragment(`
<div class="dice">
	<div class="title">Dice rolls:</div>
	<div class="posts"></div>
</div>
		`);
		const $posts = $dice.querySelector('.posts');
		Object.keys(update['dice']).forEach(key => {
			$posts.appendChild(JSDOM.fragment(`<div>${update['dice'][key]}</div>`));
		});
		$content.appendChild($dice);
	}
}
