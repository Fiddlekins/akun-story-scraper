import {imageURLParser} from "../imageURLParser.js";

export default function formatAvatarSrc(src, size = 64) {
	return imageURLParser(src, size, size);
}
