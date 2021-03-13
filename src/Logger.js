import fs from 'fs-extra';
import path from 'path';
import { sprintf } from 'sprintf-js';

export default class Logger {
	constructor(settings = {}) {
		this._logDebug = settings.debug === undefined ? true : settings.debug;
		this._logLog = settings.log === undefined ? true : settings.log;
		this._logError = settings.error === undefined ? true : settings.error;
		this._logPath = settings.path || 'logs';
		this._eol = settings.eol || '\n';
		this._logStream = null;
		this._createLogFile();
		this._buffer = [];
		this._write(`akun-story-scraper started at ${this._getDateString()}`);

		this.debug = this._debug.bind(this);
		this.log = this._log.bind(this);
		this.error = this._error.bind(this);
	}

	_debug(...params) {
		if (this._logDebug) {
			const line = `${this._getDateString()}\t[DEBUG]\t${params.join(' ')}`;
			console.log(line);
			this._write(line);
		}
	}

	_log(...params) {
		if (this._logLog) {
			const line = `${this._getDateString()}\t[LOG]\t${params.join(' ')}`;
			console.log(line);
			this._write(line);
		}
	}

	_error(...params) {
		if (this._logError) {
			const line = `${this._getDateString()}\t[ERROR]\t${params.join(' ')}`;
			console.error(line);
			this._write(line);
		}
	}

	async _createLogFile() {
		await fs.ensureDir(this._logPath);
		this._logStream = fs.createWriteStream(path.join(this._logPath, 'akun-story-scraper.log'));
		for (const line of this._buffer) {
			this._logStream.write(line);
		}
	}

	_write(line) {
		line += this._eol;
		if (this._logStream) {
			this._logStream.write(line);
		} else {
			this._buffer.push(line);
		}
	}

	_getDateString() {
		return (new Date()).toISOString();
	}

	logSection(index, total, name, samePosts, updatedPosts, newPosts) {
		const line = sprintf(
			'Section %3d / %3d | %s | %s | %s | %s',
			index,
			total,
			sprintf('%4d same', samePosts),
			updatedPosts ? sprintf('%4d up', updatedPosts) : '       ',
			newPosts ? sprintf('%4d new', newPosts) : '        ',
			name
		);
		this._log(line);
	}

	/**
	 * @param {ItemStats} stats
	 */
	logChatStats(index, total, stats) {
		const prefix = (!index && !total) ? 'Total chat stats  ' : sprintf('Page %5d / %5d', index, total);
		const line = sprintf(
			prefix + ' | %s | %s | %s | %s | %s |',
			stats.same ? sprintf('%3d same', stats.same) : '        ',
			stats.updatedBody ? sprintf('%3d upd', stats.updatedBody) : '       ',
			stats.updatedTs ? sprintf('%3d uTS', stats.updatedTs) : '       ',
			stats.added ? sprintf('%3d new', stats.added) : '       ',
			stats.resurrected ? sprintf('%3d rez', stats.resurrected) : '       '
		);
		this._log(line);
	}
}
