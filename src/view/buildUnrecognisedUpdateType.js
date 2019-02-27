const escape = require('escape-html');

function buildUnrecognisedUpdateType($content, update) {
	const json = JSON.stringify(update, null, 2);
	$content.innerHTML = `<pre class="json">${escape(json)}</pre>`;
	console.error(`Unrecognised Update Type found: ${update}`);
}

module.exports = buildUnrecognisedUpdateType;
