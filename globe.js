(function () {
  var TARGET_NAMES = ['China', 'United States of America', 'India', 'United Kingdom', 'Ireland', 'Morocco', 'Italy'];

  var PIN_COORDS = {
    'China': [104.1, 35.8],
    'United States of America': [-98.5, 39.8],
    'India': [78.9, 20.6],
    'United Kingdom': [-2.5, 54.5],
    'Ireland': [-8, 53.3],
    'Morocco': [-6.5, 31.8],
    'Italy': [12.5, 42.5]
  };

  function init() {
    var canvas = document.getElementById('globe');
    if (!canvas || typeof d3 === 'undefined') return;
    var context = canvas.getContext('2d');
    var size = canvas.width;
    var radius = size / 2 - 34;

    var projection = d3.geoOrthographic()
      .scale(radius)
      .translate([size / 2, size / 2])
      .clipAngle(90);
    var path = d3.geoPath(projection, context);
    var graticule = d3.geoGraticule10();

    var rotation = [10, -12];
    var dragging = false;
    var last = [0, 0];
    var countries = null;

    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function (r) { return r.json(); })
      .then(function (world) {
        var feats = topojson.feature(world, world.objects.countries).features;
        countries = feats.filter(function (f) {
          return TARGET_NAMES.indexOf(f.properties.name) !== -1;
        });
      })
      .catch(function () { countries = []; });

    function drawPin(x, y, scale, angle) {
      var s = Math.max(scale, 0.34);
      var rodLength = 19 * s;
      var rodWidth = 2.6 * s;
      context.save();
      context.translate(x, y);
      context.rotate(angle);

      // shadow where the rod meets the surface
      context.beginPath();
      context.ellipse(0, 1, rodWidth * 1.6, rodWidth * 0.7, 0, 0, Math.PI * 2);
      context.fillStyle = 'rgba(0,0,0,0.16)';
      context.fill();

      // iron rod
      var rodGrad = context.createLinearGradient(-rodWidth / 2, 0, rodWidth / 2, 0);
      rodGrad.addColorStop(0, '#6b7178');
      rodGrad.addColorStop(0.5, '#e4e7ea');
      rodGrad.addColorStop(1, '#4d5257');
      context.fillStyle = rodGrad;
      context.fillRect(-rodWidth / 2, -rodLength, rodWidth, rodLength);

      // red ball tip
      var ballR = 4.6 * s;
      var ballGrad = context.createRadialGradient(-ballR * 0.3, -rodLength - ballR * 0.35, ballR * 0.15, 0, -rodLength, ballR);
      ballGrad.addColorStop(0, '#ff7a6b');
      ballGrad.addColorStop(0.55, '#c0392b');
      ballGrad.addColorStop(1, '#7e2015');
      context.beginPath();
      context.arc(0, -rodLength, ballR, 0, Math.PI * 2);
      context.fillStyle = ballGrad;
      context.fill();

      context.restore();
    }

    function render() {
      context.clearRect(0, 0, size, size);
      projection.rotate(rotation);

      context.beginPath();
      path({ type: 'Sphere' });
      context.fillStyle = '#fcfcfb';
      context.fill();

      context.beginPath();
      path(graticule);
      context.strokeStyle = 'rgba(20,20,20,0.07)';
      context.lineWidth = 0.6;
      context.stroke();

      context.beginPath();
      path({ type: 'Sphere' });
      context.strokeStyle = 'rgba(20,20,20,0.22)';
      context.lineWidth = 1;
      context.stroke();

      if (countries && countries.length) {
        countries.forEach(function (f) {
          context.save();
          context.shadowColor = 'rgba(37,99,235,0.9)';
          context.shadowBlur = 14;
          context.beginPath();
          path(f);
          context.fillStyle = 'rgba(59,130,246,0.55)';
          context.fill();
          context.restore();

          context.beginPath();
          path(f);
          context.strokeStyle = 'rgba(29,78,216,0.9)';
          context.lineWidth = 1.1;
          context.stroke();
        });
      }

      var rotateFn = d3.geoRotation(rotation);
      var pins = [];
      Object.keys(PIN_COORDS).forEach(function (name) {
        var coord = PIN_COORDS[name];
        var xy = projection(coord);
        if (!xy) return;
        var r = rotateFn(coord);
        var lambda = (r[0] * Math.PI) / 180;
        var phi = (r[1] * Math.PI) / 180;
        var z = Math.cos(phi) * Math.cos(lambda);
        pins.push({ x: xy[0], y: xy[1], z: z });
      });
      pins.sort(function (a, b) { return a.z - b.z; });

      var cx = size / 2, cy = size / 2;
      pins.forEach(function (p) {
        var scale = 0.55 + 0.55 * p.z;
        var outX = p.x - cx, outY = p.y - cy;
        var angle = Math.atan2(outX, -outY);
        drawPin(p.x, p.y, scale, angle);
      });
    }

    function tick() {
      if (!dragging) rotation[0] += 0.15;
      render();
      requestAnimationFrame(tick);
    }

    function startDrag(x, y) { dragging = true; last = [x, y]; }
    function moveDrag(x, y) {
      if (!dragging) return;
      var dx = x - last[0], dy = y - last[1];
      rotation[0] += dx * 0.3;
      rotation[1] = Math.max(-80, Math.min(80, rotation[1] - dy * 0.3));
      last = [x, y];
    }
    function endDrag() { dragging = false; }

    canvas.addEventListener('mousedown', function (e) { startDrag(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { moveDrag(e.clientX, e.clientY); });
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', function (e) { var t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchmove', function (e) { var t = e.touches[0]; moveDrag(t.clientX, t.clientY); }, { passive: true });
    window.addEventListener('touchend', endDrag);

    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
