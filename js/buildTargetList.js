// Take a list of mixed story and user ids with individual options and assemble a pure story list
// Ensure each item in the list is unique as well, since targeting users risks story duplication if they share the same story
// Lower items on the list override higher items
// If target is a user rather than a story then archive it under their name rather than the default, which is the first name in the story author list

async function buildTargetList(targetList, scraper, logger, skipChatGlobal) {
	const targets = {};

	let order = 0;

	for (const target of targetList) {
		const id = target.id;
		// User ids have to be lowercase when using the API for Akun to recognise them
		const userid = id.toLowerCase();
		const skipChat = typeof target.skipChat === 'undefined' ? skipChatGlobal : target.skipChat;
		let isUser = typeof target.isUser === 'undefined' ? false : target.isUser;

		if (isUser) {
			const confirmedIsUser = await scraper.isIdUser(userid);
			if (confirmedIsUser) {
				const ids = await scraper.getStoyIdsFromUser(userid);
				for (const storyId of ids) {
					targets[storyId] = { storyId, skipChat, order: order++, user: userid };
				}
			} else {
				logger.error(`Cannot resolve ${userid} as a user. Failed to archive their stories.`);
			}
		} else {
			const confirmedIsStory = await scraper.isIdStory(id);
			if (confirmedIsStory) {
				targets[id] = { storyId: id, skipChat, order: order++ };
			} else {
				const confirmedIsUser = await scraper.isIdUser(userid);
				if (confirmedIsUser) {
					const ids = await scraper.getStoyIdsFromUser(userid);
					for (const storyId of ids) {
						targets[storyId] = { storyId, skipChat, order: order++, user: userid };
					}
				} else {
					logger.error(`Cannot resolve ${id} as a story or ${userid} as a user. Failed to archive.`);
				}
			}
		}
	}

	const targetArray = [];
	for (const storyId of Object.keys(targets)) {
		targetArray.push(targets[storyId]);
	}
	return targetArray.sort((a, b) => {
		return a.order - b.order;
	});
}

module.exports = buildTargetList;
