import path from "path";
import fs from "fs-extra";

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

export function getMetadataFileName(storyId) {
  return `${storyId}.metadata.json`;
}

export function getChaptersFileName(storyId) {
  return `${storyId}.chapters.json`;
}

export const UpdateResult = {
  New: Symbol('object was new'),
  Updated: Symbol('object was updated'),
  Same: Symbol('object was the same as old'),
};
Object.freeze(UpdateResult);


export default class SaverBase {

  constructor({workDir}) {
    this._workDir = workDir;
    this._archiveDir = null;
    this._imagesPath = null;
    this._interpretedMeta = null;

    this._chapters = [];
    this._knownChapterIds = new Set();
    this._chapterIndexById = new Map();
    this.newChapterCount = 0;
    this.updatedChapterCount = 0;
  }

  async setMetadata(raw, interpreted) {
    this._interpretedMeta = interpreted;

    this._archiveDir = path.join(
      this._workDir,
      sanitise(this._interpretedMeta.author),
      `${sanitise(this._interpretedMeta.storyTitle).slice(0, 50)}_${this._interpretedMeta.storyId}`
    );
    this._imagesPath = path.join(this._archiveDir, 'images');

    await fs.outputJson(path.join(this._archiveDir, getMetadataFileName(this._interpretedMeta.storyId)), raw);
  }

  setChapter(chapter) {
    if (this._chapterIndexById.has(chapter._id)) {
      const index = this._chapterIndexById.get(chapter._id);
      const oldChapter = this._chapters[index];
      this._chapters[index] = chapter;
      if (oldChapter.b === chapter.b) {
        return UpdateResult.Same;
      } else {
        this.updatedChapterCount += 1;
        return UpdateResult.Updated;
      }
    }
    this._chapterIndexById.set(chapter._id, this._chapters.length);
    this._chapters.push(chapter);
    this.newChapterCount += 1;
    return UpdateResult.New;
  }

  setAppendix(appendix) {
    return this.setChapter(appendix);
  }

  async commitChapters() {
    await fs.outputJson(path.join(this._archiveDir, getChaptersFileName(this._interpretedMeta.storyId)), this._chapters);
    return this._chapters;
  }

};
