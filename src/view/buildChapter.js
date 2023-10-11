import {imageURLParser} from "../imageURLParser.js";

export default function buildChapter($content, update) {
  $content.innerHTML = update['b'];

  try {
    $content.querySelectorAll('img').forEach(el => {
      el.src = imageURLParser(el.src);
    });
  } catch (err) {
    console.error(err);
  }
}
