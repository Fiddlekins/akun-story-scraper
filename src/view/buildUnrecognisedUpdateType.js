import escape from 'escape-html';

export default function buildUnrecognisedUpdateType($content, update) {
	const json = JSON.stringify(update, null, 2);
	$content.innerHTML = `<pre class="json">${escape(json)}</pre>`;
	console.error(`Unrecognised Update Type found: ${json}`);
}
