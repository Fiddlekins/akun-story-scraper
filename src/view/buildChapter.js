export default function buildChapter($content, update, resolveResource) {
	$content.innerHTML = update['b'];
	$content.querySelectorAll('img').forEach((img) => {
		img.src = resolveResource(img.src);
	});
}
