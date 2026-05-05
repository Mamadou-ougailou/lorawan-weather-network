export function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

const KNOWN_SENSORS = {
  temperature:   { label: 'Temp',           unit: '°C',    icon: 'thermostat',   color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  humidity:      { label: 'Humidité',       unit: '%',     icon: 'water_drop',   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  pressure:      { label: 'Pression',       unit: ' hPa',  icon: 'compress',     color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  windSpeed:     { label: 'Vent',           unit: ' km/h', icon: 'air',          color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  windDirection: { label: 'Dir. Vent',      unit: '°',     icon: 'explore',      color: 'text-primary',     bg: 'bg-primary/10' },
  rainQuantity:  { label: 'Pluie',          unit: ' mm',   icon: 'rainy',        color: 'text-tertiary',    bg: 'bg-tertiary/10' },
  lux:           { label: 'Luminosité',     unit: ' lx',   icon: 'light_mode',   color: 'text-yellow-200',  bg: 'bg-yellow-200/10' },
  gustSpeed:     { label: 'Rafales',        unit: ' km/h', icon: 'storm',        color: 'text-red-400',     bg: 'bg-red-500/10' },
  gustMin:       { label: 'Rafale Min',     unit: ' km/h', icon: 'storm',        color: 'text-red-300',     bg: 'bg-red-400/10' },
  rainRate:      { label: 'Taux de pluie',  unit: ' mm/h', icon: 'thunderstorm', color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
};

export function getSensorMeta(key) {
  // D'abord chercher la clé complète (ex: gustMin)
  if (KNOWN_SENSORS[key]) {
    return KNOWN_SENSORS[key];
  }
  // Sinon enlever le suffixe Avg/Min/Max pour trouver le meta de base (ex: temperatureAvg → temperature)
  const baseKey = key.replace(/(Avg|Min|Max)$/, '');
  if (KNOWN_SENSORS[baseKey]) {
    return KNOWN_SENSORS[baseKey];
  }

  // Fallback élégant pour tout nouveau capteur inconnu
  return {
    label: baseKey.charAt(0).toUpperCase() + baseKey.slice(1).replace(/([A-Z])/g, ' $1').trim(),
    unit: '',
    icon: 'sensors',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10'
  };
}
