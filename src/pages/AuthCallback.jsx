import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

const translateError = (msg) => {
    if (!msg) return '发生未知错误，请重试';
    if (msg.includes('expired') || msg.includes('invalid')) return '验证链接可能已经失效或被使用过了，请重新获取哦';
    if (msg.includes('rate limit')) return '操作太频繁啦，请稍等一会儿再试';
    if (msg.includes('Password should be at least')) return '密码太短啦，至少需要 8 个字符哦';
    if (msg.includes('same as the old one')) return '新密码不能和旧密码一样哦';
    return msg;
};

export default function AuthCallback() {
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'recovery' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // Password reset state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetDone, setResetDone] = useState(false);

    // Capture URL immediately on mount to prevent Supabase from clearing it before we check
    const initialUrlHash = useRef(window.location.hash);
    const initialUrlSearch = useRef(window.location.search);

    useEffect(() => {
        let isMounted = true;

        async function handleCallback() {
            try {
                // Determine the intention from the URL *before* Supabase touches it
                const hashParams = new URLSearchParams(initialUrlHash.current.replace('#', ''));
                const searchParams = new URLSearchParams(initialUrlSearch.current);
                
                // On mobile clients like QQ Browser, 'type' might be in search rather than hash
                const isRecovery = hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';

                // We still need to let Supabase process the code/token
                const code = searchParams.get('code');
                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                } else {
                    // Implicit flow handling fallback
                    const { error } = await supabase.auth.getSession();
                    if (error) throw error;
                }

                if (!isMounted) return;

                if (isRecovery) {
                    setStatus('recovery');
                } else {
                    // Give priority to PASSWORD_RECOVERY event which might have just fired
                    setStatus(prev => prev === 'recovery' ? 'recovery' : 'success');
                }
            } catch (err) {
                console.error('[AuthCallback]', err);
                if (!isMounted) return;
                setErrorMsg(translateError(err.message) ?? '验证失败，链接可能已过期。');
                setStatus('error');
            }
        }

        // Also listen for the EVENT because sometimes the URL doesn't have type=recovery
        // but Supabase knows it's a recovery flow from the JWT
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setStatus('recovery');
            } else if (event === 'SIGNED_IN') {
                setStatus(prev => prev === 'recovery' ? 'recovery' : 'success');
            }
        });

        handleCallback();

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function handlePasswordReset(e) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致，请重新输入。');
            return;
        }
        if (newPassword.length < 8) {
            alert('密码至少需要 8 位。');
            return;
        }
        setResetLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            alert('密码更新失败：' + translateError(error.message));
        } else {
            setResetDone(true);
        }
        setResetLoading(false);
    }

    return (
        <div className="page container" style={{ maxWidth: 480 }}>
            <div className="auth-card" style={{ textAlign: 'center' }}>
                {status === 'loading' && (
                    <>
                        <div className="spinner" style={{ margin: '2rem auto' }} />
                        <p style={{ color: '#888' }}>正在验证中，请稍候…</p>
                    </>
                )}

                {/* ── Email Verification Success ── */}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                        <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>邮箱验证成功！</h1>
                        <p style={{ color: '#555', lineHeight: 1.7, marginTop: '0.8rem' }}>
                            您的账号已激活。
                        </p>
                        <div className="alert" style={{
                            background: '#fff8e1',
                            border: '1px solid #ffd54f',
                            borderRadius: '12px',
                            padding: '1rem 1.2rem',
                            marginTop: '1.5rem',
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            lineHeight: 1.8,
                            color: '#555'
                        }}>
                            📱 <strong>如果您是在手机上打开此链接：</strong><br />
                            请返回电脑浏览器，使用您注册时的<strong>邮箱和密码登录</strong>即可开始使用。
                        </div>
                        <Link
                            to="/auth"
                            className="btn btn--primary auth-submit"
                            style={{ marginTop: '1.5rem', display: 'block', textDecoration: 'none', textAlign: 'center' }}
                        >
                            🔑 前往登录
                        </Link>
                    </>
                )}

                {/* ── Password Recovery Form ── */}
                {status === 'recovery' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔐</div>
                        <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>设置新密码</h1>

                        {resetDone ? (
                            <>
                                <div className="alert alert--success" style={{ marginTop: '1.5rem' }}>
                                    ✅ 密码已成功更新！
                                </div>
                                <Link
                                    to="/myspace"
                                    className="btn btn--primary auth-submit"
                                    style={{ marginTop: '1.5rem', display: 'block', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    前往我的空间 →
                                </Link>
                            </>
                        ) : (
                            <form onSubmit={handlePasswordReset} id="form-reset-password" style={{ textAlign: 'left', marginTop: '1.5rem' }}>
                                <div className="form-group">
                                    <label htmlFor="new-password">新密码</label>
                                    <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                                        <input
                                            id="new-password"
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="至少 8 位"
                                            minLength={8}
                                            required
                                            style={{ width: '100%', paddingRight: '2.5rem' }}
                                        />
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
                                    <label htmlFor="confirm-password">确认新密码</label>
                                    <div className="password-input-wrapper" style={{ position: 'relative', display: 'flex' }}>
                                        <input
                                            id="confirm-password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="再次输入新密码"
                                            minLength={8}
                                            required
                                            style={{ width: '100%', paddingRight: '2.5rem' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{
                                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#888'
                                            }}
                                        >
                                            {showConfirmPassword 
                                                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                            }
                                        </button>
                                    </div>
                                </div>
                                <button
                                    id="btn-reset-password"
                                    type="submit"
                                    className="btn btn--primary auth-submit"
                                    disabled={resetLoading}
                                >
                                    {resetLoading ? '更新中...' : '✅ 确认设置新密码'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                        <h1 className="auth-title" style={{ fontSize: '1.4rem' }}>验证失败</h1>
                        <div className="alert alert--error" style={{ marginTop: '1rem' }}>
                            {errorMsg}
                        </div>
                        <p style={{ color: '#888', marginTop: '1rem', fontSize: '0.9rem' }}>
                            验证链接可能已过期（有效期 24 小时）或已被使用。<br />
                            请返回注册页面重发验证邮件。
                        </p>
                        <Link
                            to="/auth"
                            className="btn btn--outline auth-submit"
                            style={{ marginTop: '1.5rem', display: 'block', textDecoration: 'none', textAlign: 'center' }}
                        >
                            ← 返回注册 / 登录
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
