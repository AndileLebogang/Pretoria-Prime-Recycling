// Three chasing arrows, drawn from arcs. Decorative.
export default function RecycleMark({ size = 120, color = 'currentColor' }) {
  const c = 50, r = 34, h = 9;
  const rad = (deg) => ((deg - 90) * Math.PI) / 180;
  const at = (deg) => [c + r * Math.cos(rad(deg)), c + r * Math.sin(rad(deg))];
  const arrows = [0, 120, 240].map((a) => {
    const [x1, y1] = at(a + 12);
    const [x2, y2] = at(a + 92);
    const t = rad(a + 92) + Math.PI / 2;
    const nx = Math.cos(rad(a + 92)), ny = Math.sin(rad(a + 92));
    const head = [
      [x2 + h * nx, y2 + h * ny],
      [x2 - h * nx, y2 - h * ny],
      [x2 + h * 1.1 * Math.cos(t), y2 + h * 1.1 * Math.sin(t)],
    ].map((p) => p.map((n) => n.toFixed(2)).join(',')).join(' ');
    return { path: `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`, head, a };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ color }}>
      {arrows.map((x) => (
        <g key={x.a}>
          <path d={x.path} fill="none" stroke="currentColor" strokeWidth="8" />
          <polygon points={x.head} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}
