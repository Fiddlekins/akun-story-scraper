class Throttler {
	constructor(options = {}) {
		this._maxConcurrentPromises = options.maxConcurrentPromises || 20;
		this._retryAttempts = options.retryAttempts || 5;
		this._queue = [];
		this._activePromises = 0;
	}

	queue(promiseGenerator) {
		return new Promise((resolve, reject) => {
			this._queue.push({
				promiseGenerator,
				resolve,
				reject
			});
			setTimeout(() => {
				this._tryToShiftQueue();
			}, 1);
		});
	}

	_tryToShiftQueue() {
		if (this._activePromises < this._maxConcurrentPromises) {
			if (this._queue.length) {
				this._activePromises++;
				this._tryToExecute(this._queue.shift());
			}
		}
	}

	async _tryToExecute(item, remainingAttempts = this._retryAttempts) {
		try {
			const ret = await item.promiseGenerator();
			this._activePromises--;
			item.resolve(ret);
			this._tryToShiftQueue();
		} catch (err) {
			if (remainingAttempts > 0) {
				this._tryToExecute(item, --remainingAttempts);
			} else {
				this._activePromises--;
				item.reject(err);
				this._tryToShiftQueue();
			}
		}
	}
}

module.exports = Throttler;