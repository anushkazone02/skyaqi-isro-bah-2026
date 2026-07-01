import { useEffect, useState } from 'react';
import Papa from 'papaparse';

export function useCSV(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(path)
      .then(r => r.text())
      .then(text => {
        const result = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
        // trim header keys
        const cleaned = result.data.map(row => {
          const out = {};
          for (const k in row) out[k.trim()] = typeof row[k] === 'string' ? row[k].trim() : row[k];
          return out;
        });
        setData(cleaned);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [path]);

  return { data, loading };
}
