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

let maxVal = 0;

function guessDevicePixelRatio() {
  const elem = document.getElementById('box');
  elem.innerText = 'window.devicePixelRatio = ' + window.devicePixelRatio + '\n';
  elem.innerText += 'guessed devicePixelRatio = ' + (maxVal || '??? please scroll a bit') + '\n';
}

let lastseen = null;

window.addEventListener('scroll', () => {
  if (window.scrollY) {
    let frac = toFraction(window.scrollY);
    if (lastseen) {
      const gcd = gcdFraction(lastseen, frac);
      lastSeen = gcd;
      maxVal = Math.max(gcd[1] / gcd[0], maxVal);
      guessDevicePixelRatio();
    } else {
      lastseen = frac;
    }
  }
});

window.addEventListener('load', () => {
  window.scrollTo(0, 0);
  lastseen = null;
  maxVal = 0;
  guessDevicePixelRatio();
});
