import Striver from "../Striver.js";
import fs from "fs-extra";
import path from "path";

class AkunApiWrapperBase {
  _logger;

  constructor(logger) {
    this._logger = logger;
  }

  /** @return {PromiseLike<*>} */
  getStoryMetadata(storyId) {
    throw "not implemented";
  }

  /** @return {PromiseLike<*>} */
  getStoryChapters(storyId, startTs, endTs) {
    throw "not implemented";
  }

  getThreading(storyId) {
    throw "not implemented";
  }

  getChatPages(storyId) {
    throw "not implemented";
  }

  getChatPage(storyId, cpr, firstCT, lastCT, page, retryAttempts) {
    throw "not implemented";
  }
}

export class DefaultAkunApiWrapper extends AkunApiWrapperBase {
  _akun;
  _striver;

  constructor(logger, akun, {retryWaitTime = 500} = {}) {
    super(logger);
    this._akun = akun;
    this._striver = new Striver({waitTime: retryWaitTime, logger});
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

  getStoryMetadata(storyId) {
    return this._striver.handle(() => this._api(`/api/node/${storyId}`));
  }

  getStoryChapters(storyId, startTs, endTs) {
    return this._striver.handle(
      () => this._api(`/api/anonkun/chapters/${storyId}/${startTs}/${endTs}`),
      30
    );
  }

  getThreading(storyId) {
    return this._striver.handle(() => this._api(`/api/chat/${storyId}/threading`));
  }

  getChatPages(storyId) {
    return this._striver.handle(() => this._api(`/api/chat/pages`, {'r': storyId}));
  }

  getChatPage(storyId, cpr, firstCT, lastCT, page, retryAttempts) {
    const pagePostData = {
      r: storyId,
      threading: 'threading',
      cpr,
      firstCT,
      lastCT,
      page,
    };
    return this._striver.handle(
      () => this._api(`/api/chat/page`, pagePostData),
      retryAttempts
    );
  }
}

class RecordingAwareAkunApiWrapperBase extends AkunApiWrapperBase {
  /** @type AkunApiWrapperBase */
  _actual;
  _recordingDirectory;

  constructor(logger, actual, recordingDirectory) {
    super(logger);
    this._actual = actual;
    this._recordingDirectory = recordingDirectory;
  }

  _getStoryMetadataFileName(storyId) {
    return path.join(this._recordingDirectory, storyId, 'metadata.json');
  }

  getStoryMetadata(...args) {
    return this._magic(
      this._actual.getStoryMetadata,
      this._getStoryMetadataFileName,
      ...args
    );
  }

  _getStoryChaptersFileName(storyId, startTs, endTs) {
    return path.join(this._recordingDirectory, storyId, `chapters-${startTs}-${endTs}.json`);
  }

  getStoryChapters(...args) {
    return this._magic(
      this._actual.getStoryChapters,
      this._getStoryChaptersFileName,
      ...args
    );
  }

  _getThreadingFileName(storyId) {
    return path.join(this._recordingDirectory, storyId, 'threading.json');
  }

  getThreading(...args) {
    return this._magic(
      this._actual.getThreading,
      this._getThreadingFileName,
      ...args
    );
  }

  _getChatPagesFileName(storyId) {
    return path.join(this._recordingDirectory, storyId, 'chat-pages.json');
  }

  getChatPages(...args) {
    return this._magic(this._actual.getChatPages, this._getChatPagesFileName, ...args);
  }

  _getChatPageFileName(storyId, cpr, firstCT, lastCT, page, retryAttempts) {
    return path.join(
      this._recordingDirectory,
      storyId,
      `chat-page-${cpr}-${firstCT}-${lastCT}-${page}.json`
    );
  }

  getChatPage(...args) {
    return this._magic(this._actual.getChatPage, this._getChatPageFileName, ...args);
  }
}

export class SavingAkunApiWrapper extends RecordingAwareAkunApiWrapperBase {
  /**
   * @param {AkunApiWrapperBase} actual
   */
  constructor(logger, actual, recordingDirectory) {
    super(logger, actual, recordingDirectory);
  }

  async _magic(invokeActual, getFilename, ...args) {
    const result = await invokeActual.call(this._actual, ...args);
    await fs.outputJson(getFilename.call(this, ...args), result);
    return result;
  }
}

export class ReplayingAkunApiWrapper extends RecordingAwareAkunApiWrapperBase {
  /**
   * @param {AkunApiWrapperBase} actual
   */
  constructor(logger, actual, recordingDirectory) {
    super(logger, actual, recordingDirectory);
  }

  async _magic(invokeActual, getFilename, ...args) {
    const filePath = getFilename.call(this, ...args);
    const exists = await fs.pathExists(filePath);
    return await (exists ? fs.readJson(filePath) : invokeActual.call(this._actual, ...args));
  }
}
