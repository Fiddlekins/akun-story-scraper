import fs from 'fs-extra';
import jsdom from 'jsdom';
import path from 'path';
import Striver from './Striver.js';
import Throttler from './Throttler.js';
import DefaultSaver from "./DefaultSaver.js";

const {JSDOM} = jsdom;

// The values Akun uses for different story sort methods
const SORT_MODES = Object.freeze({
	LATEST: 'Latest',
	UPDATED_CHAPTER: 'UpdatedChapter',
	NEW: 'new',
	TOP: 'top'
});

// The number of posts Akun has per page of story chat
const postsPerPage = 30;

function interpretMetadata(raw, override) {
	const interpreted = {
		storyId: raw._id,
		sections: [],
		appendices: [],
	};

	if (override.user) {
		interpreted.author = override.user;
	} else if (raw['u']) {
		if (raw['u'].length) {
			interpreted.author = raw['u'][0]['n'] || raw['u'][0]['_id'] || 'anon';
		} else {
			interpreted.author = raw['u']['n'] || raw['u']['_id'] || 'anon';
		}
	} else {
		interpreted.author = 'anon';
	}

	interpreted.storyTitle = raw['t'] || raw['b'] || 'undefined';

	if (raw.bm) {
		let prevSection = null;
		for (const rawSection of raw.bm) {
			if (rawSection.title.startsWith('#special ')) {
				interpreted.appendices.push(rawSection);
			} else {
				const newSection = {
					title: rawSection.title,
					id: rawSection.id,
					startTs: rawSection.ct,
					endTs: 9999999999999998
				};
				interpreted.sections.push(newSection);
				if (prevSection) {
					prevSection.endTs = newSection.startTs;
				}
				prevSection = newSection;
			}
		}
	}

	return interpreted;
}

export default class Scraper {
	static stripUserIds(node) {
		if (Array.isArray(node['u'])) {
			for (let i = 0; i < node['u'].length; i++) {
				delete node['u'][i]['_id'];
				delete node['u'][i]['id'];
			}
		}
		if (node['lr'] && node['lr']['u'] && Array.isArray(node['lr']['u'])) {
			for (let j = 0; j < node['lr']['u'].length; j++) {
				delete node['lr']['u'][j]['_id'];
				delete node['lr']['u'][j]['id'];
			}
		}
	}

	static get SORT_MODES() {
		return SORT_MODES;
	}

	static addImageUrlsFromUser(users, sink) {
		if (Array.isArray(users)) {
			users.forEach(user => {
				if (user['a']) {
					sink(user['a']);
				}
			});
		} else {
			if (users['a']) {
				sink(users['a']);
			}
		}
	}

	static addImageUrlsFromMetadata(metadata, sink) {
		if (metadata['i']) {
			if (Array.isArray(metadata['i'])) {
				metadata['i'].forEach(url => sink(url));
			} else {
				sink(metadata['i']);
			}
		}
		if (metadata['u']) {
			Scraper.addImageUrlsFromUser(metadata['u'], sink);
		}
	}

	static addImageUrlsFromStory(story, sink, logger) {
		for (const update of story) {
			if (update['nt'] === 'chapter') {
				try {
					const dom = JSDOM.fragment(update['b']);
					dom.querySelectorAll('img').forEach(el => sink(el.src));
				} catch (err) {
					logger.error(err);
				}
			}
			if (update['u']) {
				Scraper.addImageUrlsFromUser(update['u'], sink);
			}
		}
	}

	static addImageUrlsFromChat(chat, sink) {
		for (const post of chat) {
			if (post['i']) {
				if (Array.isArray(post['i'])) {
					post['i'].forEach(url => sink(url));
				} else {
					sink(post['i']);
				}
			}
			if (post['u']) {
				Scraper.addImageUrlsFromUser(post['u'], sink);
			}
		}
	}

	constructor(settings) {
		this._settings = settings;

		this._akun = this._settings.akun;
		this._logger = this._settings.logger;
		this._striver = new Striver({waitTime: 500, logger: this._logger});
	}

	async logFatQuest(storyId) {
		const fatQuestsPath = path.join(this._settings.outputDirectory, 'fatQuests.json');
		await fs.ensureDir(this._settings.outputDirectory);
		let fatQuests = [];
		try {
			fatQuests = await fs.readJson(fatQuestsPath, {fatal: false}) || [];
		} catch (err) {
			// File hasn't been made before
		}
		fatQuests.push(storyId);
		await fs.writeJson(fatQuestsPath, fatQuests);
	}

	async archiveAllStories({startPage = 1, endPage = 1000, skipChat = false, sortType = Scraper.SORT_MODES.NEW, skip = [], downloadImages = true}) {
		for (let storyPageIndex = startPage; storyPageIndex < endPage; storyPageIndex++) {
			this._logger.log(`Archiving page ${storyPageIndex}`);
			const {stories} = await this._akun.getStories('stories', storyPageIndex, {sort: sortType});
			const storyIds = stories.map(({_id}) => _id);

			for (const storyId of storyIds) {
				if (skip.includes(storyId)) {
					this._logger.log(`Skipping ${storyId}`);
				} else {
					try {
						await this.archiveStory({storyId, chatMode: skipChat ? 'skip' : 'fetch', downloadImages});
					} catch (err) {
						this._logger.error(`Unable to archive story ${storyId}: ${err}`);
						await this.logFatQuest(storyId);
					}
				}
			}
		}
	}

	async archiveStory({storyId, chatMode = 'fetch', user, downloadImages = true, saver}) {
		saver = saver || new DefaultSaver({
			workDir: this._settings.outputDirectory,
		});

		this._logger.log(`Archiving ${storyId}`);
		// I realised that trying to take an existing archive and only fetch new data means that edits wouldn't be picked up, which is unacceptable, so yay

		let metaData;
		try {
			metaData = await this._striver.handle(() => {
				return this._api(`/api/node/${storyId}`);
			});
		} catch (err) {
			this._logger.log(`Metadata inaccessible for storyId ${storyId}, using fallback user 'anon' and title 'undefined'`);
			// Make it up instead in case the story nodes are still available
			metaData = {
				_id: storyId
			}
		}
		const metaInterpreted = interpretMetadata(metaData, {user});
		if (metaInterpreted.storyId !== storyId) {
			throw 'story ID in retrieved metadata does not match the requested ID';
		}
		this._logger.log(`Archiving ${metaInterpreted.storyTitle} by ${metaInterpreted.author}`);
		await saver.setMetadata(metaData, metaInterpreted);

		Scraper.addImageUrlsFromMetadata(metaData, (url) => saver.addImage(url));

		for (const [ix, section] of metaInterpreted.sections.entries()) {
			const chapters = await this._striver.handle(() => {
				return this._api(`/api/anonkun/chapters/${storyId}/${section.startTs}/${section.endTs}`);
			}, 30);
			const newChapters = chapters.reduce(
				(acc, chapter) => {
					let chapterIsNew;
					if (chapter.t && chapter.t.startsWith("#special ")) {
						chapterIsNew = saver.setAppendix(chapter);
					} else {
						chapterIsNew = saver.setChapter(chapter);
					}
					return acc + (chapterIsNew ? 1 : 0);
				},
				0
			);
			this._logger.log(`Section ${ix + 1}/${metaInterpreted.sections.length} "${section.title}": ${chapters.length} chapters, ${newChapters} new`);
		}

		// we probably caught all appendices when getting regular chapters, but let's double-check
		for (const [ix, section] of metaInterpreted.appendices.entries()) {
			const chapters = await this._striver.handle(() => {
				return this._api(`/api/anonkun/chapters/${storyId}/${section.ct}/${section.ct + 1}`);
			}, 30);
			const newChapters = chapters.reduce((acc, chapter) => acc + (saver.setAppendix(chapter) ? 1 : 0), 0);
			this._logger.log(`Appendix ${ix + 1}/${metaInterpreted.appendices.length} "${section.title}": ${chapters.length} chapters, ${newChapters} new`);
		}

		this._logger.log(`Committing chapters`);
		const story = await saver.commitChapters();

		Scraper.addImageUrlsFromStory(story, (url) => saver.addImage(url), this._logger);

		let chat = [];
		if (chatMode === 'fetch') {
			this._logger.log(`Fetching chat log`);

			const latestChat = await this._striver.handle(() => {
				return this._api(`/api/chat/${storyId}/latest`);
			});

			if (latestChat.length) {
				let totalNews = 0;
				try {
					const totalPosts = (await this._striver.handle(() => {
						return this._api(`/api/chat/pages`, {'r': storyId});
					}))['count'];

					const finalPageIndex = Math.ceil(totalPosts / postsPerPage);

					const pagePostData = {
						'r': storyId,
						'lastCT': latestChat[latestChat.length - 1]['ct'],
						'firstCT': latestChat[0]['ct'],
						'cpr': finalPageIndex,
					};

					let retryAttempts = 10; // Stop trying so hard when it doesn't work
					for (let pageIndex = 1; pageIndex <= finalPageIndex; pageIndex++) {
						pagePostData['page'] = pageIndex;
						try {
							const posts = await this._striver.handle(() => {
								return this._api(`/api/chat/page`, pagePostData);
							}, retryAttempts);
							const news = saver.addChatPosts(posts);
							totalNews += news;
							this._logger.log(`Page ${pageIndex}/${finalPageIndex}: +${news} new messages`);
							retryAttempts = 10;
							if (posts.length) {
								pagePostData['lastCT'] = posts[posts.length - 1]['ct'];
								pagePostData['firstCT'] = posts[0]['ct'];
								pagePostData['cpr'] = pageIndex;
							}
						} catch (err) {
							this._logger.error(`Page ${pageIndex}/${finalPageIndex}: ${err}`);
							saver.addChatFailure(err, postsPerPage, pageIndex);
							retryAttempts = Math.max(Math.floor(retryAttempts * 0.6), 1);
							// We did our best. It is time to move on.
						}
					}
				} catch (err) {
					this._logger.error(`Failed to start fetching chat: ${err}`);
					saver.addChatFailure(err, 0, 0);
				}
				this._logger.log(`Total new messages: ${totalNews}`);
			}

			// Export chat after gathering it all so that interrupting the scraper doesn't result in quests having partially updated chunks of chat
			this._logger.log(`Committing chat logs`);
			chat = await saver.commitChat(postsPerPage * 1000);
		} else if (chatMode === 'read') {
			chat = saver.getChat();
		}

		Scraper.addImageUrlsFromChat(chat, (url) => saver.addImage(url));

		if (downloadImages) {
			const imageUrls = new Set(saver.getNewImageUrls());
			this._logger.log(`Downloading images (${imageUrls.size} new)...`);
			const throttler = new Throttler();
			let counter = 0;
			const promises = Array.from(imageUrls).map(imageUrl => {
				const promiseGenerator = () => saver.downloadImage(imageUrl);
				return throttler.queue(promiseGenerator)
					.catch(err => {
						this._logger.error(`Unable to download image ${imageUrl} due to:\n${err}`);
					})
					.then(() => {
						counter += 1;
						if (counter % 100 === 0 || counter === imageUrls.size) {
							this._logger.log(`Processed ${counter}/${imageUrls.size} images`);
						}
					});
			});
			await Promise.all(promises);
			await saver.commitImageMap();
		}

		this._logger.log(`Saved`);
	}

	async getStoyIdsFromUser(username) {
		let user;
		try {
			user = await this._api(`/api/user/${username}`);
		} catch (err) {
			this._logger.error(`Couldn't find user: ${username}\n${err}`);
			throw err;
		}
		const stories = await this._api(`/api/anonkun/userStories/${user['_id']}`);
		return stories.map(story => story['_id']);
	}

	async isIdStory(id) {
		try {
			const metaData = await this._striver.handle(() => {
				return this._api(`/api/node/${id}`);
			});
			return metaData['nt'] === 'story';
		} catch (err) {
			this._logger.debug(`${id} deemed to not be a story`, err);
			return false;
		}
	}

	async isIdUser(username) {
		try {
			const userData = await this._striver.handle(() => {
				return this._api(`/api/user/${username}`);
			});
			return userData['username'] === username;
		} catch (err) {
			this._logger.debug(`${username} deemed to not be a user`, err);
			return false;
		}
	}

	_api(path, postData) {
		if (postData) {
			this._logger.debug(path, JSON.stringify(postData));
			return this._akun.post(path, {data: postData});
		} else {
			this._logger.debug(path);
			return this._akun.get(path);
		}
	}
}
