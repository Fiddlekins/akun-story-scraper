import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = path.join(fileURLToPath(import.meta.url), '..', '..');
export const credentialsPath = path.join(projectRoot, 'credentials.json');
export const defaultLogPath = path.join(projectRoot, 'logs');
export const defaultTargetListPath = path.join(projectRoot, 'targetlist.txt');
export const defaultSkipListPath = path.join(projectRoot, 'skiplist.txt');
