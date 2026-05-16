import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/* ─────────────────────────────────────────────────────────────────── */
/*  Composant VideoPlayer (pattern officiel video.js + React)          */
/* ─────────────────────────────────────────────────────────────────── */
const VideoPlayer = ({ options, onReady }) => {
  const containerRef = useRef(null);
  const playerRef    = useRef(null);

  useEffect(() => {
    if (!playerRef.current) {
      const el = document.createElement('video-js');
      el.classList.add('vjs-big-play-centered');
      containerRef.current.appendChild(el);
      playerRef.current = videojs(el, options, () => onReady?.(playerRef.current));
    } else {
      playerRef.current.autoplay(options.autoplay);
      playerRef.current.src(options.sources);
    }
  }, [options, containerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (playerRef.current && !playerRef.current.isDisposed()) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
  }, []);

  return <div data-vjs-player style={{ width: '100%' }}><div ref={containerRef} style={{ width: '100%' }} /></div>;
};

/* ─────────────────────────────────────────────────────────────────── */
/*  Page SkyImages – Live Streaming Station Météo de Contes            */
/* ─────────────────────────────────────────────────────────────────── */
export default function SkyImages() {
  const videoOpts = {
    autoplay:    false,
    controls:    true,
    responsive:  true,
    fluid:       true,
    aspectRatio: '16:9',
    muted:       true,
    liveui:      true,
    preload:     'auto',
    sources: [{
      src:  'https://streaming.webprofs.fr/live/ngrp:meteo_contes.stream_all/playlist.m3u8?DVR',
      type: 'application/x-mpegURL',
    }],
  };

  const INFO_CARDS = [
    { icon: '🌐', label: 'Flux',    value: 'HLS / DVR',                sub: 'streaming.webprofs.fr'       },
    { icon: '📡', label: 'Réseau',  value: 'LoRaWAN',                  sub: 'Projet Multidisciplinaire'   },
    { icon: '🏔️', label: 'Altitude', value: '370 m',                  sub: 'Village de Contes'            },
    { icon: '🕒', label: 'Fuseau',  value: 'UTC+2',                    sub: 'Europe / Paris'              },
  ];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
                      padding: '2rem 1rem 4rem', boxSizing: 'border-box',
                      animation: 'sky-fade .5s ease both' }}>

      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{
          margin: '0 0 .6rem', fontWeight: 300, letterSpacing: '-0.03em',
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', color: '#111827',
        }}>
          Station Météo de Contes
        </h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#6b7280',
                    fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Streaming · Alpes-Maritimes
        </p>
      </div>

      {/* ── Lecteur vidéo ───────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 960, marginBottom: '2.5rem' }}>

        {/* Halo ambient */}
        <div style={{
          position: 'absolute', inset: -24, borderRadius: 32, pointerEvents: 'none', zIndex: 0,
          background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.12) 0%, transparent 70%)',
        }} />

        {/* Wrapper carte vidéo */}
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          backdropFilter: 'blur(8px)',
        }}>

          {/* Barre supérieure */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📷</span>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, letterSpacing: '0.04em' }}>
                Caméra météo — Vue en direct
              </span>
            </div>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4, padding: '2px 8px',
            }}>DVR</span>
          </div>

          {/* Lecteur */}
          <div style={{ background: '#000', width: '100%' }}>
            <VideoPlayer options={videoOpts} onReady={() => {}} />
          </div>
        </div>
      </div>

      {/* ── Cartes d'information ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        width: '100%', maxWidth: 960,
      }}>
        {INFO_CARDS.map(({ icon, label, value, sub }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 14, padding: '1rem 1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(14,165,233,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          >
            <span style={{ fontSize: '1.4rem', lineHeight: 1, marginTop: 2 }}>{icon}</span>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
                            textTransform: 'uppercase', color: '#9ca3af', marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                {value}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: 3 }}>
                {sub}
              </div>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
