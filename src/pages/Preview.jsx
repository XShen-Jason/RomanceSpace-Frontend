import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'moodspace.xyz';

/**
 * Preview page for Gallery: loads raw template HTML and renders it inside an
 * isolated full-screen iframe (srcDoc). No variable substitution is performed —
 * the template's own default-value JS will fire naturally, exactly as it does
 * when a creator opens the file locally.
 */
export default function Preview() {
    const { templateName } = useParams();
    const [rawHtml, setRawHtml] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!templateName) return;
        fetch(`${API_BASE}/api/template/raw/${templateName}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                // Inject <base> so relative assets (CSS/images) resolve correctly
                const baseTag = `<base href="https://www.${BASE_DOMAIN}/assets/${templateName}/" />`;
                const withBase = html.replace(/(<head[^>]*>)/i, `$1\n  ${baseTag}`);
                setRawHtml(withBase);
            })
            .catch(e => setError(e.message));
    }, [templateName]);

    if (error) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#ef4444' }}>
                模板加载失败：{error}
            </div>
        );
    }

    if (!rawHtml) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <iframe
            srcDoc={rawHtml}
            title={`Preview: ${templateName}`}
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin"
        />
    );
}
