const { JSDOM } = require('jsdom');
const escape = require('escape-html');

function buildChoice($content, update) {
	if (update['choices'] && update['choices'].length) {
		// Convert poll data into something more coherent
		let voterCount = 0;
		const reassembledPoll = update['choices'].map(text => {
			return { text, count: 0 };
		});
		if (update['votes']) {
			if (update['multiple']) {
				for (const choices of Object.values(update['votes'])) {
					if (Array.isArray(choices)) {
						voterCount++;
						for (const choice of choices) {
							if (reassembledPoll[choice]) {
								reassembledPoll[choice].count++;
							}
						}
					}
				}
			} else {
				for (const choice of Object.values(update['votes'])) {
					if (reassembledPoll[choice]) {
						voterCount++;
						reassembledPoll[choice].count++;
					}
				}
			}
		}
		if (update['xOut']) {
			for (const xChoiceIndex of update['xOut']) {
				const choice = reassembledPoll[parseInt(xChoiceIndex, 10)];
				choice.xOut = true;
				if (update['xOutReasons']) {
					choice.xOutReason = update['xOutReasons'][xChoiceIndex];
				}
				if (choice.text === 'permanentlyRemoved') {
					choice.xOutPermanently = true;
				}
			}
		}
		reassembledPoll.sort((a, b) => {
			// Sort in descending order
			return b.count - a.count;
		});

		// Build HTML
		$content.appendChild(JSDOM.fragment(`
<div class="metadata">
	<div class="type">
		<span class="multi">${(update['multiple'] ? 'Multi-choice' : 'Single choice')}</span>
		<span class="custom">${(update['custom'] ? 'Customs enabled' : 'Customs disabled')}</span>
	</div>
	<div class="votersCount">${voterCount} voters</div>
</div>
<table class="votes">
	<tr>
		<th>Votes</th>
		<th>Choice</th>
	</tr>
</table>
		`));

		const $voteContainer = $content.querySelector('.votes');
		reassembledPoll.forEach(choice => {
			const $choice = JSDOM.fragment(`
<tr class="vote">
	<td class="count">${choice.count}</td>
	<td class="value">
		<div class="text">${escape(choice.text)}</div>
	</td>
</tr>
			`);
			if (choice.xOut) {
				const $vote = $choice.querySelector('.vote');
				$vote.classList.add('xOut');
				if (choice.xOutPermanently) {
					$vote.classList.add('xOutPermanently');
				}
				if (choice.xOutReason) {
					$choice.querySelector('.value').appendChild(JSDOM.fragment(`<div class="reason">${choice.xOutReason}</div>`));
				}
			}
			$voteContainer.appendChild($choice);
		});
	}
}

module.exports = buildChoice;
