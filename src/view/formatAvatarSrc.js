function formatAvatarSrc(src, size = 64) {
	const cloudfrontMatch = src.match(/https?:\/\/[A-z0-9]+.cloudfront.net\/images\/(.+)/i);
	if (cloudfrontMatch) {
		return `https://cdn.fiction.live/h${size}-w${size}-cfill/images/${cloudfrontMatch[1]}`;
	}
	const filepickerMatch = src.match(/https?:\/\/www.filepicker.io\/api\/file\/(.+)/i);
	if (filepickerMatch) {
		return `https://www.filepicker.io/api/file/${filepickerMatch[1]}/convert?w=${size}&amp;h=${size}&amp;fit=crop&amp;cache=true`;
	}
	return src;
}

module.exports = formatAvatarSrc;
