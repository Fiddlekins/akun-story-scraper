const fs = require('fs-extra');
const path = require('path');
const querystring = require('querystring');
const Striver = require('./Striver.js');
const Logger = require('./Logger.js');


// The values Akun uses for different story sort methods
const SORT_MODES = Object.freeze({
	UPDATED: 'Latest',
	NEW: 'new'
});

// The number of posts Akun has per page of story chat
const postsPerPage = 30;

class Scraper {
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
		return node['t'];
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

	constructor(settings) {
		this._settings = settings;

		this._akun = this._settings.akun;
		this._logger = new Logger();
		this._striver = new Striver({ waitTime: 500, logger: this._logger });
	}

	async logFatQuest(storyId) {
		const fatQuestsPath = path.join(this._settings.outputDirectory, 'fatQuests.json');
		let fatQuests = [];
		try {
			fatQuests = await fs.readJson(fatQuestsPath, { fatal: false }) || [];
		} catch (err) {
			// File hasn't been made before
		}
		fatQuests.push(storyId);
		await fs.writeJson(fatQuestsPath, fatQuests);
	}

	async archiveAllStories({ startPage = 1, endPage = 1000, skipChat = false, sortType = Scraper.SORT_MODES.NEW, skip = [] }) {
		for (let storyPageIndex = startPage; storyPageIndex < endPage; storyPageIndex++) {
			this._logger.log(`Archiving page ${storyPageIndex}`);
			const storyIds = await this.getStoryList(storyPageIndex, sortType);

			for (const storyId of storyIds) {
				if (skip.includes(storyId)) {
					this._logger.log(`Skipping ${storyId}`);
				} else {
					try {
						await this.archiveStory(storyId, skipChat);
					} catch (err) {
						this._logger.error(`Unable to archive story ${storyId}: ${err}`);
						await this.logFatQuest(storyId);
					}
				}
			}
		}
	}

	async archiveStory(storyId, skipChat = false) {
		this._logger.log(`Archiving ${storyId}`);
		// I realised that trying to take an existing archive and only fetch new data means that edits wouldn't be picked up, which is unacceptable, so yay
		const story = [];
		let chat = [];

		const metaData = await this._striver.handle(() => {
			return this._api(`node/${storyId}`);
		});
		const author = Scraper.getAuthor(metaData);
		const storyTitle = Scraper.getStoryTitle(metaData);
		this._logger.log(`Archiving ${storyTitle} by ${author}`);
		const archivePath = path.join(this._settings.outputDirectory, Scraper.sanitise(author), `${Scraper.sanitise(storyTitle).slice(0, 50)}_${storyId}`);

		this._logger.log(`Saving to ${archivePath}`);

		await fs.outputJson(path.join(archivePath, `${storyId}.metadata.json`), metaData);

		try {
			const chapters = await this._striver.handle(() => {
				return this._api(`anonkun/chapters/${storyId}/0/9999999999999998`);
			}, 30);
			for (const chapter of chapters) {
				story.push(chapter);
			}
		} catch (err) {
			await this.logFatQuest(storyId);
			return;
		}

		await fs.outputJson(path.join(archivePath, `${storyId}.chapters.json`), story);

		if (!skipChat) {
			const latestChat = await this._striver.handle(() => {
				return this._api(`chat/${storyId}/latest`);
			});

			if (latestChat.length) {
				try {
					const totalPosts = (await this._striver.handle(() => {
						return this._api(`chat/pages`, { 'r': storyId });
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
								return this._api(`chat/page`, pagePostData);
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
		}

		this._logger.log(`Saved`);
	}

	async getStoryList(storyPageIndex, sortType) {
		const queryParameters = {
			'contentRating[teen]': true,
			'contentRating[nsfw]': true,
			'contentRating[mature]': true,
			'storyStatus[active]': true,
			'storyStatus[finished]': true,
			'storyStatus[hiatus]': true,
			'sort': sortType,
			'threads': undefined,
		};

		const storyList = await this._striver.handle(() => {
			return this._api(`anonkun/board/stories/${storyPageIndex}?${querystring.stringify(queryParameters)}`);
		});

		return storyList['stories'].map(story => {
			return story['_id'];
		});
	}

	_api(path, postData) {
		this._logger.debug(path, JSON.stringify(postData));
		return this._akun.core.api(path, postData);
	}
}

module.exports = Scraper;