import { useState } from 'react';
import { apiFetch, ROUTES, SITE_NAMES, apiAssetUrl } from '../api';

const SITE_OPTIONS = [
  { value: '',  label: 'Tous les sites' },
  { value: '1', label: 'Mougins' },
  { value: '2', label: 'Grasse' },
  { value: '3', label: 'Nice' },
];

export default function SkyImages() {
  const [site,   setSite]   = useState('');
  const [images, setImages] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  async function handleLoad() {
    setStatus('loading');
    setImages(null);
    try {
      const data = await apiFetch(ROUTES.images(site, 12));
      setImages(data);
      setStatus('ok');
    } catch (e) {
      setStatus('error:' + e.message);
    }
  }

  return (
    <section className="animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-bold font-headline tracking-tighter text-on-surface mb-6">Images du Ciel</h2>
      <div className="bg-surface-container-high rounded-xl p-6 border border-outline-variant flex flex-wrap gap-6 items-end mb-8 relative z-20">
        <label className="flex flex-col gap-2 text-sm font-medium text-on-surface-variant flex-1 min-w-[200px] max-w-xs">
          Station :
          <select value={site} onChange={e => setSite(e.target.value)} className="bg-surface-container-highest border border-outline-variant text-on-surface text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2.5 outline-none transition-colors">
            {SITE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button className="bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-lg px-6 py-2.5 transition-colors shadow-lg shadow-primary/30 min-w-[120px]" onClick={handleLoad}>Charger</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 mb-8">
        {status === 'idle' && (
          <p className="col-span-full text-center p-12 border border-dashed border-outline-variant rounded-xl text-on-surface-variant bg-surface-container-lowest">Sélectionnez une station et cliquez sur Charger.</p>
        )}
        {status === 'loading' && (
          <p className="col-span-full text-center p-12 border border-dashed border-outline-variant rounded-xl text-on-surface-variant bg-surface-container-lowest">Chargement…</p>
        )}
        {status.startsWith('error') && (
          <p className="col-span-full text-center p-12 border border-dashed border-error/50 rounded-xl text-error bg-error/10">Erreur : {status.slice(6)}</p>
        )}
        {status === 'ok' && images && images.length === 0 && (
          <p className="col-span-full text-center p-12 border border-dashed border-outline-variant rounded-xl text-on-surface-variant bg-surface-container-lowest">Aucune image trouvée.</p>
        )}
        {status === 'ok' && images && images.map((img, i) => (
          <div className="relative rounded-xl overflow-hidden border border-outline-variant group bg-surface-container aspect-[3/2] shadow-sm hover:shadow-xl transition-all" key={i}>
            <img
              src={apiAssetUrl(img.url)}
              alt={`Ciel depuis ${img.site_name || 'station'}`}
              crossOrigin="anonymous"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-[2px]">
              <strong className="block text-white text-lg font-headline">{SITE_NAMES[img.site_id] || `Station ${img.site_id}`}</strong>
              <span className="text-slate-300 text-sm">{new Date(img.captured_at).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
