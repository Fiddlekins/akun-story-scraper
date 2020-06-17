import fs from 'fs-extra';
import jsdom from 'jsdom';
import path from 'path';
import downloadImage from './downloadImage.js';
import Striver from './Striver.js';
import Throttler from './Throttler.js';

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

export default class Scraper {
	static getAuthor(node) {
		if (node['u']) {
			if (node['u'].length) {
				return node['u'][0]['n'] || node['u'][0]['_id'] || 'anon';
			} else {
				return node['u']['n'] || node['u']['_id'] || 'anon';
			}
		} else {
			return 'anon';
		}
	}

	static getStoryTitle(node) {
		return node['t'] || node['b'] || 'undefined';
	}

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

	static sanitise(string) {
		string = string.replace(/\s|<br>/g, '-');
		string = string.replace(/-+/g, '-');
		const acceptedCharacters = /[A-z0-9\-]/;
		let splitString = string.split('');
		splitString = splitString.filter(char => {
			return acceptedCharacters.test(char);
		});
		string = splitString.join('');
		if (!string.length) {
			string = 'ThisStringHadNoSafeCharacters';
		}
		return string;
	}

	static get SORT_MODES() {
		return SORT_MODES;
	}

	static addImageUrlsFromUser(users, urls) {
		if (Array.isArray(users)) {
			users.forEach(user => {
				if (user['a']) {
					urls.add(user['a']);
				}
			});
		} else {
			if (users['a']) {
				urls.add(users['a']);
			}
		}
	}

	static addImageUrlsFromMetadata(metadata, urls) {
		if (metadata['i']) {
			if (Array.isArray(metadata['i'])) {
				metadata['i'].forEach(url => urls.add(url));
			} else {
				urls.add(metadata['i']);
			}
		}
		if (metadata['u']) {
			Scraper.addImageUrlsFromUser(metadata['u'], urls);
		}
	}

	static addImageUrlsFromStory(story, urls, logger) {
		for (const update of story) {
			if (update['nt'] === 'chapter') {
				try {
					const dom = JSDOM.fragment(update['b']);
					dom.querySelectorAll('img').forEach(el => urls.add(el.src));
				} catch (err) {
					logger.error(err);
				}
			}
			if (update['u']) {
				Scraper.addImageUrlsFromUser(update['u'], urls);
			}
		}
	}

	static addImageUrlsFromChat(chat, urls) {
		for (const post of chat) {
			if (post['i']) {
				if (Array.isArray(post['i'])) {
					post['i'].forEach(url => urls.add(url));
				} else {
					urls.add(post['i']);
				}
			}
			if (post['u']) {
				Scraper.addImageUrlsFromUser(post['u'], urls);
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
						await this.archiveStory({storyId, skipChat, downloadImages});
					} catch (err) {
						this._logger.error(`Unable to archive story ${storyId}: ${err}`);
						await this.logFatQuest(storyId);
					}
				}
			}
		}
	}

	async archiveStory({storyId, skipChat = false, user, downloadImages = true}) {
		this._logger.log(`Archiving ${storyId}`);
		// I realised that trying to take an existing archive and only fetch new data means that edits wouldn't be picked up, which is unacceptable, so yay
		const imageUrls = new Set();
		const story = [];
		let chat = [];

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
		const author = user || Scraper.getAuthor(metaData);
		const storyTitle = Scraper.getStoryTitle(metaData);
		this._logger.log(`Archiving ${storyTitle} by ${author}`);
		const archivePath = path.join(this._settings.outputDirectory, Scraper.sanitise(author), `${Scraper.sanitise(storyTitle).slice(0, 50)}_${storyId}`);

		this._logger.log(`Saving to ${archivePath}`);

		await fs.outputJson(path.join(archivePath, `${storyId}.metadata.json`), metaData);
		if (downloadImages) {
			Scraper.addImageUrlsFromMetadata(metaData, imageUrls);
		}

		const chapterTimestamps = metaData['bm'] ? metaData['bm'].map(({ct}) => ct) : [];
		chapterTimestamps.push(9999999999999998);

		let startCt = 0;
		for (const ct of chapterTimestamps) {
			try {
				const chapters = await this._striver.handle(() => {
					return this._api(`/api/anonkun/chapters/${storyId}/${startCt}/${ct}`);
				}, 30);
				for (const chapter of chapters) {
					story.push(chapter);
				}
			} catch (err) {
				await this.logFatQuest(storyId);
				return;
			}
			startCt = ct;
		}

		await fs.outputJson(path.join(archivePath, `${storyId}.chapters.json`), story);
		if (downloadImages) {
			Scraper.addImageUrlsFromStory(story, imageUrls, this._logger);
		}

		if (!skipChat) {
			const latestChat = await this._striver.handle(() => {
				return this._api(`/api/chat/${storyId}/latest`);
			});

			if (latestChat.length) {
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
							chat.push(...posts);
							retryAttempts = 10;
							if (posts.length) {
								pagePostData['lastCT'] = posts[posts.length - 1]['ct'];
								pagePostData['firstCT'] = posts[0]['ct'];
								pagePostData['cpr'] = pageIndex;
							}
						} catch (err) {
							this._logger.error(err);
							chat.push({
								failedToRetrieveChatPage: true,
								postsPerPage,
								pageIndex
							});
							retryAttempts = Math.max(Math.floor(retryAttempts * 0.6), 1);
							// We did our best. It is time to move on.
						}
					}
				} catch (err) {
					chat.push({
						failedToRetrieveChatPage: true,
						reason: err
					});
				}
			}

			// Export chat after gathering it all so that interrupting the scraper doesn't result in quests having partially updated chunks of chat
			const chatOutputMaxLength = postsPerPage * 1000;
			let outputIndex = 0;
			for (let i = 0; i < chat.length; i += chatOutputMaxLength) {
				await fs.outputJson(path.join(archivePath, `${storyId}.chat.${outputIndex}.json`), chat.slice(i, i + chatOutputMaxLength));
				outputIndex++;
			}

			if (downloadImages) {
				Scraper.addImageUrlsFromChat(chat, imageUrls);
			}
		}

		if (downloadImages) {
			const imageMap = {};
			const imagesPath = path.join(archivePath, 'images');
			this._logger.log(`Downloading images...`);
			const throttler = new Throttler();
			const promises = [];
			Array.from(imageUrls).forEach(imageUrl => {
				const promiseGenerator = () => {
					return downloadImage(imageUrl, imagesPath).then(imagePath => {
						imageMap[imageUrl] = imagePath;
					});
				};
				const promise = throttler.queue(promiseGenerator).catch(err => {
					this._logger.error(`Unable to download image ${imageUrl} due to:\n${err}`);
				});
				promises.push(promise);
			});
			await Promise.all(promises);
			await fs.outputJson(path.join(archivePath, `${storyId}.imagemap.json`), imageMap);
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
