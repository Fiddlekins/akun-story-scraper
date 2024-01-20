import path from "path";
import fs from 'fs-extra';
import yaml from 'js-yaml';

export default class StoryList {
	constructor({workDir}) {
		this._theFile = path.join(workDir, 'targets.yaml');
		this._stories = [];
	}

	getStories() {
		return this._stories;
	}

	async read() {
		if (await fs.pathExists(this._theFile)) {
			const storyConfigs = yaml.safeLoad(await fs.readFile(this._theFile));
			for (const id of Object.getOwnPropertyNames(storyConfigs)) {
				const storyConfig = storyConfigs[id];
				const target = {
					id,
					chatMode: storyConfig && storyConfig.chat || 'skip',
					downloadImages: storyConfig && storyConfig.img || false,
					author: storyConfig && storyConfig.author || undefined,
					html: storyConfig && storyConfig.html || false,
				};
				this._stories.push(target);
			}
		}
		return this.getStories();
	}
}
