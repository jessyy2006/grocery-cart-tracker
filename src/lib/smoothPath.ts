/**
 * Monotone cubic Hermite interpolation (Fritsch-Carlson) through a point set.
 *
 * Guarantees the curve never overshoots its inputs — so a zero month next to a
 * tall one can't push the spending line below the baseline. Lives here rather
 * than beside the yearly receipt so the onboarding hero can draw the same curve
 * without pulling the receipt's dialog and share machinery into its bundle.
 */
export function smoothPath(points: [number, number][]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0][0]} ${points[0][1]}`;

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = []; // secant slopes
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    dy[i] = ys[i + 1] - ys[i];
    m[i] = dy[i] / dx[i];
  }

  // tangents at each point
  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0; // local extremum — flatten to avoid overshoot
    } else {
      t[i] = (m[i - 1] + m[i]) / 2;
    }
  }
  // Fritsch–Carlson monotonicity adjustment
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      t[i] = tau * a * m[i];
      t[i + 1] = tau * b * m[i];
    }
  }

  const d = [`M ${xs[0]} ${ys[0]}`];
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    const cp1x = xs[i] + h / 3;
    const cp1y = ys[i] + (t[i] * h) / 3;
    const cp2x = xs[i + 1] - h / 3;
    const cp2y = ys[i + 1] - (t[i + 1] * h) / 3;
    d.push(
      `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${xs[i + 1]} ${ys[i + 1]}`
    );
  }
  return d.join(" ");
}
