function formatTimestamp(timestamp) {
	const date = new Date(timestamp);
	return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

module.exports = formatTimestamp;
