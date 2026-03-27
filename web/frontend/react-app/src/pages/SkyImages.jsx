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
    <section>
      <h2 className="section-title">Images du Ciel</h2>
      <div className="controls">
        <label>
          Station :
          <select value={site} onChange={e => setSite(e.target.value)}>
            {SITE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <button className="btn" onClick={handleLoad}>Charger</button>
      </div>

      <div className="sky-gallery">
        {status === 'idle' && (
          <p className="placeholder">Sélectionnez une station et cliquez sur Charger.</p>
        )}
        {status === 'loading' && (
          <p className="placeholder">Chargement…</p>
        )}
        {status.startsWith('error') && (
          <p className="placeholder">Erreur : {status.slice(6)}</p>
        )}
        {status === 'ok' && images && images.length === 0 && (
          <p className="placeholder">Aucune image trouvée.</p>
        )}
        {status === 'ok' && images && images.map((img, i) => (
          <div className="sky-card" key={i}>
            <img
              src={apiAssetUrl(img.url)}
              alt={`Ciel depuis ${img.site_name || 'station'}`}
              crossOrigin="anonymous"
              loading="lazy"
              onError={e => { e.target.style.display = 'none'; }}
            />
            <div className="sky-card-meta">
              <strong>{SITE_NAMES[img.site_id] || `Station ${img.site_id}`}</strong>
              {new Date(img.captured_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
