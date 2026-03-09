import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listTemplates, renderProject } from '../api/client.js';

const BASE_DOMAIN = '885201314.xyz';

export default function Builder() {
    const { templateName } = useParams();
    const navigate = useNavigate();

    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelected] = useState(null);
    const [subdomain, setSubdomain] = useState('');
    const [fieldValues, setFieldValues] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [result, setResult] = useState(null);   // { url, previewUrl, isUpdate }
    const [submitError, setSubmitError] = useState(null);

    // Load template list once
    useEffect(() => {
        listTemplates()
            .then((d) => {
                const list = d.templates ?? [];
                setTemplates(list);
                if (templateName) {
                    const found = list.find((t) => t.name === templateName);
                    if (found) setSelected(found);
                }
            })
            .catch((e) => setFetchError(e.message));
    }, [templateName]);

    function handleTemplateChange(e) {
        const found = templates.find((t) => t.name === e.target.value) ?? null;
        setSelected(found);
        setFieldValues({});
        setResult(null);
        setSubmitError(null);
        if (found) navigate(`/builder/${found.name}`, { replace: true });
        else navigate('/builder', { replace: true });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitError(null);
        setResult(null);

        if (!selectedTemplate) return setSubmitError('请选择一个模板');
        if (!subdomain) return setSubmitError('请填写子域名');

        setLoading(true);
        try {
            const data = await renderProject({
                subdomain,
                type: selectedTemplate.name,
                data: fieldValues,
            });
            setResult({ url: data.url, previewUrl: data.previewUrl, isUpdate: data.isUpdate });
        } catch (err) {
            setSubmitError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page container">
            <h1 className="section-title">✏️ 创建专属页面</h1>
            <p className="section-sub">填写信息后，系统将即时生成带独立域名的浪漫网页。</p>

            {fetchError && <div className="alert alert--error">模板加载失败：{fetchError}</div>}

            {result && (
                <div className="alert alert--success" style={{ maxWidth: 640, margin: '0 auto 1.5rem' }}>
                    🎉 页面{result.isUpdate ? '更新' : '创建'}成功！
                    <div className="alert__actions">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--sm">
                            访问页面 ↗
                        </a>
                        <a href={result.previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn--outline btn--sm">
                            即时预览（绕过缓存）
                        </a>
                    </div>
                </div>
            )}

            {submitError && (
                <div className="alert alert--error" style={{ maxWidth: 640, margin: '0 auto 1rem' }}>
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="builder-card">

                {/* Template selector */}
                <div className="form-group">
                    <label htmlFor="template">📦 选择模板</label>
                    <select
                        id="template"
                        value={selectedTemplate?.name ?? ''}
                        onChange={handleTemplateChange}
                        required
                    >
                        <option value="">-- 请选择 --</option>
                        {templates.map((t) => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Subdomain */}
                <div className="form-group">
                    <label htmlFor="subdomain">🌐 专属子域名</label>
                    <div className="input-row">
                        <input
                            id="subdomain"
                            type="text"
                            value={subdomain}
                            onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            placeholder="e.g. sweeties"
                            required
                        />
                        <span className="input-suffix">.{BASE_DOMAIN}</span>
                    </div>
                </div>

                {/* Dynamic fields from schema */}
                {selectedTemplate && !selectedTemplate.static && (selectedTemplate.fields ?? []).length > 0 && (
                    <>
                        <hr className="builder-divider" />
                        <p className="builder-section-label">📝 个性化内容</p>
                        {selectedTemplate.fields.map((key) => (
                            <div className="form-group" key={key}>
                                <label htmlFor={`f-${key}`}>{key}</label>
                                <textarea
                                    id={`f-${key}`}
                                    rows={2}
                                    value={fieldValues[key] ?? ''}
                                    onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                    placeholder={`请输入 ${key}`}
                                />
                            </div>
                        ))}
                    </>
                )}

                <div className="builder-submit">
                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? '生成中...' : '✨ 生成我的专属页面'}
                    </button>
                </div>
            </form>
        </div>
    );
}
