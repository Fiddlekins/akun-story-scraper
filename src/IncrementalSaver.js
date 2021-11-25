import fs from 'fs-extra';
import path from 'path';
import downloadImage from "./downloadImage.js";
import ItemStats from "./ItemStats.js";
import {getChatFileName, getImagesFileName, getStoryOnlyImagesFileName} from "./DefaultSaver.js";
import SaverBase, {getChaptersFileName} from "./SaverBase.js";

export default class IncrementalSaver extends SaverBase {

	constructor({workDir}) {
		super({workDir});
		this._chatPostById = new Map();
		this._chatFailures = [];
		this._missingChatIds = new Set();
		this._images = new Map();
		this._storyOnlyImages = new Set();
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

	initializeMissingChatTracker() {
		for (const [id, post] of this._chatPostById.entries()) {
			if (!post.missing) {
				this._missingChatIds.add(id);
			}
		}
	}

	addChatPosts(posts) {
		const stats = new ItemStats();
		for (const post of posts) {
			const oldPost = this._chatPostById.get(post._id);
			if (!!oldPost) {
				if (post.b !== oldPost.b) {
					stats.updatedBody += 1;
				} else if (post.ut !== oldPost.ut) {
					stats.updatedTs += 1;
				} else {
					stats.same += 1;
				}
				if (oldPost.missing) {
					stats.resurrected += 1;
				}
			} else {
				stats.added += 1;
			}
			this._chatPostById.set(post._id, post);
			this._missingChatIds.delete(post._id);
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
		for (const id of this._missingChatIds) {
			const post = this._chatPostById.get(id);
			if (post) {
				post.missing = true;
			}
		}
		return this._missingChatIds.size;
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
				path.join(this._archiveDir, getChatFileName(this._interpretedMeta.storyId, 'failures')),
				this._chatFailures
			);
		}
		return chat;
	}

	addImage(url, includeInStoryOnly) {
		if (!this._images.has(url)) {
			this._images.set(url, "");
		}
		if (includeInStoryOnly) {
			this._storyOnlyImages.add(url);
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
		const storyOnlyObject = {};
		for (const [key, value] of this._images.entries()) {
			mapObject[key] = value;
			if (this._storyOnlyImages.has(key)) {
				storyOnlyObject[key] = value;
			}
		}
		await fs.outputJson(path.join(this._archiveDir, getImagesFileName(this._interpretedMeta.storyId)), mapObject);
		await fs.outputJson(path.join(this._archiveDir, getStoryOnlyImagesFileName(this._interpretedMeta.storyId)), storyOnlyObject);
	}

}
