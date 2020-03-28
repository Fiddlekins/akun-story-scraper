import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import {fileURLToPath} from "url";

const projectRoot = path.join(fileURLToPath(import.meta.url), '..', '..');
const stagePath = path.join(projectRoot, 'stage');
const outputPath = path.join(projectRoot, 'dest');

async function ensureDirsExist() {
	await Promise.all([
		fs.ensureDir(stagePath),
		fs.ensureDir(outputPath)
	]);
}

async function emptyDirs() {
	await Promise.all([
		fs.emptyDir(stagePath),
		fs.emptyDir(outputPath)
	]);
}

async function copyCode() {
	await Promise.all([
		fs.copy(path.join(projectRoot, 'src'), path.join(stagePath, 'src')),
		fs.copy(path.join(projectRoot, 'node_modules'), path.join(stagePath, 'node_modules'))
	]);
}

async function copyNode() {
	await fs.copy(path.join(projectRoot, 'build', 'bin'), path.join(stagePath, 'bin'));
}

async function createLauncher() {
	const launcherContent = `bin\\node.exe src\\index.js\r\npause`;
	await fs.writeFile(path.join(stagePath, 'run.cmd'), launcherContent, 'utf8');
}

async function zip() {
	const packageJson = await fs.readJson(path.join(projectRoot, 'package.json'));
	return new Promise((res, rej) => {
		var output = fs.createWriteStream(path.join(outputPath, `${packageJson.name}.${packageJson.version}.zip`));
		var archive = archiver('zip', {
			zlib: {level: 9}
		});
		output.on('close', function () {
			res();
		});
		archive.on('error', function (err) {
			rej(err);
		});
		archive.pipe(output);
		archive.directory(stagePath + '/', false);
		archive.finalize();
	});
}

async function cleanUp() {
	await Promise.all([
		fs.remove(stagePath)
	]);
}

function exitWithError(err) {
	console.error(err);
	process.exit(1);
}

async function build() {
	await ensureDirsExist();
	await emptyDirs();
	await Promise.all([
		copyNode(),
		copyCode(),
		createLauncher()
	]);
	await zip();
	await cleanUp();
}

build().catch(exitWithError);
