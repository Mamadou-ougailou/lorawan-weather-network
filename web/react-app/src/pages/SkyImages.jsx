import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const VideoPlayer = (props) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const { options, onReady } = props;

  useEffect(() => {
    // Initialisation du lecteur s'il n'existe pas encore
    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options, () => {
        videojs.log('player is ready');
        onReady && onReady(player);
      });
    } else {
      // Mise à jour du lecteur existant si les options changent
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, videoRef]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
};

export default function SkyImages() {
  const videoJsOptions = {
    autoplay: false,
    controls: true,
    responsive: true,
    fluid: true,
    muted: true,
    liveui: true,
    preload: 'auto',
    sources: [{
      src: 'https://wowza.unice.fr:443/NichoirESPE/ngrp:Cam2Eglantier.stream_all/playlist.m3u8?DVR',
      type: 'application/x-mpegURL'
    }]
  };

  const handlePlayerReady = (player) => {
    // Optionnel : Vous pouvez ajouter des écouteurs d'événements ici
    // player.on('waiting', () => { ... });
  };

  return (
    <section className="animate-in fade-in duration-500 flex flex-col items-center w-full">
      <div className="w-full max-w-[1000px] mb-8 text-center pt-8">
        <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tighter text-on-surface mb-3">La Ruche de Contes</h2>
        <p className="text-sm font-medium text-on-surface-variant uppercase tracking-[0.15em]">Live Streaming DVR</p>
      </div>

      <div className="w-full max-w-[936px] bg-[#1a1a1a] rounded-xl p-2 shadow-2xl mb-12">
        <div className="rounded-md overflow-hidden">
          <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
        </div>
      </div>
    </section>
  );
}
