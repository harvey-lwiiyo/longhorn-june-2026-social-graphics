// africa-day.jsx
// Motion-graphic scenes for "Happy Africa Day, Zambia!" — Longhorn Associates.
// Loaded after React + Babel + animations.jsx. Composes a single <App /> that
// drives the <Stage> through ~33s of scenes.
//
// Visual system (defined inline so this file is self-contained):
//   --ink         #0A0E1F   deep navy ground
//   --ivory       #FAF4E8   warm off-white
//   --red         #E11627   Longhorn red
//   --blue        #1C2A8C   Longhorn blue
//   --gold        #F2B600   Pan-African gold
//   --green       #00754A   Pan-African green
//   --orange      #DE7C00   Zambian accent

const W = 1080;
const H = 1920;

const C = {
  ink: '#0A0E1F',
  ivory: '#FAF4E8',
  red: '#E11627',
  blue: '#1C2A8C',
  gold: '#F2B600',
  green: '#00754A',
  orange: '#DE7C00',
  dim: 'rgba(250,244,232,0.55)',
};

const DISPLAY = '"Big Shoulders Display", "Archivo Black", system-ui, sans-serif';
const BODY = '"DM Sans", system-ui, sans-serif';
const SERIF = '"DM Serif Display", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

// ── Shared helpers ──────────────────────────────────────────────────────────

// Returns a 0→1 entry/exit envelope for any duration, with hold in the middle.
function envelope(localTime, duration, entry = 0.5, exit = 0.5, ease = Easing.easeOutCubic) {
  const exitStart = Math.max(0, duration - exit);
  if (localTime < entry) return ease(clamp(localTime / entry, 0, 1));
  if (localTime > exitStart) return 1 - Easing.easeInCubic(clamp((localTime - exitStart) / exit, 0, 1));
  return 1;
}

// Slide-and-fade text element. Lets us pick direction and stagger easily.
function LineIn({
  text, x, y, size, color = C.ivory, weight = 900, font = DISPLAY,
  delay = 0, entry = 0.55, exit = 0.4, from = 'up', distance = 60,
  letterSpacing = '-0.02em', italic = false, align = 'left', tracking,
  lineHeight = 0.95, opacity: opacityProp = 1,
}) {
  const { localTime, duration } = useSprite();
  const t = localTime - delay;
  const env = envelope(t, duration - delay, entry, exit);

  const inT = clamp(t / entry, 0, 1);
  const inEase = Easing.easeOutQuart(inT);
  let dx = 0, dy = 0;
  if (from === 'up') dy = (1 - inEase) * distance;
  if (from === 'down') dy = -(1 - inEase) * distance;
  if (from === 'left') dx = (1 - inEase) * distance;
  if (from === 'right') dx = -(1 - inEase) * distance;

  const opacity = (t < 0 ? 0 : env) * opacityProp;
  const translateBase = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateBase}, 0) translate(${dx}px, ${dy}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      fontStyle: italic ? 'italic' : 'normal',
      color,
      letterSpacing: tracking ?? letterSpacing,
      lineHeight,
      whiteSpace: 'pre',
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// A reveal-from-below clipped word — like type rising out of a baseline.
function ClipWord({ text, x, y, size, color = C.ivory, weight = 900, font = DISPLAY, delay = 0, dur = 0.7, align = 'left', tracking = '-0.025em', lineHeight = 0.95 }) {
  const { localTime } = useSprite();
  const t = clamp((localTime - delay) / dur, 0, 1);
  const reveal = Easing.easeOutQuart(t);
  const translateBase = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateBase}, 0)`,
      overflow: 'hidden',
      lineHeight,
    }}>
      <div style={{
        fontFamily: font, fontSize: size, fontWeight: weight,
        color, letterSpacing: tracking, lineHeight,
        transform: `translateY(${(1 - reveal) * 100}%)`,
        willChange: 'transform',
      }}>
        {text}
      </div>
    </div>
  );
}

// ── Background: Pan-African color bars ──────────────────────────────────────
// Five vertical bars: red, ivory, green, gold, blue — march in from the left.
function ColorBars({ delay = 0, dur = 0.9, opacity = 1 }) {
  const { localTime } = useSprite();
  const colors = [C.red, C.green, C.gold, C.blue, C.ivory];
  const barW = W / colors.length;
  return (
    <>
      {colors.map((col, i) => {
        const t = clamp((localTime - delay - i * 0.08) / dur, 0, 1);
        const eased = Easing.easeOutQuart(t);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: i * barW,
            top: 0,
            width: barW,
            height: H,
            background: col,
            transform: `translateY(${(1 - eased) * H}px)`,
            opacity,
            willChange: 'transform',
          }} />
        );
      })}
    </>
  );
}

// Horizontal sweeping stripe — used as a transition/wipe.
function Sweep({ y, height, color = C.gold, delay = 0, dur = 0.6, direction = 'right' }) {
  const { localTime } = useSprite();
  const t = clamp((localTime - delay) / dur, 0, 1);
  const eased = Easing.easeOutQuart(t);
  const offset = direction === 'right' ? (1 - eased) * -W : (1 - eased) * W;
  return (
    <div style={{
      position: 'absolute',
      left: 0, top: y,
      width: W, height,
      background: color,
      transform: `translateX(${offset}px)`,
      willChange: 'transform',
    }} />
  );
}

// Static grain — subtle paper texture so backgrounds feel less flat.
function Grain({ opacity = 0.06 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      opacity,
      mixBlendMode: 'overlay',
      pointerEvents: 'none',
    }} />
  );
}

// Small monochrome top-bar slug — date + brand identifier — present every scene.
function HeaderSlug({ left = '25 MAY', right = 'LONGHORN · AFRICA DAY', color = C.ivory, opacity = 0.7 }) {
  return (
    <div style={{
      position: 'absolute',
      left: 60, right: 60, top: 56,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: MONO, fontSize: 22, fontWeight: 500,
      letterSpacing: '0.18em', textTransform: 'uppercase',
      color, opacity,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: C.red, display: 'inline-block' }} />
        {left}
      </div>
      <div>{right}</div>
    </div>
  );
}

// ── SCENE 1: Opening / Happy Africa Day, Zambia! ────────────────────────────
// Pan-African bars sweep up; massive HAPPY / AFRICA DAY / ZAMBIA stacks in.
function SceneOpening({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => (
        <>
          {/* Ink ground */}
          <div style={{ position: 'absolute', inset: 0, background: C.ink }} />

          {/* Vertical color bars sweep up */}
          <ColorBars delay={0} dur={0.9} opacity={0.95} />

          {/* Overlay dark gradient so type pops over busy bars */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, rgba(10,14,31,0.05) 0%, rgba(10,14,31,0.85) 55%, rgba(10,14,31,0.95) 100%)`,
          }} />

          <Grain />
          <HeaderSlug />

          {/* Eyebrow */}
          <LineIn text="— 25 . 05 . 2026 —"
            x={W / 2} y={460} align="center" size={36} weight={500}
            font={MONO} color={C.gold} letterSpacing="0.3em"
            delay={0.4} from="down" distance={24} entry={0.5} />

          {/* Main stack */}
          <ClipWord text="HAPPY" x={W / 2} y={540} align="center"
            size={260} color={C.ivory} delay={0.7} dur={0.75} />
          <ClipWord text="AFRICA DAY" x={W / 2} y={770} align="center"
            size={170} color={C.gold} delay={1.0} dur={0.75} />

          {/* "ZAMBIA!" with flag stripe behind */}
          <Sprite start={0} end={9999}>
            {() => {
              const t = clamp((localTime - 1.45) / 0.55, 0, 1);
              const ease = Easing.easeOutQuart(t);
              return (
                <div style={{
                  position: 'absolute',
                  left: '50%', top: 980,
                  transform: `translateX(-50%)`,
                  display: 'flex', alignItems: 'flex-end', gap: 28,
                  opacity: ease,
                }}>
                  <div style={{
                    width: 40, height: 230,
                    background: `linear-gradient(180deg, ${C.red} 0%, ${C.red} 33%, ${C.ink} 33%, ${C.ink} 66%, ${C.orange} 66%, ${C.orange} 100%)`,
                    transform: `scaleY(${ease})`, transformOrigin: 'bottom',
                  }} />
                  <div style={{
                    fontFamily: DISPLAY, fontSize: 280, fontWeight: 900,
                    color: C.green, letterSpacing: '-0.02em', lineHeight: 0.9,
                  }}>
                    ZAMBIA!
                  </div>
                </div>
              );
            }}
          </Sprite>

          {/* Bottom strap */}
          <LineIn text="A MESSAGE FROM LONGHORN ASSOCIATES"
            x={W / 2} y={1700} align="center" size={28} weight={500}
            font={MONO} color={C.dim} letterSpacing="0.32em"
            delay={2.0} from="up" distance={16} entry={0.6} />
          <LineIn text="——————————"
            x={W / 2} y={1760} align="center" size={28} weight={500}
            font={MONO} color={C.gold} letterSpacing="0.1em"
            delay={2.2} from="up" distance={16} entry={0.5} />
        </>
      )}
    </Sprite>
  );
}

// ── SCENE 2: 1963 / Founding leaders ────────────────────────────────────────
function Scene1963({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        // Year counts up 1900 -> 1963 between t=0.5..2.0
        const ct = clamp((localTime - 0.4) / 1.6, 0, 1);
        const year = Math.round(1900 + (1963 - 1900) * Easing.easeOutQuart(ct));

        // Horizontal timeline draws across between t=1.6..2.5
        const tlT = clamp((localTime - 1.6) / 0.9, 0, 1);

        return (
          <>
            <div style={{ position: 'absolute', inset: 0, background: C.ink }} />

            {/* Subtle radial gold spotlight from top */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse 800px 600px at 50% 30%, rgba(242,182,0,0.18), transparent 70%)`,
            }} />

            <Grain />
            <HeaderSlug right="CHAPTER · I" />

            {/* Eyebrow */}
            <LineIn text="ON THIS DAY IN"
              x={W / 2} y={520} align="center" size={42} weight={600}
              font={BODY} color={C.gold} letterSpacing="0.42em"
              delay={0.1} from="down" distance={20} entry={0.5} />

            {/* Counting year */}
            <div style={{
              position: 'absolute',
              left: '50%', top: 600,
              transform: 'translateX(-50%)',
              fontFamily: DISPLAY, fontSize: 480, fontWeight: 900,
              color: C.ivory, letterSpacing: '-0.04em',
              lineHeight: 0.9,
              fontVariantNumeric: 'tabular-nums',
              opacity: clamp((localTime - 0.3) / 0.4, 0, 1),
            }}>
              {year}
            </div>

            {/* Red underline that draws when year locks */}
            <div style={{
              position: 'absolute',
              left: '50%', top: 1100,
              transform: `translateX(-50%) scaleX(${Easing.easeOutQuart(tlT)})`,
              transformOrigin: 'left center',
              width: 720, height: 14,
              background: C.red,
            }} />

            {/* Body copy */}
            <LineIn text="Our founding leaders"
              x={W / 2} y={1230} align="center" size={68} weight={600}
              font={BODY} color={C.ivory}
              delay={2.3} from="up" distance={24} />
            <LineIn text="dared to believe in a"
              x={W / 2} y={1320} align="center" size={68} weight={600}
              font={BODY} color={C.ivory}
              delay={2.5} from="up" distance={24} />
            <LineIn text="united African purpose."
              x={W / 2} y={1410} align="center" size={76} weight={400}
              font={SERIF} color={C.gold} italic
              delay={2.75} from="up" distance={28} />

            {/* Bottom stamp */}
            <LineIn text="ADDIS ABABA · 25 MAY 1963 · ORG. AFRICAN UNITY"
              x={W / 2} y={1700} align="center" size={26} weight={500}
              font={MONO} color={C.dim} letterSpacing="0.28em"
              delay={3.4} from="up" distance={16} entry={0.55} />
          </>
        );
      }}
    </Sprite>
  );
}

// ── SCENE 3: Living proof ───────────────────────────────────────────────────
function SceneLivingProof({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime }) => {
        // Pan-African circle of dots that pulses; concept: vision -> proof.
        const dotCount = 18;
        const ringR = 360;
        const pulseT = clamp((localTime - 0.3) / 0.9, 0, 1);

        return (
          <>
            <div style={{ position: 'absolute', inset: 0, background: C.ivory }} />
            {/* Ink lower band that rises */}
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: H * 0.45 * Easing.easeOutQuart(clamp(localTime / 0.7, 0, 1)),
              background: C.ink,
              transformOrigin: 'bottom',
            }} />
            <Grain opacity={0.08} />
            <HeaderSlug right="CHAPTER · II" color={C.ink} opacity={0.55} />

            {/* Ring of dots, pulsing in */}
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${W} ${H}`}>
              {Array.from({ length: dotCount }).map((_, i) => {
                const ang = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
                const cx = W / 2 + Math.cos(ang) * ringR;
                const cy = 720 + Math.sin(ang) * ringR;
                const delay = i * 0.04;
                const t = clamp((localTime - 0.2 - delay) / 0.4, 0, 1);
                const r = 10 * Easing.easeOutBack(t);
                const palette = [C.red, C.gold, C.green, C.blue];
                const col = palette[i % palette.length];
                return <circle key={i} cx={cx} cy={cy} r={r} fill={col} />;
              })}
            </svg>

            {/* Centered headline */}
            <LineIn text="Today, you are"
              x={W / 2} y={580} align="center" size={80} weight={500}
              font={BODY} color={C.ink}
              delay={0.6} from="up" distance={32} />
            <ClipWord text="THE LIVING PROOF" x={W / 2} y={680} align="center"
              size={130} color={C.red} delay={1.0} dur={0.7} tracking="-0.03em" />
            <LineIn text="of that vision."
              x={W / 2} y={840} align="center" size={84} weight={400}
              font={SERIF} color={C.blue} italic
              delay={1.6} from="up" distance={28} />

            {/* Bottom 1963 anchor reference */}
            <LineIn text="1963 → TODAY"
              x={W / 2} y={1380} align="center" size={28} weight={500}
              font={MONO} color={C.ivory} letterSpacing="0.4em"
              delay={2.4} from="up" distance={16} entry={0.5} opacity={0.85} />
            <LineIn text="63 YEARS OF AFRICAN AMBITION"
              x={W / 2} y={1430} align="center" size={28} weight={500}
              font={MONO} color={C.gold} letterSpacing="0.32em"
              delay={2.6} from="up" distance={16} entry={0.5} />
          </>
        );
      }}
    </Sprite>
  );
}

// ── SCENE 4: Moving upwards / Stock chart ──────────────────────────────────
function SceneMovingUp({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        // Stock-line points (relative to chart box). Generally rising.
        const points = [
          [0, 380], [80, 360], [160, 340], [240, 310], [320, 330],
          [400, 280], [480, 260], [560, 220], [640, 230], [720, 170],
          [800, 140], [880, 100], [960, 60],
        ];
        const chartW = 960;
        const chartH = 440;
        const chartX = (W - chartW) / 2;
        const chartY = 880;

        // Animate drawing across between t=1.0..3.2
        const drawT = clamp((localTime - 1.0) / 2.2, 0, 1);
        const drawEase = Easing.easeOutCubic(drawT);

        // Compute path string up to drawT
        const visiblePts = [];
        const totalLen = chartW;
        const visLen = totalLen * drawEase;
        for (let i = 0; i < points.length; i++) {
          const [px, py] = points[i];
          if (px <= visLen) visiblePts.push([px, py]);
          else {
            // Interpolate last point at the cursor edge
            if (i > 0) {
              const [prevX, prevY] = points[i - 1];
              const f = (visLen - prevX) / (px - prevX);
              visiblePts.push([visLen, prevY + (py - prevY) * f]);
            }
            break;
          }
        }
        const pathD = visiblePts.length > 1
          ? 'M ' + visiblePts.map(p => `${p[0]} ${p[1]}`).join(' L ')
          : '';
        const cursor = visiblePts[visiblePts.length - 1] || [0, 380];

        // Live percentage ticker
        const pctT = clamp((localTime - 1.0) / 2.2, 0, 1);
        const pctVal = Easing.easeOutCubic(pctT) * 24.7;

        // Ticker tape
        const tickerText = '   FUNDING IT  ●  BUYING AFRICAN STOCKS  ●  OWNING A PIECE OF OUR FUTURE  ●  BUILDING WEALTH  ●  SECURING LEGACY';
        const tickerOffset = -((localTime * 220) % 1400);

        return (
          <>
            {/* Background gradient */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(180deg, ${C.ink} 0%, #15193a 100%)`,
            }} />

            {/* Faint grid */}
            <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <line key={'h' + i} x1={0} y1={i * 160} x2={W} y2={i * 160} stroke={C.ivory} strokeWidth={1} />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={'v' + i} x1={i * 160} y1={0} x2={i * 160} y2={H} stroke={C.ivory} strokeWidth={1} />
              ))}
            </svg>

            <Grain />
            <HeaderSlug right="CHAPTER · III" />

            {/* Headline */}
            <LineIn text="You are"
              x={60} y={300} size={64} weight={500}
              font={BODY} color={C.ivory}
              delay={0.0} from="left" distance={40} />
            <ClipWord text="THE ZAMBIAN" x={60} y={370}
              size={150} color={C.ivory} delay={0.25} dur={0.7} tracking="-0.025em" />
            <ClipWord text="MOVING" x={60} y={525}
              size={150} color={C.gold} delay={0.55} dur={0.7} tracking="-0.025em" />

            {/* "UPWARDS" with arrow icon */}
            <div style={{
              position: 'absolute',
              left: 60, top: 680,
              display: 'flex', alignItems: 'center', gap: 24,
              opacity: clamp((localTime - 0.85) / 0.4, 0, 1),
              transform: `translateY(${(1 - clamp((localTime - 0.85) / 0.4, 0, 1)) * 40}px)`,
            }}>
              <div style={{
                fontFamily: DISPLAY, fontSize: 150, fontWeight: 900,
                color: C.red, letterSpacing: '-0.025em', lineHeight: 1,
              }}>
                UPWARDS
              </div>
              <svg width={120} height={150} viewBox="0 0 120 150">
                <path d="M 60 140 L 60 20 M 60 20 L 25 55 M 60 20 L 95 55"
                  stroke={C.red} strokeWidth={14} strokeLinecap="square" strokeLinejoin="miter" fill="none" />
              </svg>
            </div>

            {/* Chart panel */}
            <div style={{
              position: 'absolute',
              left: chartX, top: chartY,
              width: chartW, height: chartH,
              opacity: clamp((localTime - 0.9) / 0.5, 0, 1),
            }}>
              {/* Panel frame */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(250,244,232,0.18)`,
              }} />

              {/* Ticker header inside panel */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: 0,
                padding: '18px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: `1px solid rgba(250,244,232,0.12)`,
                fontFamily: MONO, fontSize: 22, color: C.ivory,
                letterSpacing: '0.16em',
              }}>
                <span>AFRICA · COMPOSITE INDEX</span>
                <span style={{ color: C.green }}>● LIVE</span>
              </div>

              {/* Big number + delta */}
              <div style={{
                position: 'absolute', left: 24, top: 80,
                display: 'flex', alignItems: 'baseline', gap: 18,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <div style={{
                  fontFamily: DISPLAY, fontSize: 110, fontWeight: 900,
                  color: C.ivory, letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {(2400 + 280 * Easing.easeOutCubic(clamp((localTime - 1.0) / 2.2, 0, 1))).toFixed(0)}
                </div>
                <div style={{
                  fontFamily: DISPLAY, fontSize: 56, fontWeight: 900,
                  color: C.green, letterSpacing: '-0.02em',
                }}>
                  ▲ {pctVal.toFixed(1)}%
                </div>
              </div>

              {/* SVG chart */}
              <svg width={chartW} height={chartH} style={{ position: 'absolute', inset: 0 }} viewBox={`0 0 ${chartW} ${chartH}`}>
                {/* Filled area under curve */}
                {visiblePts.length > 1 && (
                  <path
                    d={`${pathD} L ${cursor[0]} ${chartH} L 0 ${chartH} Z`}
                    fill="url(#chartGrad)"
                    opacity="0.5"
                  />
                )}
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={C.green} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Line */}
                <path d={pathD} stroke={C.green} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Cursor dot */}
                {visiblePts.length > 1 && (
                  <>
                    <circle cx={cursor[0]} cy={cursor[1]} r={18} fill={C.green} opacity="0.25" />
                    <circle cx={cursor[0]} cy={cursor[1]} r={9} fill={C.ivory} />
                  </>
                )}
              </svg>
            </div>

            {/* Ticker tape strap */}
            <div style={{
              position: 'absolute',
              left: 0, right: 0, top: 1380,
              height: 80,
              background: C.red,
              overflow: 'hidden',
              display: 'flex', alignItems: 'center',
              opacity: clamp((localTime - 1.2) / 0.4, 0, 1),
            }}>
              <div style={{
                whiteSpace: 'nowrap',
                fontFamily: DISPLAY, fontSize: 52, fontWeight: 800,
                color: C.ivory, letterSpacing: '0.04em',
                transform: `translateX(${tickerOffset}px)`,
              }}>
                {tickerText.repeat(4)}
              </div>
            </div>

            {/* Caption below ticker */}
            <LineIn text="not watching the continent's rise —"
              x={60} y={1500} size={48} weight={500}
              font={BODY} color={C.ivory}
              delay={1.5} from="up" distance={20} />
            <LineIn text="funding it."
              x={60} y={1565} size={64} weight={400}
              font={SERIF} color={C.gold} italic
              delay={1.8} from="up" distance={24} />
          </>
        );
      }}
    </Sprite>
  );
}

// ── SCENE 5: Holding the Pen ────────────────────────────────────────────────
function SceneHoldingPen({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        // Pen draws a line under "PEN"; underline grows.
        const lineT = clamp((localTime - 1.6) / 1.4, 0, 1);
        const lineEase = Easing.easeOutQuart(lineT);

        return (
          <>
            <div style={{ position: 'absolute', inset: 0, background: C.ivory }} />
            <Grain opacity={0.08} />
            <HeaderSlug right="CHAPTER · IV" color={C.ink} opacity={0.55} />

            {/* Africa silhouette in upper right, faint */}
            <svg width={460} height={520}
              style={{ position: 'absolute', right: 40, top: 220, opacity: 0.08 }}
              viewBox="0 0 100 110">
              <path
                d="M 40 4 L 52 2 L 64 6 L 74 14 L 78 24 L 73 34 L 76 44 L 84 52 L 82 64 L 74 74 L 64 82 L 56 92 L 50 100 L 42 96 L 36 86 L 30 76 L 24 64 L 22 50 L 24 36 L 30 22 L 36 12 Z"
                fill={C.ink}
              />
              {/* Zambia pin */}
              <circle cx={55} cy={62} r={3.5} fill={C.red} />
            </svg>

            {/* Headline */}
            <LineIn text="Africa's economic story"
              x={60} y={460} size={84} weight={600}
              font={BODY} color={C.ink}
              delay={0.0} from="left" distance={40} />
            <LineIn text="is being written"
              x={60} y={580} size={84} weight={600}
              font={BODY} color={C.ink}
              delay={0.2} from="left" distance={40} />
            <LineIn text="by Africans."
              x={60} y={700} size={96} weight={400}
              font={SERIF} color={C.red} italic
              delay={0.45} from="left" distance={40} />

            {/* Pause beat, then the punchline rises */}
            <ClipWord text="And you" x={60} y={970}
              size={96} color={C.ink} weight={700}
              font={BODY} delay={1.0} dur={0.6} tracking="-0.01em" />
            <ClipWord text="are holding" x={60} y={1080}
              size={140} color={C.blue}
              delay={1.25} dur={0.7} tracking="-0.025em" />
            <ClipWord text="THE PEN." x={60} y={1230}
              size={200} color={C.ink}
              delay={1.55} dur={0.75} tracking="-0.03em" />

            {/* Underline that draws */}
            <div style={{
              position: 'absolute',
              left: 60, top: 1418,
              width: 580 * lineEase,
              height: 16,
              background: C.red,
              willChange: 'width',
            }} />

            {/* Pen icon at end of underline */}
            <div style={{
              position: 'absolute',
              left: 60 + 580 * lineEase - 20,
              top: 1380,
              opacity: lineEase,
              transform: 'rotate(45deg)',
            }}>
              <svg width={80} height={80} viewBox="0 0 80 80">
                <path d="M 14 66 L 6 74 L 14 66 L 14 56 L 56 14 L 66 24 L 24 66 Z"
                  fill={C.ink} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
                <path d="M 56 14 L 64 6 L 74 16 L 66 24 Z" fill={C.gold} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
              </svg>
            </div>

            {/* Bottom: subtle attribution */}
            <LineIn text="WEALTH · LEGACY · OWNERSHIP"
              x={W / 2} y={1700} align="center" size={28} weight={500}
              font={MONO} color={C.ink} letterSpacing="0.42em"
              delay={2.6} from="up" distance={16} entry={0.5} opacity={0.6} />
          </>
        );
      }}
    </Sprite>
  );
}

// ── SCENE 6: CTA / Longhorn ─────────────────────────────────────────────────
function SceneCTA({ start, end }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const pulse = 1 + 0.04 * Math.sin(localTime * 4.5);

        // Logo enters by scaling/fading
        const logoT = clamp((localTime - 0.2) / 0.8, 0, 1);
        const logoEase = Easing.easeOutBack(logoT);

        return (
          <>
            <div style={{ position: 'absolute', inset: 0, background: C.ink }} />

            {/* Layered Pan-African color stripes at bottom */}
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              display: 'flex', height: 40,
            }}>
              <div style={{ flex: 1, background: C.red }} />
              <div style={{ flex: 1, background: C.gold }} />
              <div style={{ flex: 1, background: C.green }} />
              <div style={{ flex: 1, background: C.blue }} />
            </div>

            <Grain />

            {/* Logo block on ivory plate */}
            <div style={{
              position: 'absolute',
              left: '50%', top: 320,
              transform: `translateX(-50%) scale(${0.7 + 0.3 * logoEase})`,
              opacity: logoT,
              width: 820, padding: '60px 40px 50px',
              background: C.ivory,
              borderRadius: 8,
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
            }}>
              <img src="assets/longhorn_logo.png"
                style={{ width: '100%', display: 'block' }} alt="Longhorn Associates" />
            </div>

            {/* Headline */}
            <LineIn text="LET'S BUILD"
              x={W / 2} y={920} align="center" size={170} weight={900}
              font={DISPLAY} color={C.ivory} letterSpacing="-0.03em"
              delay={0.9} from="up" distance={40} />
            <LineIn text="TOGETHER."
              x={W / 2} y={1080} align="center" size={170} weight={900}
              font={DISPLAY} color={C.gold} letterSpacing="-0.03em"
              delay={1.05} from="up" distance={40} />

            {/* Body */}
            <LineIn text="We're right here to help you build"
              x={W / 2} y={1290} align="center" size={42} weight={500}
              font={BODY} color={C.ivory}
              delay={1.5} from="up" distance={24} opacity={0.92} />
            <LineIn text="your wealth and secure your legacy."
              x={W / 2} y={1346} align="center" size={42} weight={500}
              font={BODY} color={C.ivory}
              delay={1.6} from="up" distance={24} opacity={0.92} />

            {/* WhatsApp CTA card */}
            <div style={{
              position: 'absolute',
              left: '50%', top: 1480,
              transform: `translateX(-50%) scale(${clamp((localTime - 1.9) / 0.5, 0, 1) * pulse})`,
              opacity: clamp((localTime - 1.9) / 0.5, 0, 1),
              display: 'flex', alignItems: 'center', gap: 24,
              background: '#25D366',
              padding: '28px 44px',
              borderRadius: 100,
              boxShadow: '0 20px 50px rgba(37,211,102,0.35)',
            }}>
              {/* WhatsApp glyph */}
              <svg width={60} height={60} viewBox="0 0 32 32" fill="none">
                <path d="M16 3C8.8 3 3 8.8 3 16c0 2.3.6 4.5 1.7 6.4L3 29l6.8-1.8c1.8 1 3.9 1.5 6.2 1.5h.1c7.2 0 13-5.8 13-13S23.2 3 16 3zm0 23.5c-2 0-3.9-.5-5.6-1.5l-.4-.2-4 1 1.1-3.9-.3-.4c-1.1-1.7-1.7-3.7-1.7-5.6 0-6 4.9-10.9 10.9-10.9 2.9 0 5.6 1.1 7.7 3.2 2.1 2.1 3.2 4.8 3.2 7.7 0 6-4.9 10.9-10.9 10.9zm6-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.3.2-.6.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.7.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3z" fill="#fff"/>
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  fontFamily: MONO, fontSize: 22, fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)', letterSpacing: '0.18em',
                }}>
                  WHATSAPP US
                </div>
                <div style={{
                  fontFamily: DISPLAY, fontSize: 64, fontWeight: 900,
                  color: '#fff', letterSpacing: '-0.01em', lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  +260 770 668 766
                </div>
              </div>
            </div>

            {/* Tagline */}
            <LineIn text="YOUR INNOVATIVE FINANCING & INVESTMENT PARTNER"
              x={W / 2} y={1700} align="center" size={26} weight={500}
              font={MONO} color={C.gold} letterSpacing="0.32em"
              delay={2.4} from="up" distance={16} entry={0.5} />
          </>
        );
      }}
    </Sprite>
  );
}

// ── Timecode HUD: updates data-screen-label every second for comment context ──
function TimecodeReporter() {
  const time = useTime();
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (!root) return;
    const sec = Math.floor(time);
    const label = `t=${String(Math.floor(sec / 60)).padStart(1, '0')}:${String(sec % 60).padStart(2, '0')}`;
    if (root.getAttribute('data-screen-label') !== label) {
      root.setAttribute('data-screen-label', label);
    }
  }, [Math.floor(time)]);
  return null;
}

// ── App: composes the timeline ──────────────────────────────────────────────
function App() {
  // Scene boundaries (seconds)
  const T = {
    open: [0.0, 7.5],
    y1963: [7.5, 13.8],
    proof: [13.8, 18.0],
    upward: [18.0, 24.8],
    pen: [24.8, 29.0],
    cta: [29.0, 34.5],
  };
  const duration = 34.5;

  return (
    <div data-video-root data-screen-label="t=0:00" style={{ position: 'absolute', inset: 0 }}>
      <Stage width={W} height={H} duration={duration} background={C.ink} persistKey="africa-day-v1">
        <TimecodeReporter />
        <SceneOpening start={T.open[0]} end={T.open[1]} />
        <Scene1963 start={T.y1963[0]} end={T.y1963[1]} />
        <SceneLivingProof start={T.proof[0]} end={T.proof[1]} />
        <SceneMovingUp start={T.upward[0]} end={T.upward[1]} />
        <SceneHoldingPen start={T.pen[0]} end={T.pen[1]} />
        <SceneCTA start={T.cta[0]} end={T.cta[1]} />
      </Stage>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
