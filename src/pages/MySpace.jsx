import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

const TIER_LABELS = {
    free: { label: '🌟 体验用户', color: '#64748b' },
    pro: { label: '💎 高级会员', color: '#7c3aed' },
    lifetime: { label: '👑 终身贵宾', color: '#b45309' },
};

export default function MySpace() {
    const { user, profile, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [localInviteCode, setLocalInviteCode] = useState(null);

    // Guard: redirect to auth if not logged in
    useEffect(() => {
        if (!loading && !user) navigate('/auth', { replace: true });
    }, [loading, user, navigate]);

    // Sync local invite code from profile
    useEffect(() => {
        if (profile?.invite_code) setLocalInviteCode(profile.invite_code);
    }, [profile]);

    // Load this user's projects from Supabase
    useEffect(() => {
        if (!user) return;
        supabase
            .from('projects')
            .select('subdomain, template_type, created_at, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .then(({ data, error }) => {
                if (error) toast.error('加载项目失败：' + error.message);
                else setProjects(data ?? []);
                setLoadingProjects(false);
            });
    }, [user]);

    async function handleSignOut() {
        await signOut();
        toast.success('已退出登录');
        navigate('/');
    }

    /**
     * Generate an invite code for users who registered before codes were introduced.
     * Uses the first 8 chars of their UUID.
     */
    async function handleGenerateCode() {
        setGeneratingCode(true);
        const code = user.id.slice(0, 8).toUpperCase();
        const { error } = await supabase
            .from('profiles')
            .update({ invite_code: code })
            .eq('id', user.id);
        if (error) {
            toast.error('生成失败：' + error.message);
        } else {
            setLocalInviteCode(code);
            toast.success('邀请码已生成！');
        }
        setGeneratingCode(false);
    }

    if (loading || !user) {
        return (
            <div className="spinner-wrap">
                <div className="spinner" />
            </div>
        );
    }

    const tierMeta = TIER_LABELS[profile?.tier ?? 'free'];
    const inviteCode = localInviteCode;
    const inviteUrl = inviteCode
        ? `${window.location.origin}/auth?ref=${inviteCode}`
        : null;

    return (
        <div className="page container" style={{ maxWidth: 720 }}>
            {/* ── Profile Card ── */}
            <div className="myspace-profile-card">
                <div className="myspace-avatar">
                    {profile?.display_name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                </div>
                <div className="myspace-profile-info">
                    <h1 className="myspace-username">
                        {profile?.display_name ?? profile?.username ?? user.email}
                    </h1>
                    <span className="myspace-tier" style={{ color: tierMeta.color }}>
                        {tierMeta.label}
                    </span>
                </div>
                <button id="btn-signout" className="btn btn--outline btn--sm" onClick={handleSignOut}>
                    退出
                </button>
            </div>

            {/* ── Invite & Projects ── */}
            <div className="grid" style={{ gap: '1rem', gridTemplateColumns: '1fr' }}>
                {/* Invite Section */}
                <div className="myspace-section-card" style={{ padding: '1.25rem', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h2 className="myspace-section-title" style={{ margin: 0, fontSize: '0.95rem' }}>📣 专属邀请码</h2>
                        {inviteCode && (
                            <button
                                id="btn-copy-invite"
                                className="badge"
                                style={{ border: 'none', cursor: 'pointer', padding: '4px 12px' }}
                                onClick={() => {
                                    navigator.clipboard.writeText(inviteUrl);
                                    toast.success('链接已复制');
                                }}
                            >
                                点击复制
                            </button>
                        )}
                    </div>
                    
                    {inviteCode ? (
                        <div className="myspace-invite-box" style={{ background: 'var(--pink-light)', border: 'none', padding: '0.5rem 1rem' }}>
                            <code id="invite-code-display" className="myspace-invite-code" style={{ fontSize: '1rem', color: 'var(--pink)' }}>{inviteCode}</code>
                        </div>
                    ) : (
                        <button
                            id="btn-generate-code"
                            className="btn btn--primary btn--sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                            onClick={handleGenerateCode}
                            disabled={generatingCode}
                        >
                            {generatingCode ? '生成中...' : '✨ 生成我的邀请码'}
                        </button>
                    )}
                </div>

            {/* ── My Projects ── */}
            <div className="myspace-section-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="myspace-section-title" style={{ marginBottom: 0 }}>🌐 我制作的网页</h2>
                    <Link to="/builder" className="btn btn--primary btn--sm" id="btn-create-new">
                        + 新建
                    </Link>
                </div>

                {loadingProjects && <div className="spinner-wrap"><div className="spinner" /></div>}

                {!loadingProjects && projects.length === 0 && (
                    <div className="alert alert--info">
                        暂未制作过网页。
                        <Link to="/gallery" style={{ marginLeft: '0.5rem', color: '#1d4ed8', fontWeight: 600 }}>
                            去挑选款式 →
                        </Link>
                    </div>
                )}

                {!loadingProjects && projects.length > 0 && (
                    <div className="myspace-projects-list">
                        {projects.map(p => (
                            <div key={p.subdomain} className="myspace-project-row">
                                <div className="myspace-project-info">
                                    <span className="myspace-project-domain" id={`domain-${p.subdomain}`}>
                                        🔗 {p.subdomain}.885201314.xyz
                                    </span>
                                    <span className="myspace-project-meta">
                                        所选款式：{p.template_type} ·
                                        更新于 {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                                    </span>
                                </div>
                                <div className="myspace-project-actions">
                                    <a
                                        href={`https://${p.subdomain}.885201314.xyz`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn--outline btn--sm"
                                    >
                                        访问
                                    </a>
                                    <Link
                                        to={`/builder/${p.template_type}?edit=${p.subdomain}`}
                                        className="btn btn--primary btn--sm"
                                        id={`btn-edit-${p.subdomain}`}
                                    >
                                        编辑
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            </div> {/* This closes the <div className="grid"> */}

            {/* ── Upgrade hint for free users ── */}
            {profile?.tier === 'free' && (
                <div className="myspace-upgrade-hint">
                    <span>💡 体验用户限制作 1 个专属网页，每天最多修改 3 次内容。升级高级会员更享受极速专线和无限功能。</span>
                    <a href="#" className="btn btn--primary btn--sm" style={{ marginLeft: '1rem' }}>
                        升级高级会员
                    </a>
                </div>
            )}
        </div>
    );
}
