import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';

/**
 * /auth/callback
 *
 * Supabase redirects here after:
 *   1. Email verification (type=signup)
 *   2. Password reset (type=recovery)
 *
 * For recovery, we show an inline "Set New Password" form.
 * For signup, we show an activation success message.
 */
export default function AuthCallback() {
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'recovery' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // Password reset state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetDone, setResetDone] = useState(false);

    useEffect(() => {
        async function handleCallback() {
            try {
                // Supabase JS automatically picks up the code from the URL
                const { error } = await supabase.auth.getSession();
                if (error) throw error;

                // If there's a `code` param (PKCE), exchange it explicitly
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                if (code) {
                    const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeErr) throw exchangeErr;
                }

                // After exchange, check the session type via onAuthStateChange
                // The event will be PASSWORD_RECOVERY for reset links
                const { data: { session } } = await supabase.auth.getSession();

                // Check URL hash for type (implicit flow) or rely on the recovery session
                const hash = window.location.hash;
                const hashParams = new URLSearchParams(hash.replace('#', ''));
                const type = hashParams.get('type') || params.get('type');

                if (type === 'recovery' || (session && session.user)) {
                    // If there's an active session after a code exchange and type is recovery
                    // We need to check if this came from a password reset
                    if (type === 'recovery') {
                        setStatus('recovery');
                    } else {
                        setStatus('success');
                    }
                } else {
                    setStatus('success');
                }
            } catch (err) {
                console.error('[AuthCallback]', err);
                setErrorMsg(err.message ?? '验证失败，链接可能已过期。');
                setStatus('error');
            }
        }

        // Also listen for the PASSWORD_RECOVERY event from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setStatus('recovery');
            }
        });

        handleCallback();

        return () => subscription.unsubscribe();
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
            alert('密码更新失败：' + error.message);
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
                                    to="/my-space"
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
                                    <input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="至少 8 位"
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirm-password">确认新密码</label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="再次输入新密码"
                                        minLength={8}
                                        required
                                    />
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
