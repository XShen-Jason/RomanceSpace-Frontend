import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';

const translateError = (msg) => {
    if (!msg) return '发生未知错误，请重试';
    if (msg.includes('Invalid login credentials')) return '邮箱或密码不正确哦，请检查一下';
    if (msg.includes('User already registered')) return '这个邮箱已经注册过啦，请直接登录';
    if (msg.includes('Password should be at least')) return '密码太短啦，至少需要 8 个字符哦';
    if (msg.includes('rate limit')) return '操作太频繁啦，请稍等一会儿再试';
    if (msg.includes('Email not confirmed')) return '邮箱还没有验证哦，请去邮箱点一下验证链接';
    return msg; // Fallback
};

/**
 * Single page: handles Register, Login, and Forgot Password modes.
 */
export default function Auth() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const [tab, setTab] = useState('login'); // 'login' | 'register'
    const [view, setView] = useState('form'); // 'form' | 'forgot'
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [inviteCode, setInviteCode] = useState(searchParams.get('ref') ?? '');
    
    const [loading, setLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);

    // If already logged in, redirect to MySpace
    useEffect(() => {
        if (user) navigate('/my-space', { replace: true });
    }, [user, navigate]);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) toast.error(translateError(error.message));
        else {
            toast.success('登录成功！');
            navigate('/my-space');
        }
        setLoading(false);
    }

    async function handleRegister(e) {
        e.preventDefault();
        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            toast.error(translateError(error.message));
            setLoading(false);
            return;
        }

        if (data.user && data.user.identities && data.user.identities.length === 0) {
            toast.error('该邮箱已被注册，请直接登录或找回密码。');
            setTab('login');
            setView('form');
            setLoading(false);
            return;
        }

        if (inviteCode && data.user) {
            const { data: inviter } = await supabase
                .from('profiles')
                .select('id')
                .eq('invite_code', inviteCode.trim().toUpperCase())
                .maybeSingle();

            if (inviter) {
                await supabase
                    .from('profiles')
                    .update({ invited_by: inviter.id })
                    .eq('id', data.user.id);
            }
        }

        if (data.user) {
            const myCode = data.user.id.slice(0, 8).toUpperCase();
            await supabase.from('profiles').update({ invite_code: myCode }).eq('id', data.user.id);
        }

        toast.success('注册成功！请查收验证邮件后登录。');
        setTab('login');
        setView('form');
        setLoading(false);
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        setLoading(true);

        // Call the built-in reset password API directly.
        // Note: Supabase will NOT send an email if the user does not exist,
        // saving your Brevo quota automatically. However, it will return success 
        // to prevent email enumeration attacks.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });

        if (error) {
            toast.error('发送失败：' + translateError(error.message));
        } else {
            // We just tell the user explicitly it's sent to simplify UX.
            toast.success('密码重置链接已发送！');
            setForgotSent(true);
        }
        setLoading(false);
    }

    return (
        <div className="page container" style={{ maxWidth: 460 }}>
            <div className="auth-card">
                <div className="auth-logo">💕</div>
                <h1 className="auth-title">浪漫空间</h1>
                <p className="auth-sub">登录后即可永久保存你的浪漫网页</p>

                {/* Tab switcher: Only Login and Register, hidden when in 'forgot' view */}
                {view === 'form' && (
                    <div className="auth-tabs">
                        <button
                            id="tab-login"
                            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
                            onClick={() => { setTab('login'); setView('form'); }}
                        >登录</button>
                        <button
                            id="tab-register"
                            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
                            onClick={() => { setTab('register'); setView('form'); }}
                        >注册</button>
                    </div>
                )}

                {/* ── Login Form ── */}
                {tab === 'login' && view === 'form' && (
                    <form onSubmit={handleLogin} id="form-login">
                        <div className="form-group">
                            <label htmlFor="login-email">邮箱</label>
                            <input id="login-email" type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="你的邮箱地址" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="login-password">密码</label>
                            <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                                <input id="login-password" type={showPassword ? "text" : "password"} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="请输入密码" required style={{ width: '100%', paddingRight: '2.5rem' }} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#888'
                                    }}
                                >
                                    {showPassword 
                                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    }
                                </button>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', marginBottom: '0.75rem' }}>
                            <button
                                type="button"
                                className="auth-link-btn"
                                onClick={() => { setView('forgot'); setForgotSent(false); }}
                            >
                                忘记密码？
                            </button>
                        </div>
                        <button id="btn-login-submit" type="submit" className="btn btn--primary auth-submit" disabled={loading}>
                            {loading ? '登录中...' : '🔑 立即登录'}
                        </button>
                    </form>
                )}

                {/* ── Forgot Password Form (inside Login tab) ── */}
                {tab === 'login' && view === 'forgot' && (
                    forgotSent
                        ? (
                            <div className="alert alert--success" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                                ✉️ 密码重置链接已发送！<br />
                                请查收邮件，点击链接即可设置新密码。
                            </div>
                        )
                        : (
                            <form onSubmit={handleForgotPassword} id="form-forgot">
                                <div className="form-group">
                                    <label htmlFor="forgot-email">邮箱</label>
                                    <input id="forgot-email" type="email" value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="你注册时使用的邮箱" required />
                                </div>
                                <p className="auth-disclaimer">
                                    我们将向该邮箱发送密码重置链接。
                                </p>
                                <button id="btn-forgot-submit" type="submit" className="btn btn--primary auth-submit" disabled={loading}>
                                    {loading ? '发送中...' : '📧 发送重置链接'}
                                </button>
                                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        className="auth-link-btn"
                                        onClick={() => setView('form')}
                                    >
                                        返回登录
                                    </button>
                                </div>
                            </form>
                        )
                )}

                {/* ── Register Form ── */}
                {tab === 'register' && (
                    <form onSubmit={handleRegister} id="form-register">
                        <div className="form-group">
                            <label htmlFor="reg-email">邮箱</label>
                            <input id="reg-email" type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="你的邮箱地址" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-password">密码</label>
                            <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                                <input id="reg-password" type={showPassword ? "text" : "password"} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="至少 8 位" minLength={8} required style={{ width: '100%', paddingRight: '2.5rem' }} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#888'
                                    }}
                                >
                                    {showPassword 
                                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    }
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-invite">邀请码（选填）</label>
                            <input id="reg-invite" type="text" value={inviteCode}
                                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                                placeholder="朋友的邀请码" maxLength={8} />
                        </div>
                        <p className="auth-disclaimer">
                            注册即代表您同意使用条款。体验用户每个账号可免费制作 1 个专属网址。<br />
                            若连续 180 天无人访问，免费网址将被自动回收以节约资源。
                        </p>
                        <button id="btn-register-submit" type="submit" className="btn btn--primary auth-submit" disabled={loading}>
                            {loading ? '注册中...' : '🎉 立即注册'}
                        </button>
                    </form>
                )}

                <p className="auth-footer-link" style={{ display: view === 'form' ? 'block' : 'none' }}>
                    <Link to="/gallery">← 先去挑选心仪款式，看完再注册</Link>
                </p>
            </div>
        </div>
    );
}
