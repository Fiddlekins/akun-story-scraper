import fs from 'fs-extra';
import path from 'path';
import downloadImage from "./downloadImage.js";
import ItemStats from "./ItemStats.js";
import SaverBase from "./SaverBase.js";

export function getChatFileName(storyId, index) {
	return `${storyId}.chat.${index}.json`;
}

export function getImagesFileName(storyId) {
	return `${storyId}.imagemap.json`;
}

export function getStoryOnlyImagesFileName(storyId) {
	return `${storyId}.imagemap-story.json`;
}



export default class DefaultSaver extends SaverBase {

	constructor({workDir}) {
		super({workDir});
		this._chat = [];
		this._knownChatIds = new Set();
		this._chatFailures = [];
		this._images = new Map();
	}

	initializeMissingChatTracker() {
		// do nothing
	}

	addChatPosts(posts) {
		const stats = new ItemStats();
		for (const post of posts) {
			if (!this._knownChatIds.has(post._id)) {
				this._knownChatIds.add(post._id);
				stats.added += 1;
			}
			this._chat.push(post);
		}
		return stats;
	}

	addChatFailure(reason, postsPerPage, pageIndex) {
		this._chatFailures.push({
			failedToRetrieveChatPage: true,
			postsPerPage,
			pageIndex,
			reason,
		});
	}

	recordMissingChatPosts() {
		// not supported in the default saver
		return 0;
	}

	getChat() {
		return this._chat;
	}

	async commitChat(chatOutputMaxLength) {
		let outputIndex = 0;
		for (let i = 0; i < this._chat.length; i += chatOutputMaxLength) {
			await fs.outputJson(
				path.join(this._archiveDir, getChatFileName(this._interpretedMeta.storyId, outputIndex)),
				this._chat.slice(i, i + chatOutputMaxLength)
			);
			outputIndex++;
		}
		if (this._chatFailures.length > 0) {
			await fs.outputJson(
				path.join(this._archiveDir, getChatFileName(this._interpretedMeta.storyId, outputIndex)),
				this._chatFailures
			);
		}
		return this._chat;
	}

	addImage(url) {
		if (!url) {
			return;
		}
		this._images.set(url, "");
	}

	getNewImageUrls() {
		return this._images.keys();
	}

	async downloadImage(url) {
		if (!url) {
			return;
		}
		const imagePath = await downloadImage(url, this._imagesPath);
		this._images.set(url, imagePath);
	}

	async commitImageMap() {
		const mapObject = {};
		for (const [key, value] of this._images.entries()) {
			mapObject[key] = value;
		}
		await fs.outputJson(path.join(this._archiveDir, getImagesFileName(this._interpretedMeta.storyId)), mapObject);
	}

}
