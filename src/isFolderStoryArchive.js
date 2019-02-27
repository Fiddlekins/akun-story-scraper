const fs = require('fs-extra');

async function isFolderStoryArchive(folderPath) {
	try {
		const files = await fs.readdir(folderPath);
		let metadata = false;
		let chapters = false;
		for (const file of files) {
			if (!metadata && /[A-z0-9]+\.metadata\.json$/.test(file)) {
				metadata = true;
			} else if (!chapters && /[A-z0-9]+\.chapters\.json$/.test(file)) {
				chapters = true;
			}
			if (metadata && chapters) {
				return true;
			}
		}
		return false;
	} catch (err) {
		return false;
	}
}

module.exports = isFolderStoryArchive;
