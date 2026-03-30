import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Upgrade() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState(null);
    const [activeDuration, setActiveDuration] = useState(12); // Default to Annual for better conversion

    // Polling State
    const orderNoParam = searchParams.get('order_no');
    const [pollStatus, setPollStatus] = useState('Verifying payment status...');
    const [isSuccess, setIsSuccess] = useState(false);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

    useEffect(() => {
        if (orderNoParam) {
            // Polling Mode (Redirected from ZhifuFM)
            setLoading(false);
            const interval = setInterval(async () => {
                try {
                    const url = `${API_BASE}/api/payment/query?order_no=${orderNoParam}`;
                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.success) {
                        if (data.status === 'success') {
                            setPollStatus('支付成功！您的权益已为您极速发放完毕 🎉');
                            setIsSuccess(true);
                            clearInterval(interval);
                            toast.success('权益已到账！请刷新页面生效。');
                            setTimeout(() => navigate('/myspace'), 3000);
                        } else if (data.status === 'processing' || data.status === 'paid') {
                            setPollStatus('资金已到位，正为您注入超级魔力... ⚡');
                        } else if (data.status === 'pending') {
                            setPollStatus('正在等待支付网关确认，请稍候... 💸');
                        } else {
                            setPollStatus('支付好像出了点问题，如果已扣款请联系客服 😥');
                            clearInterval(interval);
                        }
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 2000);
            return () => clearInterval(interval);
        } else {
            // Normal Page Mode
            fetchPricing();
        }
    }, [orderNoParam]);

    const fetchPricing = async () => {
        try {
            const url = `${API_BASE}/api/payment/pricing?userId=${user?.id || ''}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setConfigs(data.data || []);
            }
        } catch (e) {
            toast.error('无法获取定价信息');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (config, payType = 'wechat') => {
        if (!user) {
            toast.error('请先登录');
            return navigate('/auth');
        }
        setPayingId(config.id);
        try {
            const url = `${API_BASE}/api/payment/create`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    configId: config.id, // Primary Identifier
                    tier: config.tier,
                    duration_months: config.duration_months,
                    payType
                })
            });
            const data = await res.json();
            if (data.success && data.payUrl) {
                window.open(data.payUrl, '_blank');
                toast.success('由于合规要求，请在新打开的页面完成支付。');
            } else {
                toast.error(data.error || '创建订单失败');
            }
        } catch (e) {
            toast.error('网络请求失败');
        } finally {
            setPayingId(null);
        }
    };

    if (loading) return (
        <div className="w-full min-h-screen pt-[100px] flex justify-center items-center bg-surface cosmic-gradient">
            <div className="spinner w-10 h-10 border-4 border-outline-variant/30 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    // --- View Logic ---
    if (orderNoParam) {
        return (
            <div className="w-full min-h-screen pt-[120px] pb-20 bg-surface cosmic-gradient text-on-surface font-body px-5">
                <div className="max-w-xl mx-auto glass-card bg-surface-container-low/30 backdrop-blur-xl border border-outline-variant/20 p-10 rounded-[2rem] text-center shadow-2xl">
                    <div className="text-6xl mb-6">{isSuccess ? '✅' : '⏳'}</div>
                    <h2 className="font-headline text-2xl font-medium mb-4">订单状态追踪</h2>
                    <div className="text-on-surface-variant text-lg mb-8 leading-relaxed">
                        {pollStatus}
                    </div>
                    {!isSuccess && <div className="spinner w-8 h-8 border-4 border-outline-variant/30 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>}
                    {isSuccess && (
                        <button
                            onClick={() => navigate('/myspace')}
                            className="bg-primary text-on-primary px-8 py-3 rounded-xl font-medium transition-transform hover:-translate-y-1 shadow-[0_10px_20px_rgba(224,142,254,0.2)] mt-4"
                        >
                            返回个人中心
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Filter Logic for dynamic package list
    const filteredConfigs = configs
        .filter(c => c.duration_months === activeDuration && c.tier !== 'lifetime')
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const lifetimeConfigs = configs.filter(c => c.tier === 'lifetime' || c.duration_months === 0);

    return (
        <div className="w-full min-h-[100dvh] pt-[100px] md:pt-[120px] pb-10 bg-surface cosmic-gradient text-on-surface font-body relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[100px] bg-primary/10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] bg-secondary/10 pointer-events-none"></div>

            <div className="max-w-[1100px] mx-auto px-5 relative z-10">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-block px-6 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-6 backdrop-blur-md shadow-[0_4px_15px_rgba(224,142,254,0.1)]">
                        ✨ 开启您的专属浪漫空间
                    </div>
                    <h1 className="font-headline text-4xl md:text-5xl font-light tracking-tight mb-6 leading-tight text-on-surface">
                        选择最适合您的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-medium">特权等级</span>
                    </h1>
                </div>

                {/* Duration Toggle (Fixed Grid) */}
                <div className="flex justify-center mb-16">
                    <div className="bg-surface-container-low/40 backdrop-blur-xl border border-outline-variant/10 p-1.5 rounded-2xl grid grid-cols-2 shadow-lg relative min-w-[300px]">
                        <button
                            onClick={() => setActiveDuration(1)}
                            className={`relative z-10 px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeDuration === 1 ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            按月计费
                        </button>
                        <button
                            onClick={() => setActiveDuration(12)}
                            className={`relative z-10 px-8 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${activeDuration === 12 ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            按年预览 <span className="ml-1 text-[10px] opacity-80 bg-primary/20 px-1.5 py-0.5 rounded-full border border-primary/10">立省20%</span>
                        </button>
                        <div 
                            className="absolute top-1.5 h-[calc(100%-12px)] w-[calc(50%-6px)] bg-gradient-to-r from-primary to-secondary rounded-xl transition-all duration-500 ease-out shadow-lg"
                            style={{ 
                                left: '6px',
                                transform: activeDuration === 1 ? 'translateX(0)' : 'translateX(100%)' 
                            }}
                        ></div>
                    </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch mb-20">
                    <PricingCard
                        title="体验用户"
                        price={0}
                        tier="free"
                        subtitle="基础功能 · 永久免费"
                        features={[
                            { text: '精选免费模板库', active: true },
                            { text: '1 个专属域名配额', active: true },
                            { text: '标准 CDN 加载速度', active: true },
                            { text: '移除底部版权标识', active: false },
                            { text: '绑定顶级域名', active: false },
                        ]}
                        buttonText="免费开始制作"
                        onAction={() => navigate('/builder')}
                    />

                    {filteredConfigs.map(c => (
                        <PricingCard
                            key={c.id}
                            title={c.display_name || (c.tier === 'pro' ? "高级会员 Pro" : "进阶空间 Partner")}
                            price={c.is_renewal ? (c.renewal_price || c.base_price) : (c.is_returning ? (c.base_price) : (c.first_month_price || c.base_price))}
                            originalPrice={c.base_price}
                            tier={c.tier}
                            subtitle={`全项权益 · ${c.duration_months}个月有效期`}
                            discountLabel={c.discount_label}
                            isPopular={c.tier === 'pro'}
                            features={c.features || [
                                { text: '100% 模板库自由切换', active: true },
                                { text: `${c.tier === 'pro' ? '3' : '15'} 个专属域名配额`, active: true },
                                { text: '动态粒子特效背景自由定制', active: true },
                                { text: '顶级域名映射绑定', active: c.tier === 'partner' },
                            ]}
                            buttonText={payingId === c.id ? "正在调起..." : (c.is_renewal ? "立即续费" : "开启特权")}
                            onAction={() => handleCheckout(c)}
                            isPaying={payingId === c.id}
                        />
                    ))}

                    {lifetimeConfigs.map(c => (
                        <PricingCard
                            key={c.id}
                            title={c.display_name || "终身合伙人"}
                            price={c.is_renewal ? (c.renewal_price || c.base_price) : (c.is_returning ? (c.base_price) : (c.first_month_price || c.base_price))}
                            originalPrice={c.base_price}
                            tier={c.tier}
                            subtitle={`尊贵特权 · 永久生效`}
                            discountLabel={c.discount_label || "限时终身价"}
                            features={c.features || [
                                { text: '100% 模板库自由切换', active: true },
                                { text: '30+ 个专属域名配额', active: true },
                                { text: '支持绑定个人顶级域名', active: true },
                                { text: '优先体验内测新功能', active: true },
                                { text: '专属 VIP 极速响应服务', active: true },
                            ]}
                            buttonText={payingId === c.id ? "正在调起..." : (c.is_renewal ? "立即续费" : "开启特权")}
                            onAction={() => handleCheckout(c)}
                            isPaying={payingId === c.id}
                        />
                    ))}
                </div>

                {/* Comparison Table */}
                <div className="mb-24">
                    <h2 className="font-headline text-2xl text-center mb-10">功能权益深度对比</h2>
                    <div className="glass-card bg-surface-container-low/20 backdrop-blur-xl border border-outline-variant/10 rounded-[2rem] overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low/40">
                                    <th className="p-6 text-sm font-medium text-on-surface-variant">特权项</th>
                                    <th className="p-6 text-sm font-medium text-center">免费版</th>
                                    <th className="p-6 text-sm font-medium text-center text-primary">Pro 版</th>
                                    <th className="p-6 text-sm font-medium text-center text-secondary">合伙人版</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm font-light">
                                {[
                                    { name: '域名/项目配额', free: '1 个', pro: '3 个', partner: '15 个' },
                                    { name: '模板使用范围', free: '基础免费模板', pro: '全场模板通用', partner: '全场模板通用' },
                                    { name: '每日修改上限', free: '3 次/日', pro: '10 次/日', partner: '100+ 次/日' },
                                    { name: '专属二级域名', free: '✓', pro: '✓', partner: '✓' },
                                    { name: '自定义顶级域名', free: '✕', pro: '✕', partner: '✓ (提供解析指导)' },
                                    { name: '移除底部版权', free: '✕', pro: '✓', partner: '✓' },
                                    { name: '新功能优先体验', free: '✕', pro: '✕', partner: '✓' },
                                ].map((row, i) => (
                                    <tr key={i} className="border-t border-outline-variant/5 hover:bg-surface-container-low/30 transition-colors">
                                        <td className="p-5 font-medium text-on-surface-variant">{row.name}</td>
                                        <td className="p-5 text-center">{row.free}</td>
                                        <td className="p-5 text-center font-medium text-primary/80">{row.pro}</td>
                                        <td className="p-5 text-center font-medium text-secondary/80">{row.partner}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* FAQ */}
                <div className="pt-12 border-t border-outline-variant/10 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div>
                            <h4 className="font-headline text-xl font-medium mb-6">常见问题解答</h4>
                            <div className="space-y-6">
                                <div>
                                    <div className="font-medium text-on-surface mb-2">Q: 升级后原来的项目会丢失吗？</div>
                                    <div className="text-sm text-on-surface-variant font-light leading-relaxed">绝对不会。升级只会增加您的创作上限并解锁新功能，原有内容将完美保留并支持直接升级至高级模板。</div>
                                </div>
                                <div>
                                    <div className="font-medium text-on-surface mb-2">Q: 支持哪些支付方式？</div>
                                    <div className="text-sm text-on-surface-variant font-light leading-relaxed">目前全面支持微信支付。支付过程受商户网关加密保护，确保您的资金安全。</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-headline text-xl font-medium mb-6">VIP 专属服务</h4>
                            <div className="glass-card bg-surface-container-low/20 backdrop-blur-md border border-outline-variant/10 p-6 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/10 transition-colors"></div>
                                <p className="text-sm text-on-surface-variant font-light mb-4 leading-relaxed relative z-10">
                                    遇到支付问题、权益未即时到账或有定制化需求？请随时联系我们的快速响应客服：
                                </p>
                                <div className="text-base font-medium text-primary mb-1 relative z-10">
                                    微信号: <span className="underline decoration-primary/30 underline-offset-4">MoodSpaceSupport</span>
                                </div>
                                <div className="text-xs text-outline relative z-10">
                                    (服务时间: 10:00 - 22:00)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center text-outline text-xs mt-8 opacity-60">
                    © 2026 RomanceSpace · 让浪漫不再有边界
                </div>
            </div>
        </div>
    );
}



// Sub-component for individual pricing card
function PricingCard({ title, price, originalPrice, tier, subtitle, discountLabel, isPopular, features, buttonText, onAction, isPaying }) {
    const isPro = tier === 'pro';
    const isPartner = tier === 'partner' || tier === 'lifetime';

    const gradientFrom = isPro ? 'from-primary' : (isPartner ? 'from-secondary' : 'from-surface-variant');
    const gradientTo = isPro ? 'to-primary-container' : (isPartner ? 'to-secondary-container' : 'to-surface-container-high');
    const accentColor = isPro ? 'var(--primary)' : (isPartner ? 'var(--secondary)' : 'var(--outline)');

    return (
        <div className={`glass-card flex flex-col relative bg-surface-container-low/30 backdrop-blur-xl rounded-[2.5rem] p-8 lg:p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl border ${isPopular ? 'border-primary/40 ring-1 ring-primary/20 shadow-[0_0_30px_rgba(224,142,254,0.1)]' : 'border-outline-variant/20'
            }`}>
            {discountLabel && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className={`text-white px-5 py-1.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap bg-gradient-to-r ${gradientFrom} ${gradientTo}`}>
                        🔥 {discountLabel}
                    </div>
                </div>
            )}

            <div className="text-center mb-8">
                <h2 className="font-headline text-2xl font-medium mb-2">{title}</h2>
                <p className="text-on-surface-variant text-sm font-light">{subtitle}</p>
            </div>

            <div className="text-center py-8 border-y border-outline-variant/10 mb-8 flex flex-col items-center justify-center min-h-[180px]">
                {/* Fixed height placeholder for original price to maintain alignment */}
                <div className="h-7 mb-1">
                    {originalPrice > price && (
                        <div className="line-through text-outline text-lg opacity-50">
                            ¥ {(originalPrice / 100).toFixed(2)}
                        </div>
                    )}
                </div>
                
                <div className="text-5xl lg:text-7xl font-headline font-light tracking-tight mb-4 flex justify-center items-start text-on-surface leading-none">
                    <span className="text-xl lg:text-2xl mt-2 mr-1">¥</span>
                    {(price / 100).toFixed(2)}
                </div>

                <div className="inline-block px-4 py-1.5 rounded-lg bg-surface-container border border-outline-variant/10 text-on-surface-variant text-[10px] font-medium tracking-wider uppercase">
                    {price === 0 ? '无需支付，立即开始' : '安全加密支付 · 权益秒到'}
                </div>
            </div>

            <div className="flex-1 mb-10">
                <ul className="space-y-4">
                    {features.map((item, i) => (
                        <li key={i} className={`flex items-start gap-3 ${item.active ? '' : 'opacity-30'}`}>
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] mt-0.5 ${item.active ? 'text-white' : 'bg-surface-container-highest/50 text-outline'}`}
                                style={{ backgroundColor: item.active ? accentColor : undefined }}>
                                {item.active ? '✓' : '✕'}
                            </span>
                            <span className={`text-sm font-light ${!item.active && 'line-through'}`}>{item.text}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <button
                disabled={isPaying}
                onClick={onAction}
                className={`w-full py-4 rounded-2xl font-medium text-white transition-all duration-300 shadow-xl hover:-translate-y-1 bg-gradient-to-br ${gradientFrom} ${gradientTo} disabled:opacity-70 disabled:cursor-not-allowed`}
            >
                {buttonText}
            </button>
        </div>
    );
}
