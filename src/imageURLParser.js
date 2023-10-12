/**
 * Code copied from akun site code, parameter meanings deduced
 * @param e Input URL
 * @param t Optional. Target location width
 * @param n Optional. Target location height
 * @param i Optional. Value can be "nocfill"
 * @param r Optional. Value can be "storyCover"
 * @returns {*}
 */
export function imageURLParser(e, t, n, i, r) {
  function a() {
    return 400 == t || 16 == t || 24 == t || 60 == t || 80 == t || 100 == t ? !0 : !1
  }

  function o(e) {
    return e.split("?")[0]
  }

  if (e && "string" == typeof e) {
    "object" == typeof e && (e = e[0]);
    var s;
    return r && (s = !0),
      t && n ? (i && (s && (-1 != e.indexOf("filepicker.io") && (e = e.replace(/www\.filepicker\.io\/api\/file\/(\w+)/g, "cdn4.fiction.live/fp/$1?height=" + n + "&width=" + t + "&quality=95")),
        e = e.replace(/(\w+)\.cloudfront.net\/(.+)/g, "cdn4.fiction.live/$2?height=" + n + "&width=" + t + "&quality=95").replace(/cdn3.fiction.live\/(.+)/g, "cdn4.fiction.live/$1?height=" + n + "&width=" + t + "&quality=95")),
      -1 != e.indexOf("filepicker.io") && (e = e.replace(/www\.filepicker\.io\/api\/file\/(\w+)/g, "cdn4.fiction.live/fp/$1?height=" + n + "&width=" + t + "&quality=95")),
        e = e.replace(/cdn3.fiction.live\/(.+)/g, "cdn4.fiction.live/$1?height=" + n + "&width=" + t + "&quality=95")),
      -1 != e.indexOf("filepicker.io") && (e = e.replace(/www\.filepicker\.io\/api\/file\/(\w+)/g, "cdn4.fiction.live/fp/$1?height=" + n + "&width=" + t + "&quality=95&aspect_ratio=" + t + ":" + n)),
        e = e.replace(/(\w+)\.cloudfront.net\/(.+)/g, "cdn4.fiction.live/$2?height=" + n + "&width=" + t + "&quality=95&aspect_ratio=" + t + ":" + n).replace(/cdn3.fiction.live\/(.+)/g, "cdn4.fiction.live/$1?height=" + n + "&width=" + t + "&quality=95&aspect_ratio=" + t + ":" + n),
        e = o(e),
      a() && (e = e.replace(/cdn6.fiction.live\/file\/fictionlive\/(.+)/g, "cdn6.fiction.live/file/fictionlive/thumb/$1").replace(/cdn4.fiction.live\/(.+)/g, "cdn6.fiction.live/file/fictionlive/thumb/$1").replace(/cdn3.fiction.live\/(.+)/g, "cdn6.fiction.live/file/fictionlive/thumb/$1")),
        e = e.replace(/cdn4.fiction.live\/(.+)/g, "cdn6.fiction.live/file/fictionlive/$1")) : (e = e.replace(/(\w+)\.cloudfront.net/g, "cdn6.fiction.live/file/fictionlive").replace(/www\.filepicker\.io\/api\/file\/(\w+)/g, "cdn4.fiction.live/fp/$1"),
        e = e.replace(/cdn4.fiction.live\/(.+)/g, "cdn6.fiction.live/file/fictionlive/$1").replace(/cdn3.fiction.live\/(.+)/g, "cdn6.fiction.live/file/fictionlive/$1")),
      e
  }
}
