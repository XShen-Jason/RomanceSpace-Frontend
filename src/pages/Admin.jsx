import { useState, useEffect } from 'react';
import {
    uploadTemplate,
    syncTemplates,
    pruneTemplates,
    refreshQuotas,
    refreshBlocklist,
    updateUserTier,
    getTiers,
    getSyncStatus,
    listTemplates,
    deleteTemplate
} from '../api/client.js';
import { supabase } from '../lib/supabase.js';

export default function Admin() {
    const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'system'
    const [adminKey, setAdminKey] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [files, setFiles] = useState([]);
    const [detectedTitle, setDetectedTitle] = useState('');
    const [existingTemplates, setExistingTemplates] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [loadingSync, setLoadingSync] = useState(false);
    const [loadingQuotas, setLoadingQuotas] = useState(false);
    const [loadingBlocklist, setLoadingBlocklist] = useState(false);
    const [loadingTier, setLoadingTier] = useState(false);
    const [loadingCheck, setLoadingCheck] = useState(false);
    const [loadingPrune, setLoadingPrune] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(null); // stores template name being deleted

    const [userId, setUserId] = useState(null);
    const [currentTier, setCurrentTier] = useState(null);
    const [tiers, setTiers] = useState({});
    const [syncWarnings, setSyncWarnings] = useState({ quotas: false, blocklist: false });
    const [msg, setMsg] = useState({
        main: { error: null, success: null },
        upload: { error: null, success: null },
        tier: { error: null, success: null },
        kv: { error: null, success: null }
    });

    const clearMsgs = () => setMsg({
        main: { error: null, success: null },
        upload: { error: null, success: null },
        tier: { error: null, success: null },
        kv: { error: null, success: null }
    });

    const getErrorMessage = (err) => {
        const msgStr = err.message || String(err);
        if (msgStr.includes('templateName must contain')) return '模板英文名格式错误：仅限小写字母、数字或下划线';
        if (msgStr.includes('index.html is required')) return '核心文件缺失：必须包含 index.html';
        if (msgStr.includes('Invalid admin key') || msgStr.includes('401') || msgStr.includes('403')) return '同步失败：管理员密钥无效或权限不足';
        if (msgStr.includes('Failed to fetch')) return '网络错误：无法连接到 API 服务器，请检查网络或后端状态';
        return msgStr;
    };

    const fetchCurrentTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const res = await listTemplates();
            if (res.success) setExistingTemplates(res.templates);
        } catch (err) {
            console.error('Failed to fetch template list:', err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    useEffect(() => {
        const storedValue = localStorage.getItem('rs_admin_key');
        if (storedValue) {
            try {
                const { key, timestamp } = JSON.parse(storedValue);
                const isExpired = Date.now() - timestamp > 24 * 60 * 60 * 1000;
                if (!isExpired) setAdminKey(key);
            } catch (e) { /* invalid format */ }
        }

        const fetchTiersConfig = async () => {
            const cached = localStorage.getItem('rs_tiers_config');
            if (cached) {
                try {
                    setTiers(JSON.parse(cached));
                } catch (e) { /* ignore */ }
            } else {
                try {
                    const res = await getTiers();
                    setTiers(res.tiers);
                    localStorage.setItem('rs_tiers_config', JSON.stringify(res.tiers));
                } catch (err) {
                    console.error('Initial tiers fetch failed:', err);
                }
            }
        };

        const getSessionAndProfile = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setUserId(data.session.user.id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('tier')
                    .eq('id', data.session.user.id)
                    .single();
                if (profile) setCurrentTier(profile.tier?.toLowerCase() || 'free');
            }
        };

        getSessionAndProfile();
        fetchTiersConfig();
        fetchCurrentTemplates();
    }, []);

    const fetchTiers = async () => {
        try {
            setLoadingTier(true);
            const res = await getTiers();
            setTiers(res.tiers);
            localStorage.setItem('rs_tiers_config', JSON.stringify(res.tiers));
            setMsg(prev => ({ ...prev, tier: { success: '等级列表已刷新。', error: null } }));
        } catch (err) {
            setMsg(prev => ({ ...prev, tier: { error: '获取等级失败: ' + getErrorMessage(err), success: null } }));
        } finally {
            setLoadingTier(false);
        }
    };

    const handleCheckSync = async () => {
        if (!adminKey) return setMsg(prev => ({ ...prev, main: { error: '请输入管理员密钥' } }));
        clearMsgs();
        setLoadingCheck(true);
        saveAdminKey(adminKey);

        try {
            const res = await getSyncStatus(adminKey);
            setSyncWarnings({
                quotas: !res.quotasSynced,
                blocklist: !res.blocklistSynced
            });
            if (res.isSynced) {
                setMsg(prev => ({ ...prev, main: { success: '✅ 系统内部数据与云端完全同步。' } }));
            } else {
                setMsg(prev => ({ ...prev, main: { error: `⚠️ 云端数据已过期，请前往“系统架构”选项卡执行同步。` } }));
            }
        } catch (err) {
            setMsg(prev => ({ ...prev, main: { error: '同步校验失败: ' + getErrorMessage(err) } }));
        } finally {
            setLoadingCheck(false);
        }
    };

    const saveAdminKey = (key) => {
        const value = JSON.stringify({ key, timestamp: Date.now() });
        localStorage.setItem('rs_admin_key', value);
    };

    const handleFileChange = async (e) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            setDetectedTitle('');

            const config = selectedFiles.find(f => f.name === 'config.json' || f.name === 'schema.json');
            if (config) {
                try {
                    const text = await config.text();
                    const json = JSON.parse(text);
                    if (json.title) setDetectedTitle(json.title);
                } catch (err) {
                    console.warn('Failed to parse config.json preview');
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearMsgs();

        if (!adminKey) return setMsg(prev => ({ ...prev, upload: { error: '请输入管理员密钥' } }));
        if (!templateName) return setMsg(prev => ({ ...prev, upload: { error: '请输入模板英文名称' } }));

        if (!/^[a-z0-9_]+$/.test(templateName)) {
            return setMsg(prev => ({ ...prev, upload: { error: '模板英文名不符合规范：仅限小写字母、数字和下划线' } }));
        }

        if (files.length === 0) return setMsg(prev => ({ ...prev, upload: { error: '请至少选择一个文件' } }));

        const isConflict = existingTemplates.some(t => t.name === templateName);
        if (isConflict) {
            const confirmed = window.confirm(`警告：模板 ID "${templateName}" 已存在！\n继续上传将覆盖原有的配置。您确定要以新版本覆盖吗？`);
            if (!confirmed) return;
        }

        const hasIndex = files.some(f => f.name === 'index.html');
        const configFile = files.find(f => f.name === 'config.json' || f.name === 'schema.json');

        if (!hasIndex) return setMsg(prev => ({ ...prev, upload: { error: '缺少核心文件：index.html' } }));
        if (!configFile) return setMsg(prev => ({ ...prev, upload: { error: '缺少配置文件：config.json' } }));

        let finalConfigFile = configFile;
        let renamePerformed = false;

        try {
            const configText = await configFile.text();
            let configJson = JSON.parse(configText);

            if (!configJson.name) return setMsg(prev => ({ ...prev, upload: { error: 'config.json 缺少 "name" 字段' } }));

            if (configJson.name !== templateName) {
                configJson.name = templateName;
                const blob = new Blob([JSON.stringify(configJson, null, 2)], { type: 'application/json' });
                finalConfigFile = new File([blob], configFile.name, { type: 'application/json' });
                renamePerformed = true;
            }

            if (!configJson.title) return setMsg(prev => ({ ...prev, upload: { error: 'config.json 缺少 "title" (中文名) 字段' } }));
            if (!configJson.fields || !Array.isArray(configJson.fields)) {
                return setMsg(prev => ({ ...prev, upload: { error: 'config.json 缺少 "fields" 数组' } }));
            }
        } catch (err) {
            return setMsg(prev => ({ ...prev, upload: { error: 'config.json 格式错误：请检查是否为有效的 JSON 文件' } }));
        }

        saveAdminKey(adminKey);

        const formData = new FormData();
        formData.append('templateName', templateName);
        formData.append('syncToGithub', 'true');

        files.forEach(file => {
            if (file.name === configFile.name) {
                formData.append(file.name, finalConfigFile);
            } else {
                formData.append(file.name, file);
            }
        });

        setLoadingUpload(true);
        try {
            const res = await uploadTemplate(formData, adminKey);
            let successMsg = `模板 ${res.title || res.templateName} (${res.version}) 上传成功！`;
            if (renamePerformed) successMsg += ` (已自动同步 ID)`;

            setMsg(prev => ({ ...prev, upload: { success: successMsg, error: null } }));
            setFiles([]);
            setTemplateName('');
            setDetectedTitle('');

            fetchCurrentTemplates();
        } catch (err) {
            setMsg(prev => ({ ...prev, upload: { error: getErrorMessage(err), success: null } }));
        } finally {
            setLoadingUpload(false);
        }
    };

    const handleSync = async () => {
        if (!adminKey) return setMsg(prev => ({ ...prev, main: { error: '请输入管理员密钥' } }));
        clearMsgs();
        setLoadingSync(true);
        saveAdminKey(adminKey);
        try {
            const res = await syncTemplates(adminKey);
            let successMsg = `同步成功！共推送了 ${res.count} 个模板。`;
            if (res.purgedCount > 0) successMsg += ` 清理了 ${res.purgedCount} 个无效模板。`;
            setMsg(prev => ({ ...prev, main: { success: successMsg, error: null } }));
            fetchCurrentTemplates();
        } catch (err) {
            setMsg(prev => ({ ...prev, main: { error: '同步操作失败: ' + getErrorMessage(err), success: null } }));
        } finally {
            setLoadingSync(false);
        }
    };

    const handlePrune = async () => {
        if (!adminKey) return setMsg(prev => ({ ...prev, main: { error: '请输入管理员密钥' } }));

        const confirmed = window.confirm('⚠️ 警告：存储深度清理将永久删除 R2 中所有“非活跃”版本的文件。该操作无法撤销。是否继续？');
        if (!confirmed) return;

        clearMsgs();
        setLoadingPrune(true);
        saveAdminKey(adminKey);
        try {
            const res = await pruneTemplates(adminKey);
            setMsg(prev => ({ ...prev, main: { success: `清理完成！共删除了 ${res.objectsDeleted} 个残留对象。`, error: null } }));
        } catch (err) {
            setMsg(prev => ({ ...prev, main: { error: '清理失败: ' + getErrorMessage(err), success: null } }));
        } finally {
            setLoadingPrune(false);
        }
    };

    const handleUpdateTier = async (newTier) => {
        if (!adminKey) return setMsg(prev => ({ ...prev, tier: { error: '请输入管理员密钥' } }));
        if (!userId) return setMsg(prev => ({ ...prev, tier: { error: '未登录' } }));

        clearMsgs();
        setLoadingTier(true);
        saveAdminKey(adminKey);

        try {
            await updateUserTier(userId, newTier, adminKey);
            setMsg(prev => ({ ...prev, tier: { success: `等级已更新：${newTier}。`, error: null } }));
            setCurrentTier(newTier.toLowerCase());
        } catch (err) {
            setMsg(prev => ({ ...prev, tier: { error: '更新失败: ' + getErrorMessage(err), success: null } }));
        } finally {
            setLoadingTier(false);
        }
    };

    const handleRefreshKV = async (type) => {
        if (!adminKey) return setMsg(prev => ({ ...prev, kv: { error: '请输入管理员密钥' } }));
        clearMsgs();

        if (type === 'quotas') setLoadingQuotas(true);
        else setLoadingBlocklist(true);

        saveAdminKey(adminKey);

        try {
            if (type === 'quotas') await refreshQuotas(adminKey);
            else await refreshBlocklist(adminKey);
            setMsg(prev => ({ ...prev, kv: { success: '刷新成功。', error: null } }));
            setSyncWarnings(prev => ({ ...prev, [type]: false }));
        } catch (err) {
            setMsg(prev => ({ ...prev, kv: { error: '刷新失败: ' + getErrorMessage(err), success: null } }));
        } finally {
            setLoadingQuotas(false);
            setLoadingBlocklist(false);
        }
    };

    const handleDeleteTemplate = async (name) => {
        if (!adminKey) return setMsg(prev => ({ ...prev, main: { error: '请输入管理员密钥' } }));

        const confirmed = window.confirm(`❗ 危险操作：确定要删除模板 "${name}" 吗？\n\n1. 所有使用该模板的用户页面将无法正常显示。\n2. R2 存储中的所有相关版本文件将被彻底物理删除。\n\n此操作不可逆，请确认！`);
        if (!confirmed) return;

        setLoadingDelete(name);
        try {
            const res = await deleteTemplate(name, adminKey);
            setMsg(prev => ({ ...prev, main: { success: `模板 "${name}" 已彻底删除。`, error: null } }));
            fetchCurrentTemplates();
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            if (errorMsg.includes('Template in use')) {
                const force = window.confirm(`${errorMsg}\n\n点击“确定”将强制删除（危险），点击“取消”中止操作。`);
                if (force) {
                    try {
                        // Retry with force query param
                        await fetch(`/api/template/${name}?force=true`, {
                            method: 'DELETE',
                            headers: { 'X-Admin-Key': adminKey }
                        });
                        setMsg(prev => ({ ...prev, main: { success: `模板 "${name}" 已强制删除。`, error: null } }));
                        fetchCurrentTemplates();
                    } catch (e) {
                        setMsg(prev => ({ ...prev, main: { error: '强制删除失败: ' + e.message, success: null } }));
                    }
                }
            } else {
                setMsg(prev => ({ ...prev, main: { error: '删除失败: ' + errorMsg, success: null } }));
            }
        } finally {
            setLoadingDelete(null);
        }
    };

    return (
        <div className="page container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 className="section-title">🛡️ 管理控制台</h1>
                <p className="section-sub">RomanceSpace 核心引擎调度与资源管理</p>
            </div>

            {/* Admin Key Global Input */}
            <div className="builder-card" style={{ padding: '15px 25px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px', background: '#fff', border: '1px solid #eee' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#666', marginBottom: '5px', display: 'block' }}>🔑 超级管理员密钥 (身份标识)</label>
                    <input
                        type="password"
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        placeholder="请输入授权密钥以执行敏感操作"
                        style={{ margin: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSync} className="btn btn--sm" disabled={loadingSync} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }} title="将 GitHub 仓库的最新的代码同步到 R2 存储">
                        {loadingSync ? '同步中...' : '🔄 同步仓库代码'}
                    </button>
                    <button onClick={handleCheckSync} className="btn btn--sm" disabled={loadingCheck} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }} title="核对云端 KV 与本地内存的数据一致性">
                        {loadingCheck ? '核对化...' : '🔍 配置一致性校验'}
                    </button>
                </div>
            </div>

            {/* Alerts Container */}
            <div style={{ marginBottom: '20px' }}>
                {msg.main.error && <div className="alert alert--error" style={{ marginBottom: '10px' }}>{msg.main.error}</div>}
                {msg.main.success && <div className="alert alert--success" style={{ marginBottom: '10px' }}>{msg.main.success}</div>}
            </div>

            {/* Tabs Navigation */}
            <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: '30px' }}>
                <button
                    onClick={() => setActiveTab('templates')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'templates' ? '2px solid var(--primary)' : 'none',
                        color: activeTab === 'templates' ? 'var(--primary-dark)' : '#64748b',
                        fontWeight: activeTab === 'templates' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    🎨 模板中心
                </button>
                <button
                    onClick={() => setActiveTab('system')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'system' ? '2px solid var(--primary)' : 'none',
                        color: activeTab === 'system' ? 'var(--primary-dark)' : '#64748b',
                        fontWeight: activeTab === 'system' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    ⚙️ 系统架构
                </button>
            </div>

            <div className="admin-content">
                {activeTab === 'templates' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 450px) 1fr', gap: '30px' }}>
                        {/* Template Upload Form */}
                        <div className="builder-card" style={{ height: 'fit-content' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#333' }}>🚀 发布新模板</h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>模板英文名 ID</label>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="例如：anniversary_modern"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>本地代码打包</label>
                                    <div style={{ border: '2px dashed #eee', padding: '20px', textAlign: 'center', borderRadius: '10px', background: '#fafafa', position: 'relative' }}>
                                        <input type="file" multiple onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                        <p style={{ margin: 0, color: '#666' }}>{files.length > 0 ? `已选中 ${files.length} 个文件` : "点击上传源文件"}</p>
                                        {detectedTitle && <p style={{ margin: '5px 0', color: 'var(--primary)', fontWeight: 700 }}>{detectedTitle}</p>}
                                    </div>
                                </div>
                                <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: '10px' }} disabled={loadingUpload}>
                                    {loadingUpload ? '发版中...' : '确认发布 / 覆盖更新'}
                                </button>
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
                                    💡 提示：请选择包含 index.html 和 config.json 的<b>文件夹</b>或<b>多个文件</b>进行上传。
                                </p>
                                {msg.upload.error && <div className="alert alert--error" style={{ marginTop: '15px' }}>{msg.upload.error}</div>}
                                {msg.upload.success && <div className="alert alert--success" style={{ marginTop: '15px' }}>{msg.upload.success}</div>}
                            </form>
                        </div>

                        {/* Existing Templates List */}
                        <div className="builder-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#333' }}>📋 活跃模板库 ({existingTemplates.length})</h3>
                                <input
                                    type="text"
                                    placeholder="搜索 ID 或名称..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ margin: 0, padding: '5px 10px', width: '180px', fontSize: '0.85rem' }}
                                />
                            </div>
                            {existingTemplates.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666' }}>暂无模板</p>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>ID</th>
                                                <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem' }}>名称</th>
                                                <th style={{ padding: '8px', textAlign: 'right', color: '#64748b', fontSize: '0.8rem' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {existingTemplates
                                                .filter(t =>
                                                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    (t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                                )
                                                .map(tmpl => (
                                                    <tr key={tmpl.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{tmpl.name}</td>
                                                        <td style={{ padding: '12px 8px', color: '#334155' }}>{tmpl.title}</td>
                                                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => handleDeleteTemplate(tmpl.name)}
                                                                className="btn btn--sm"
                                                                disabled={loadingDelete === tmpl.name}
                                                                style={{
                                                                    background: '#fef2f2',
                                                                    color: '#dc2626',
                                                                    border: '1px solid #fee2e2',
                                                                    padding: '4px 10px'
                                                                }}
                                                            >
                                                                {loadingDelete === tmpl.name ? '...' : '删除'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        {/* Membership & Rights */}
                        <div className="builder-card">
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                👤 权限与配额管理
                                <button onClick={fetchTiers} disabled={loadingTier} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>🔄</button>
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.keys(tiers).map(t => (
                                    <div key={t} style={{
                                        padding: '12px 20px',
                                        borderRadius: '12px',
                                        background: currentTier === t.toLowerCase() ? 'linear-gradient(135deg, #10b981, #059669)' : '#fff',
                                        color: currentTier === t.toLowerCase() ? '#fff' : '#334155',
                                        boxShadow: currentTier === t.toLowerCase() ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
                                        border: currentTier === t.toLowerCase() ? 'none' : '1px solid #e2e8f0',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: 700 }}>{tiers[t].label}</span>
                                        <button
                                            onClick={() => handleUpdateTier(t)}
                                            disabled={loadingTier || currentTier === t.toLowerCase()}
                                            style={{
                                                padding: '5px 15px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                background: currentTier === t.toLowerCase() ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                                color: currentTier === t.toLowerCase() ? '#fff' : '#475569',
                                                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            {currentTier === t.toLowerCase() ? '当前持有' : '测试切换'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {msg.tier.error && <div className="alert alert--error" style={{ marginTop: '15px' }}>{msg.tier.error}</div>}
                            {msg.tier.success && <div className="alert alert--success" style={{ marginTop: '15px' }}>{msg.tier.success}</div>}
                        </div>

                        {/* Engine & R2 Operations */}
                        <div className="builder-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>⚡ 核心调度与清理</h3>
                                <button onClick={handleCheckSync} className="btn btn--sm" disabled={loadingCheck} style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', margin: 0 }}>
                                    {loadingCheck ? '正在核对...' : '🔍 开启一致性校验'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <button
                                    className="btn"
                                    onClick={() => handleRefreshKV('quotas')}
                                    disabled={loadingQuotas || !syncWarnings.quotas}
                                    style={{
                                        flexDirection: 'column', padding: '20px', height: 'auto',
                                        background: syncWarnings.quotas ? '#fff7ed' : '#f8fafc',
                                        border: syncWarnings.quotas ? '1px solid #fdba74' : '1px solid #e2e8f0',
                                        opacity: (!syncWarnings.quotas && !loadingQuotas) ? 0.5 : 1
                                    }}
                                    title={syncWarnings.quotas ? "从云端 KV 缓存拉取最新的会员等级数据到 VPS 内存" : "内存数据已是最新，无需刷新"}
                                >
                                    <span style={{ fontSize: '1.4rem' }}>💎</span>
                                    <span style={{ marginTop: '5px' }}>同步等级数据</span>
                                    {!syncWarnings.quotas && <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>已同步</span>}
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => handleRefreshKV('blocklist')}
                                    disabled={loadingBlocklist || !syncWarnings.blocklist}
                                    style={{
                                        flexDirection: 'column', padding: '20px', height: 'auto',
                                        background: syncWarnings.blocklist ? '#fff7ed' : '#f8fafc',
                                        border: syncWarnings.blocklist ? '1px solid #fdba74' : '1px solid #e2e8f0',
                                        opacity: (!syncWarnings.blocklist && !loadingBlocklist) ? 0.5 : 1
                                    }}
                                    title={syncWarnings.blocklist ? "检测到数据过期，点击同步最新的域名黑名单" : "数据已是最新，无需同步"}
                                >
                                    <span style={{ fontSize: '1.4rem' }}>🚫</span>
                                    <span style={{ marginTop: '5px' }}>同步黑名单数据</span>
                                    {!syncWarnings.blocklist && <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>已同步</span>}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
                                🛡️ 为了节省资源，执行同步前必须先通过“一致性校验”发现异常。
                            </p>
                            <button
                                onClick={handlePrune}
                                disabled={loadingPrune}
                                className="btn"
                                style={{ width: '100%', marginTop: '15px', background: '#dc2626', color: '#fff', border: 'none', padding: '12px' }}
                            >
                                {loadingPrune ? '深度清理中...' : '🧹 深度清理 R2 存储残留版本'}
                            </button>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
                                注意：此操作将永久移除所有非活跃版本的 R2 物理文件。
                            </p>
                            {msg.kv.error && <div className="alert alert--error" style={{ marginTop: '15px' }}>{msg.kv.error}</div>}
                            {msg.kv.success && <div className="alert alert--success" style={{ marginTop: '15px' }}>{msg.kv.success}</div>}
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .admin-table tr:hover { background-color: #f8fafc; }
                .admin-content button:disabled { opacity: 0.6; cursor: not-allowed; }
            ` }} />
        </div>
    );
}
