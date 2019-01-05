'use strict';

class Striver {
	constructor(settings) {
		this._waitTime = settings.waitTime || 500;
		this._logger = settings.logger;
		this._attempts = settings.attempts || 10;
		this._promiseGenerator = null;
		this._remainingAttempts = 0;
	}

	handle(promiseGenerator, retryAttempts) {
		this._promiseGenerator = promiseGenerator;
		this._remainingAttempts = retryAttempts || this._attempts;

		const returnPromise = new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});

		this._attemptExecution();

		return returnPromise;
	}

	_attemptExecution() {
		if (this._remainingAttempts) {
			this._remainingAttempts--;
			try {
				const promise = this._promiseGenerator();
				promise.then((result) => {
					this._resolve(result);
					this._promiseGenerator = null;
					this._resolve = null;
					this._reject = null;
				}).catch((err) => {
					if (/too many requests/i.test(err.message)) {
						this._remainingAttempts++;
					} else {
						if (this._logger) {
							this._logger.error(err);
						} else {
							console.error(err);
						}
					}
					setTimeout(this._attemptExecution.bind(this), this._waitTime);
				});
			} catch (err) {
				setImmediate(() => {
					this._reject(err);
				});
			}
		} else {
			setImmediate(() => {
				this._reject(new Error(`Exhausted retry attempts`));
				this._promiseGenerator = null;
				this._resolve = null;
				this._reject = null;
			});
		}
	}
}

module.exports = Striver;
