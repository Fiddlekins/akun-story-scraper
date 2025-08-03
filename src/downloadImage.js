import fs from 'fs-extra';
import imageType from 'image-type';
import path from 'path';
import sanitize from 'sanitize-filename';
import { Readable } from 'stream';
import {imageURLParser} from './imageURLParser.js';

export default async function downloadImage(imageUrl, dest) {
	imageUrl = imageURLParser(imageUrl);
	const url = new URL(imageUrl);
	const segments = url.href.replace(`${url.protocol}//`, '').split('/').map(segment => sanitize(segment, {replacement: '!'}));
	let imagePath = path.join(...segments);

	await fs.ensureDir(path.join(dest, path.dirname(imagePath)));

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Response status: ${response.status}`);
	}

	// read some data to determine image type and maybe adjust the file extension
	const reader = response.body.getReader();
	// todo: accumulate chunks until reaching imageType.minimumBytes
	const { value: chunk, done } = await reader.read();
	reader.releaseLock();
	if (done) {
		throw new Error(`Response has no data for ${imageUrl}`);
	}

	const maybeImageType = imageType(chunk);
	if (maybeImageType) {
		const {ext} = maybeImageType;
		if (path.extname(imagePath) !== `.${ext}`) {
			imagePath += `.${ext}`;
		}
	}

	const fileWriteable = fs.createWriteStream(path.join(dest, imagePath), {encoding: null});

	// don't forget to write the data we used for image type detection
	fileWriteable.write(chunk, null);

	// adapt web stream to node stream for pumping data
	Readable.fromWeb(response.body).pipe(fileWriteable);
	// unfortunately, node streams aren't async-friendly, so we have to adapt
	await new Promise((res, rej) => fileWriteable.on('finish', res).on('error', rej));

	return imagePath;
}
