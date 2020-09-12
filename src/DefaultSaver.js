import fs from 'fs-extra';
import path from 'path';
import downloadImage from "./downloadImage.js";

function sanitise(string) {
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

export default class DefaultSaver {

	constructor({workDir}) {
		this._workDir = workDir;
		this._archiveDir = null;
		this._imagesPath = null;
		this._interpretedMeta = null;
		this._chapters = [];
		this._knownChapterIds = new Set();
		this._chat = [];
		this._knownChatIds = new Set();
		this._chatFailures = [];
		this._images = new Map();
	}

	async setMetadata(raw, interpreted) {
		this._interpretedMeta = interpreted;

		this._archiveDir = path.join(
			this._workDir,
			sanitise(this._interpretedMeta.author),
			`${sanitise(this._interpretedMeta.storyTitle).slice(0, 50)}_${this._interpretedMeta.storyId}`
		);
		this._imagesPath = path.join(this._archiveDir, 'images');

		await fs.outputJson(path.join(this._archiveDir, `${this._interpretedMeta.storyId}.metadata.json`), raw);
	}

	setChapter(chapter) {
		if (this._knownChapterIds.has(chapter._id)) {
			return false;
		}
		this._knownChapterIds.add(chapter._id);
		this._chapters.push(chapter);
		return true;
	}

	setAppendix(appendix) {
		this.setChapter(appendix);
	}

	async commitChapters() {
		await fs.outputJson(path.join(this._archiveDir, `${this._interpretedMeta.storyId}.chapters.json`), this._chapters);
		return this._chapters;
	}

	addChatPosts(posts) {
		let news = 0;
		for (const post of posts) {
			if (!this._knownChatIds.has(post._id)) {
				this._knownChatIds.add(post._id);
				this._chat.push(post);
				news += 1;
			}
		}
		return news;
	}

	addChatFailure(reason, postsPerPage, pageIndex) {
		this._chatFailures.push({
			failedToRetrieveChatPage: true,
			postsPerPage,
			pageIndex,
			reason,
		});
	}

	async commitChat(chatOutputMaxLength) {
		let outputIndex = 0;
		for (let i = 0; i < this._chat.length; i += chatOutputMaxLength) {
			await fs.outputJson(
				path.join(this._archiveDir, `${this._interpretedMeta.storyId}.chat.${outputIndex}.json`),
				this._chat.slice(i, i + chatOutputMaxLength)
			);
			outputIndex++;
		}
		if (this._chatFailures.length > 0) {
			await fs.outputJson(
				path.join(this._archiveDir, `${this._interpretedMeta.storyId}.chat.${outputIndex}.json`),
				this._chatFailures
			);
		}
		return this._chat;
	}

	addImage(url) {
		this._images.set(url, "");
	}

	getAllImageUrls() {
		return this._images.keys();
	}

	async downloadImage(url) {
		const imagePath = await downloadImage(url, this._imagesPath);
		this._images.set(url, imagePath);
	}

	async commitImageMap() {
		const mapObject = {};
		for (const [key, value] of this._images.entries()) {
			mapObject[key] = value;
		}
		await fs.outputJson(path.join(this._archiveDir, `${this._interpretedMeta.storyId}.imagemap.json`), mapObject);
	}

}
