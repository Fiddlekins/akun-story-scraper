'use strict';

const fs = require('fs-extra');
const path = require('path');

class Logger {
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
}

module.exports = Logger;
