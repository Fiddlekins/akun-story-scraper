import fs from 'fs-extra';
import path from 'path';
import downloadImage from "./downloadImage.js";
import {getChatFileName, getImagesFileName} from "./DefaultSaver.js";
import SaverBase, {getChaptersFileName} from "./SaverBase.js";

export default class IncrementalSaver extends SaverBase {

	constructor({workDir}) {
		super({workDir});
		this._chatPostById = new Map();
		this._chatFailures = [];
		this._images = new Map();
	}

	async setMetadata(raw, interpreted) {
		await super.setMetadata(raw, interpreted);

		{
			const chaptersFilePath = path.join(this._archiveDir, getChaptersFileName(this._interpretedMeta.storyId));
			if (await fs.pathExists(chaptersFilePath)) {
				const oldChapters = await fs.readJson(chaptersFilePath);
				for (const ch of oldChapters) {
					this.setChapter(ch);
				}
			}
			this.newChapterCount = 0;
			this.updatedChapterCount = 0;
		}

		let chatFileIndex = 0;
		while (true) {
			const chatFilePath = path.join(this._archiveDir, getChatFileName(this._interpretedMeta.storyId, chatFileIndex));
			if (await fs.pathExists(chatFilePath)) {
				const oldMessages = await fs.readJson(chatFilePath);
				this.addChatPosts(oldMessages);
				chatFileIndex += 1;
			} else {
				break;
			}
		}

		const imagesFilePath = path.join(this._archiveDir, getImagesFileName(this._interpretedMeta.storyId));
		if (await fs.pathExists(imagesFilePath)) {
			const oldImages = await fs.readJson(imagesFilePath);
			for (const k of Object.getOwnPropertyNames(oldImages)) {
				this._images.set(k, oldImages[k]);
			}
		}
	}

	getArchiveDir() {
		return this._archiveDir;
	}

	addChatPosts(posts) {
		let news = 0;
		for (const post of posts) {
			const oldPost = this._chatPostById.get(post._id);
			let update = false;
			if (!!oldPost) {
				update = post.b !== oldPost.b;
			} else {
				update = true;
			}
			if (update) {
				this._chatPostById.set(post._id, post);
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
		const chat = [];
		for (const [id, post] of this._chatPostById.entries()) {
			chat.push(post);
		}
		return chat;
	}

	async commitChat(chatOutputMaxLength) {
		const chat = this.getChat();
		let outputIndex = 0;
		for (let i = 0; i < chat.length; i += chatOutputMaxLength) {
			await fs.outputJson(
				path.join(this._archiveDir, getChatFileName(this._interpretedMeta.storyId, outputIndex)),
				chat.slice(i, i + chatOutputMaxLength)
			);
			outputIndex++;
		}
		if (this._chatFailures.length > 0) {
			await fs.outputJson(
				path.join(this._archiveDir, getChatFileName(this._interpretedMeta.storyId, outputIndex)),
				this._chatFailures
			);
		}
		return chat;
	}

	addImage(url) {
		if (!this._images.has(url)) {
			this._images.set(url, "");
		}
	}

	getNewImageUrls() {
		function* filterImages(images) {
			for (const [k, v] of images) {
				if (v === "") {
					yield k;
				}
			}
		}
		return filterImages(this._images);
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
