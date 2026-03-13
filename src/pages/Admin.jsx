import { useState, useEffect } from 'react';
import { uploadTemplate, syncTemplates, refreshQuotas, refreshBlocklist } from '../api/client.js';

export default function Admin() {
    const [adminKey, setAdminKey] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [files, setFiles] = useState([]);
    const [syncToGithub, setSyncToGithub] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Initialize admin key from local storage
    useEffect(() => {
        const savedKey = localStorage.getItem('rs_admin_key');
        if (savedKey) setAdminKey(savedKey);
    }, []);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!adminKey) return setError('请输入管理员密钥');
        if (!templateName) return setError('请输入模板英文名称');
        if (files.length === 0) return setError('请至少选择一个文件（必须包含 index.html）');

        // Save key for future convenience
        localStorage.setItem('rs_admin_key', adminKey);

        const formData = new FormData();
        formData.append('templateName', templateName);
        formData.append('syncToGithub', syncToGithub);
        files.forEach(file => {
            formData.append(file.name, file);
        });

        setLoading(true);
        try {
            const res = await uploadTemplate(formData, adminKey);
            setSuccess(`模板 ${res.templateName} (${res.version}) 上传成功！`);
            setFiles([]);
            setTemplateName('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!adminKey) return setError('请输入管理员密钥');
        setError(null);
        setSuccess(null);
        setLoading(true);
        localStorage.setItem('rs_admin_key', adminKey);
        
        try {
            const res = await syncTemplates(adminKey);
            setSuccess(`同步成功！共推送了 ${res.count} 个本地模板到 R2 和 KV。`);
        } catch (err) {
            setError('同步失败: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshKV = async (type) => {
        if (!adminKey) return setError('请输入管理员密钥');
        setError(null);
        setSuccess(null);
        setLoading(true);
        localStorage.setItem('rs_admin_key', adminKey);
        
        try {
            if (type === 'quotas') {
                const res = await refreshQuotas(adminKey);
                setSuccess(`配额同步成功：${res.message}`);
            } else {
                const res = await refreshBlocklist(adminKey);
                setSuccess(`黑名单同步成功：${res.message} (当前条数: ${res.count})`);
            }
        } catch (err) {
            setError(`${type === 'quotas' ? '配额' : '黑名单'}同步失败: ` + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page container" style={{ maxWidth: 600 }}>
            <h1 className="section-title">🛡️ 管理员后台</h1>
            <p className="section-sub">专属模板发版通道，直连 R2 边缘存储集群。</p>

            {error && <div className="alert alert--error">{error}</div>}
            {success && <div className="alert alert--success">{success}</div>}

            <form onSubmit={handleSubmit} className="builder-card">
                <div className="form-group">
                    <label htmlFor="adminKey">🔑 超管密钥 (X-Admin-Key)</label>
                    <input
                        id="adminKey"
                        type="password"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        placeholder="请输入您的管理员密码"
                        required
                    />
                </div>

                <hr className="builder-divider" />

                <div className="form-group">
                    <label htmlFor="templateName">📁 模板英文名</label>
                    <input
                        id="templateName"
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="e.g. love_card_v2 (小写字母/数字/下划线)"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>📄 模板源文件打包上传</label>
                    <div style={{
                        border: '2px dashed #e0d0d8',
                        padding: '2rem',
                        textAlign: 'center',
                        borderRadius: '8px',
                        background: '#fafafa',
                        cursor: 'pointer',
                        position: 'relative'
                    }}>
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                opacity: 0, cursor: 'pointer'
                            }}
                        />
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
                        <p style={{ color: '#7f8c8d', margin: 0, fontWeight: 500 }}>
                            {files.length > 0 ? `已选中 ${files.length} 个文件` : "点击或拖拽源文件到此处"}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: '#a0aab2', marginTop: '5px' }}>
                            必须包含 index.html 和 config.json (或旧的 schema.json)
                        </p>
                    </div>

                    {files.length > 0 && (
                        <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666', background: '#f8fafc', padding: '10px', borderRadius: '4px' }}>
                            <strong>待上传清单：</strong>
                            <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                                {files.map((f, i) => (
                                    <li key={i}>{f.webkitRelativePath || f.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <input
                        id="syncToGithub"
                        type="checkbox"
                        checked={syncToGithub}
                        onChange={(e) => setSyncToGithub(e.target.checked)}
                        style={{ cursor: 'pointer', width: 'auto' }}
                    />
                    <label htmlFor="syncToGithub" style={{ cursor: 'pointer', margin: 0, fontSize: '0.9rem', color: '#1d4ed8', fontWeight: 600 }}>
                        ✨ 同时将文件同步备份到 GitHub 仓库 (推荐)
                    </label>
                </div>

                <div className="builder-submit" style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn--primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
                        {loading ? '发布中...' : '🚀 一键提交选中文件'}
                    </button>
                    <button type="button" onClick={handleSync} className="btn" style={{ flex: 1, justifyContent: 'center', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }} disabled={loading}>
                        {loading ? '计算中...' : '🔄 同步本地全量模板'}
                    </button>
                </div>
            </form>
            
            <div className="note" style={{ marginTop: '20px', fontSize: '0.85rem' }}>
                <strong>💡 两种上传方式说明：</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                    <li><strong>手动模式</strong>：适合你在电脑上选好文件，上传一个全新的或临时的模板。</li>
                    <li><strong>全量同步</strong>：后端会自动扫描 <code>RomanceSpace-Templates/src</code> 目录，将里面所有的文件夹一次性推送到 R2 和 KV。适合你刚更新完代码，想让云端数据立刻整齐划一。</li>
                </ul>
            </div>

            <div className="builder-card" style={{ marginTop: '20px', border: '1px var(--primary-light) solid' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--primary-dark)' }}>⚙️ 系统配置同步 (Cloudflare KV → VPS)</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '15px' }}>
                    当您在 Cloudflare 后台手动修改了 KV 值（如配额、会员标签或黑名单）时，点击下方按钮强制 VPS 更新内存缓存。
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        type="button" 
                        onClick={() => handleRefreshKV('quotas')} 
                        className="btn btn--sm" 
                        style={{ flex: 1, background: '#fff', border: '1px solid #d1d5db', color: '#374151' }}
                        disabled={loading}
                    >
                        {loading ? '同步中...' : '🔄 同步会员等级/配额'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => handleRefreshKV('blocklist')} 
                        className="btn btn--sm" 
                        style={{ flex: 1, background: '#fff', border: '1px solid #d1d5db', color: '#374151' }}
                        disabled={loading}
                    >
                        {loading ? '同步中...' : '🚫 同步域名黑名单'}
                    </button>
                </div>
            </div>
        </div>
    );
}
