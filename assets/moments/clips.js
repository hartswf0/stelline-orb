/* shared by moments.html and designs.html: renders reference clips with download links from assets/moments/catalog.json */
window.CLIPS = (function () {
  var cat = null, ready = fetch('assets/moments/catalog.json').then(function (r) { return r.json(); }).then(function (c) { cat = c; return c; });
  function fmt(s) { return Math.floor(s / 60) + ':' + (s % 60).toFixed(2).padStart(5, '0'); }
  function card(f, label, meta) {
    var d = document.createElement('figure'); d.className = 'clip';
    d.innerHTML = '<video src="assets/moments/' + f + '" controls loop muted playsinline preload="metadata"></video><figcaption><b>' + label + '</b><br>' + meta + ' · <a href="assets/moments/' + f + '" download>download mp4</a></figcaption>';
    return d;
  }
  return {
    ready: ready,
    ids: function () { return Object.keys(cat.shots).map(Number); },
    shots: function (ids, box) { ids.forEach(function (i) { var s = cat.shots[i]; box.append(card(s.file, s.label, 'film ' + fmt(s.t0) + '-' + fmt(s.t1) + (s.cropped ? ' · cropped to the cake' : '') + ' · ' + s.tags.join(', '))); }); },
    designs: function (names, box) { names.forEach(function (n, k) { var s = cat.designs[n]; box.append(card(s.file, 'design ' + n, 'film ' + fmt(s.t0) + '-' + fmt(s.t1) + ' · frame ' + s.frame + ' of shot ' + s.shot)); }); },
    all: function (box) { Object.keys(cat.shots).forEach(function (i) { var s = cat.shots[i]; box.append(card(s.file, 'shot ' + i + ' · ' + s.label, 'film ' + fmt(s.t0) + ' · ' + s.tags.join(', '))); }); }
  };
})();
