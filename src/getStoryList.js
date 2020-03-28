import fs from 'fs-extra';

export default async function getStoryList(listPath) {
	let listText;
	try {
		listText = await fs.readFile(listPath, 'utf8');
	} catch (err) {
		throw new Error(`List path does not exist: ${err}`);
	}
	const entries = listText.split('\n').map(val => val.trim()).filter(val => val.length > 0);
	return entries.map(entry => {
		const target = {};
		// Don't care about the comment
		const [meaningful] = entry.split('//');
		const [id, skipChat, isUser] = meaningful.split(';');
		// Just ensure the id isn't padded with any whitespace
		target.id = id.trim();
		// If skipChat explicitly set it can override global value
		switch (String(skipChat).trim().toLowerCase()) {
			case 'true':
				target.skipChat = true;
				break;
			case 'false':
				target.skipChat = false;
				break;
			default:
		}
		// If skipChat explicitly set it can override global value
		switch (String(isUser).trim().toLowerCase()) {
			case 'true':
				target.isUser = true;
				break;
			case 'false':
				target.isUser = false;
				break;
			default:
		}

		return target;
	});
}
