function closest(a, b, x) {
  return Math.abs((a[0] / a[1]) - x) < Math.abs((b[0] / b[1]) - x) ? a : b;
}

function closestFrac(x, maxDen) {
  let a = [0, 1];
  let b = [1, 1];
  let A = closest(a, b, x);
  for (;;) {
    let c = [a[0] + b[0], a[1] + b[1]];
    const g = gcd(c[0], c[1]);
    c[0] /= g;
    c[1] /= g;
    if (c[1] > maxDen) {
      return A;
    }
    A = closest(A, c, x);
    if (x >= (a[0] / a[1]) && x <= (c[0] / c[1])) {
      b = c;
    } else {
      a = c;
    }
  }
}

function gcd(a, b) {
  if (!b) {
    return a;
  }
  return gcd(b, a % b);
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

function gcdFraction([a, b], [c, d]) {
  return [gcd(a, c), lcm(b, d)];
}

function addFraction([a, b], [c, d]) {
  return [a * d + c * b, b * d];
}

function toFraction(x) {
  if (!x) {
    return [0, 1];
  }
  const floor = Math.floor(x);
  const rest = x - floor;
  return addFraction([floor, 1], closestFrac(rest, 70));
}

const measurements = {
  scrollY: { maxVal: null, lastSeen: null },
  clientRect: { maxVal: null, lastSeen: null },
};

function render() {
  const elem = document.getElementById('box');
  elem.innerText = 'window.devicePixelRatio = ' + window.devicePixelRatio + '\n';
  for (let key in measurements) {
    elem.innerText += `devicePixelRatio via ${key} = ${measurements[key].maxVal}\n`;
  }
}

window.addEventListener('scroll', () => {
  // Currently can be measured via window.scrollY or getBoundingClientRect().
  const values = {
    scrollY: window.scrollY,
    clientRect: 8 + document.body.getBoundingClientRect().height - document.body.getBoundingClientRect().bottom,
  };
  // This finds the gcd of the measurements to calculate devicePixelRatio.
  // I have the feeling there must be a much easier way to do this though.
  for (let key in values) {
    const value = values[key];
    const measurement = measurements[key];
    if (value) {
      let frac = toFraction(value);
      if (measurement.lastSeen) {
        const gcd = gcdFraction(measurement.lastSeen, frac);
        measurement.lastSeen = gcd;
        measurement.maxVal = Math.max(gcd[1] / gcd[0], measurement.maxVal);
        render();
      } else {
        measurement.lastSeen = frac;
      }
    }
  }
});

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  window.scrollTo({
    top: 100,
    behavior: 'smooth',
  });
  setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, 500);
  render();
});
