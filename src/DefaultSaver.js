import fs from 'fs-extra';
import path from 'path';
import downloadImage from "./downloadImage.js";
import SaverBase from "./SaverBase.js";

export function getChatFileName(storyId, index) {
	return `${storyId}.chat.${index}.json`;
}

export function getImagesFileName(storyId) {
	return `${storyId}.imagemap.json`;
}



export default class DefaultSaver extends SaverBase {

	constructor({workDir}) {
		super({workDir});
		this._chat = [];
		this._knownChatIds = new Set();
		this._chatFailures = [];
		this._images = new Map();
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
		this._images.set(url, "");
	}

	getNewImageUrls() {
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
		await fs.outputJson(path.join(this._archiveDir, getImagesFileName(this._interpretedMeta.storyId)), mapObject);
	}

}
