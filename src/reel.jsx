import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { AbsoluteFill, Sequence, Html5Video, Img, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

const FPS = 30;
const INTRO = 84;
const CLIP = Math.floor(106.3 * FPS);
const OUTRO = 105;
const OVERLAP = 12;
const TOTAL = INTRO + CLIP + OUTRO - OVERLAP * 2;

const C = {
  navy: '#07193c',
  abyss: '#040e24',
  gold: '#b79366',
  goldLite: '#dcc39d',
  chalk: '#eef2f6',
};
const DISPLAY = "'Big Shoulders Display Variable', 'Arial Narrow', sans-serif";
const TEXT = "'Onest Variable', system-ui, sans-serif";

const base = import.meta.env.BASE_URL;
const src = (p) => `${base}${p}`;

function Lines({ progress }) {
  // trazos de cal que cruzan la pantalla en diagonal
  return (
    <svg viewBox="0 0 540 960" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {[0, 1, 2].map((i) => (
        <line
          key={i}
          x1={-60 + i * 40}
          y1={980}
          x2={600 + i * 40}
          y2={-40 + i * 260}
          stroke={i === 1 ? C.gold : 'rgba(238,242,246,.14)'}
          strokeWidth={i === 1 ? 3 : 1.5}
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
        />
      ))}
    </svg>
  );
}

function Intro() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f, fps, config: { damping: 18 } });
  const name = (d) => spring({ frame: f - d, fps, config: { damping: 16, stiffness: 120 } });
  const lines = interpolate(f, [0, 40], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [INTRO - OVERLAP, INTRO], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(110% 70% at 50% 100%, #0c2556, ${C.navy} 55%, ${C.abyss})`, opacity: out }}>
      <Lines progress={lines} />
      <AbsoluteFill style={{ padding: 48, justifyContent: 'flex-end', paddingBottom: 120 }}>
        <Img
          src={src('img/soccermax-light.png')}
          style={{ width: 150, marginBottom: 'auto', marginTop: 20, opacity: logo, transform: `translateY(${(1 - logo) * -20}px)` }}
        />
        {['Matías', 'Vides'].map((w, i) => (
          <div key={w} style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 900,
                fontSize: 168,
                lineHeight: 0.84,
                color: C.chalk,
                transform: `translateY(${(1 - name(8 + i * 6)) * 110}%)`,
              }}
            >
              {w}
            </div>
          </div>
        ))}
        <div
          style={{
            fontFamily: TEXT,
            fontSize: 26,
            color: C.goldLite,
            marginTop: 22,
            opacity: interpolate(f, [30, 46], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          Extremo por ambos perfiles, categoría 2012
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Clip() {
  const f = useCurrentFrame();
  const fadeIn = interpolate(f, [0, OVERLAP], [0, 1], { extrapolateRight: 'clamp' });
  const tagIn = spring({ frame: f - 20, fps: FPS, config: { damping: 20 } });
  const tagOut = interpolate(f, [170, 190], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#000', opacity: fadeIn }}>
      <Html5Video src={src('media/matias-highlights.mp4')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      <Img src={src('img/soccermax-light.png')} style={{ position: 'absolute', right: 22, bottom: 24, width: 74, opacity: 0.8 }} />
      <div
        style={{
          position: 'absolute',
          left: 24,
          bottom: 28,
          opacity: tagOut,
          transform: `translateX(${(1 - tagIn) * -120}%)`,
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <div style={{ width: 6, background: C.gold }} />
        <div style={{ background: 'rgba(4,14,36,.88)', padding: '10px 16px 12px' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, lineHeight: 1, color: C.chalk }}>Matías Vides</div>
          <div style={{ fontFamily: TEXT, fontSize: 17, color: C.goldLite, marginTop: 4 }}>Extremo, Selección Valle</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = interpolate(f, [0, OVERLAP], [0, 1], { extrapolateRight: 'clamp' });
  const s = (d) => spring({ frame: f - d, fps, config: { damping: 18 } });
  const row = (d) => ({ opacity: s(d), transform: `translateY(${(1 - s(d)) * 24}px)` });
  return (
    <AbsoluteFill style={{ background: C.navy, opacity: inn, padding: 48, justifyContent: 'center' }}>
      <Lines progress={1} />
      <div style={{ ...row(6), fontFamily: DISPLAY, fontWeight: 800, fontSize: 92, lineHeight: 0.9, color: C.chalk }}>
        Ficha completa
        <br />y contacto
      </div>
      <div style={{ ...row(14), fontFamily: TEXT, fontSize: 26, color: C.chalk, marginTop: 36, lineHeight: 1.5 }}>
        info@soccermax.co
        <br />
        +57 318 507 2722
      </div>
      <Img src={src('img/soccermax-light.png')} style={{ ...row(22), width: 170, marginTop: 56 }} />
    </AbsoluteFill>
  );
}

const fill = { position: 'absolute', inset: 0 };
// el póster se dibuja fuera de la composición: medidas relativas al ancho del reproductor
const u = (n) => `${(n / 5.4).toFixed(3)}cqw`;

function Poster() {
  return (
    <div style={{ ...fill, background: C.navy, cursor: 'pointer' }}>
      <img src={src('img/poster.jpg')} alt="" style={{ ...fill, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
      <div style={{ ...fill, background: `linear-gradient(180deg, rgba(4,14,36,.2) 30%, ${C.abyss} 92%)` }} />
      <div style={{ ...fill, display: 'flex', flexDirection: 'column', padding: u(44), paddingBottom: u(110) }}>
        <img src={src('img/soccermax-light.png')} alt="SoccerMax" style={{ width: u(120), marginTop: u(16), marginBottom: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: u(18), marginBottom: u(26) }}>
          <div style={{ width: u(84), height: u(84), borderRadius: '50%', background: C.gold, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 0, height: 0, borderTop: `${u(17)} solid transparent`, borderBottom: `${u(17)} solid transparent`, borderLeft: `${u(27)} solid ${C.navy}`, marginLeft: u(8) }} />
          </div>
          <div style={{ fontFamily: TEXT, fontSize: u(26), color: C.chalk }}>Ver jugadas, 1:46</div>
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: u(130), lineHeight: 0.84, color: C.chalk }}>
          Matías
          <br />
          Vides
        </div>
      </div>
    </div>
  );
}

function Reel() {
  return (
    <AbsoluteFill style={{ background: C.abyss }}>
      <Sequence durationInFrames={INTRO}>
        <Intro />
      </Sequence>
      <Sequence from={INTRO - OVERLAP} durationInFrames={CLIP}>
        <Clip />
      </Sequence>
      <Sequence from={INTRO - OVERLAP + CLIP - OVERLAP} durationInFrames={OUTRO}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}

export function mountReel(host) {
  createRoot(host).render(
    <Player
      component={Reel}
      durationInFrames={TOTAL}
      fps={FPS}
      compositionWidth={540}
      compositionHeight={960}
      controls
      clickToPlay
      doubleClickToFullscreen
      allowFullscreen
      showVolumeControls
      spaceKeyToPlayOrPause
      acknowledgeRemotionLicense
      renderPoster={() => <Poster />}
      showPosterWhenUnplayed
      style={{ width: '100%', height: '100%' }}
    />
  );
}
