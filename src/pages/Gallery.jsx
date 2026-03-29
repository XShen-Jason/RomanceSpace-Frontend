import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { listTemplates } from '../api/client.js';
import { INTENT_DATA } from '../data/intents.js';
import PosterModal from '../components/PosterModal.jsx';

export default function Gallery() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Read intent/category from Router state or default to 'all'
    const initialCategory = location.state?.intent || 'all';
    const initialOption = location.state?.sceneText || 'all';
    
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [activeOption, setActiveOption] = useState(initialOption);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [posterTemplate, setPosterTemplate] = useState(null);

    // Fetch and enrich templates
    useEffect(() => {
        listTemplates()
            .then((d) => {
                const apiTemplates = d.templates ?? [];
                // Flatten intent metadata for fast lookup
                const metaMap = {};
                Object.values(INTENT_DATA).forEach(intent => {
                    intent.templates.forEach(t => metaMap[t.id] = t);
                });
                
                const enriched = apiTemplates.map(t => {
                    const meta = metaMap[t.name] || {};
                    return { 
                        ...t, 
                        desc: meta.desc, 
                        icon: meta.icon || 'web', 
                        color: meta.color || 'primary' 
                    };
                });
                setTemplates(enriched);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    // Filter templates based on active category and option
    const filteredTemplates = useMemo(() => {
        if (activeCategory === 'all') return templates;
        
        const intentConfig = INTENT_DATA[activeCategory];
        if (!intentConfig) return templates;

        const categoryTemplates = templates.filter(t => {
            // Check if categories array exists (new format) or name matches old format
            const cats = t.categories || [];
            return cats.includes(activeCategory);
        });

        if (activeOption === 'all' || activeOption === '探索全部') return categoryTemplates;

        // Filter by specific Scene ID
        return categoryTemplates.filter(t => {
            // Check if template matches the active option's ID or text (for compatibility)
            return t.scene === activeOption || (t.tags && t.tags.includes(activeOption));
        });
    }, [templates, activeCategory, activeOption]);

    return (
        <div className="w-full min-h-screen pt-20 pb-24 px-5 md:px-12 max-w-[1600px] mx-auto flex flex-col font-body text-on-surface relative">
            {/* Background Base */}
            <div className="fixed inset-0 z-[-1] pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, #1e1a41 0%, #0d0a27 100%)' }}></div>
            
            {/* Ambient Background Lights */}
            <div className="fixed top-1/4 -right-24 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
            <div className="fixed bottom-1/4 -left-24 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[80px] pointer-events-none z-0"></div>

            {/* Floating Filter Header (Sticky) */}
            <div className="sticky top-16 md:top-20 z-30 -mx-5 md:-mx-12 px-5 md:px-12 py-3 md:py-5 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/10 mb-8 shadow-sm">
                <div className="max-w-[1600px] mx-auto">
                    
                    {/* --- MOBILE FILTER TRIGGER (< md) --- */}
                    <div className="flex items-center justify-between md:hidden">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-0.5">当前筛选</span>
                            <span className="text-sm font-medium text-primary flex items-center gap-1">
                                {activeCategory === 'all' ? '全部模板' : INTENT_DATA[activeCategory].categoryLabel}
                                {activeCategory !== 'all' && activeOption !== 'all' && (
                                    <>
                                        <span className="text-on-surface-variant/50">/</span>
                                        <span className="text-secondary-dim">
                                            {INTENT_DATA[activeCategory].options.find(o => o.id === activeOption)?.text || activeOption}
                                        </span>
                                    </>
                                )}
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsMobileFilterOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-primary/20 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">tune</span>
                            <span className="text-sm font-medium">筛选</span>
                        </button>
                    </div>

                    {/* --- DESKTOP FILTER (>= md) --- */}
                    <div className="hidden md:block space-y-4 md:space-y-5">
                        {/* Level 1: Categories (Emotions) */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 pb-1">
                            <button 
                                onClick={() => { setActiveCategory('all'); setActiveOption('all'); }}
                                className={`flex items-center gap-2 px-5 py-2 xl:px-6 xl:py-2.5 rounded-full transition-all duration-300 font-medium border shadow-sm flex-shrink-0 ${activeCategory === 'all' ? 'bg-primary/20 text-primary-fixed border-primary/40 shadow-primary/10' : 'text-on-surface-variant hover:bg-surface-container-high border-outline-variant/10 bg-surface-container-lowest'}`}
                            >
                                <span className="material-symbols-outlined text-lg">grid_view</span>
                                <span className="text-sm">全部模板</span>
                            </button>
                            {Object.entries(INTENT_DATA).map(([key, data]) => (
                                <button 
                                    key={key}
                                    onClick={() => { setActiveCategory(key); setActiveOption('all'); }}
                                    className={`flex items-center gap-2 px-5 py-2 xl:px-6 xl:py-2.5 rounded-full transition-all duration-300 font-medium border shadow-sm flex-shrink-0 ${activeCategory === key ? 'bg-primary/20 text-primary-fixed border-primary/40 shadow-primary/10' : 'text-on-surface-variant hover:bg-surface-container-high border-outline-variant/10 bg-surface-container-lowest'}`}
                                >
                                    <span className="material-symbols-outlined text-lg">{data.icon}</span>
                                    <span className="text-sm">{data.categoryLabel}</span>
                                </button>
                            ))}
                        </div>

                        {/* Level 2: Scenarios (Intents) - Only show if a specific category is active */}
                        {activeCategory !== 'all' && (
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 animate-in fade-in slide-in-from-top-2 duration-300 pb-1">
                                <div className="flex items-center shrink-0 mb-0 text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-bold ml-2 mr-2">
                                    <span className="material-symbols-outlined text-sm mr-1">subtitles</span>
                                    细分场景
                                </div>
                                <button 
                                    onClick={() => setActiveOption('all')}
                                    className={`px-5 py-2 rounded-full text-xs font-medium transition-all border flex-shrink-0 ${activeOption === 'all' ? 'bg-secondary/20 text-secondary-dim border-secondary/40 shadow-sm' : 'bg-surface-container-low text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-high'}`}
                                >
                                    探索全部
                                </button>
                                {INTENT_DATA[activeCategory].options.map((opt, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setActiveOption(opt.id)}
                                        className={`px-5 py-2 rounded-full text-xs font-medium transition-all border flex-shrink-0 ${activeOption === opt.id ? 'bg-secondary/20 text-secondary-dim border-secondary/40 shadow-sm' : 'bg-surface-container-low text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-high'}`}
                                    >
                                        {opt.text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="flex-1 min-w-0 flex flex-col relative z-10">
                {/* Context Header (Simplified) */}
                <header className="mb-4 relative z-10 w-full">
                    <h1 className="text-3xl md:text-5xl font-headline font-light text-on-surface tracking-tight leading-tight">
                        {activeCategory === 'all' ? '发现更多表达心意的方式' : INTENT_DATA[activeCategory].title}
                    </h1>
                </header>

                <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/10">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl md:text-2xl font-headline font-medium text-on-surface">
                            {activeCategory === 'all' ? '为你推荐' : INTENT_DATA[activeCategory].categoryLabel}
                        </h3>
                        {activeOption !== 'all' && (
                            <p className="text-sm text-secondary-dim font-light tracking-wide italic">
                                “{INTENT_DATA[activeCategory].options.find(o => o.id === activeOption)?.text || activeOption}”
                            </p>
                        )}
                    </div>
                    <span className="text-sm font-medium text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/10">
                        {filteredTemplates.length} 个模板
                    </span>
                </div>
                    
                    {loading && (
                        <div className="flex justify-center items-center py-24">
                            <span className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
                        </div>
                    )}
                    
                    {error && (
                        <div className="bg-error-container/20 border border-error-dim/40 text-error-dim p-6 rounded-2xl">
                            <span className="material-symbols-outlined block text-4xl mb-2">error</span>
                            抱歉，加载模板时出现错误。请稍后刷新重试哦。<br/> ({error})
                        </div>
                    )}

                    {!loading && !error && filteredTemplates.length === 0 && (
                        <div className="glass-card rounded-2xl p-12 text-center border overflow-hidden relative border-outline-variant/10 bg-surface-container-low/40">
                             <span className="material-symbols-outlined text-6xl text-primary/20 mb-4 inline-block">inbox</span>
                             <h4 className="text-xl font-headline text-on-surface mb-2">哎呀，这里好像空空如也</h4>
                             <p className="text-on-surface-variant">
                                暂时没有找到这个分类下的网页模板。<br/>你可以前往“全部模板”看看其他的浪漫选择。
                             </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8 content-start mb-12">
                        {filteredTemplates.map((template, idx) => {
                            const isRecommended = idx < 2 && activeCategory !== 'all' && activeOption === 'all';
                            const isPro = template.tier === 'pro';

                            return (
                                <div 
                                    key={template.name}
                                    className="glass-card group p-5 xl:p-8 rounded-2xl transition-all duration-500 hover:bg-surface-container-highest hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:border-primary/30 flex flex-col h-full relative overflow-hidden bg-surface-container-low border border-outline-variant/10 active:scale-[0.98]"
                                >
                                    {isRecommended && (
                                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-primary to-primary-container text-on-primary text-[10px] font-bold tracking-widest uppercase rounded-bl-xl shadow-md z-10">
                                            核心推荐
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between mb-3 z-10 relative">
                                        <h4 className="text-xl lg:text-2xl font-headline text-on-surface font-medium pr-4">{template.title || template.name}</h4>
                                        <div className="flex shrink-0 items-center">
                                            {isPro ? (
                                                <span className="bg-secondary/10 text-secondary-dim text-[11px] px-2.5 py-1 rounded-md font-bold tracking-wider uppercase border border-secondary/20">PRO</span>
                                            ) : (
                                                <span className="bg-emerald-500/10 text-emerald-400 text-[11px] px-2.5 py-1 rounded-md font-bold tracking-wider uppercase border border-emerald-500/20">FREE</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm lg:text-base mb-6 line-clamp-2 leading-relaxed flex-1 z-10 relative">
                                        {template.desc || '精美的响应式网页模板，为你的表达增添专属色彩。'}
                                    </p>
                                    
                                    {!template.static && (
                                        <div className="bg-surface-container-lowest/40 p-4 xl:p-5 rounded-xl mb-6 border border-outline-variant/5 shadow-inner z-10 relative group-hover:bg-surface-container-highest/60 transition-colors">
                                            <p className="text-xs lg:text-sm text-on-surface/70 italic font-light line-clamp-2">
                                                “包含 {(template.fields || []).length} 个专属配置项，一键生成浪漫宇宙...”
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-5 flex flex-wrap gap-4 items-center justify-between border-t border-outline-variant/10 z-10 relative">
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <button 
                                                onClick={() => navigate(`/builder/${template.name}`, { state: { ...location.state, from: 'gallery' } })}
                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary-fixed transition-colors text-sm font-semibold group-hover:text-white"
                                            >
                                                制作同款
                                            </button>
                                            <a 
                                                href={`/preview/${template.name}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 rounded-xl border border-outline-variant/20 hover:bg-surface-variant text-on-surface-variant transition-colors text-sm font-medium"
                                                title="新标签页预览"
                                            >
                                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                            </a>
                                            <button
                                                onClick={() => {
                                                    const url = `https://www.moodspace.xyz/preview/${template.name}`;
                                                    const title = template.title || template.name;
                                                    setPosterTemplate({ url, title, rawHtml: '' });
                                                    
                                                    // Fetch raw HTML of the template for the poster preview
                                                    fetch(`https://www.moodspace.xyz/assets/${template.name}/index.html`)
                                                        .then(res => res.text())
                                                        .then(html => setPosterTemplate(prev => prev && prev.url === url ? { ...prev, rawHtml: html } : prev))
                                                        .catch(err => console.error('Failed to fetch template HTML', err));
                                                }}
                                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 rounded-xl border border-outline-variant/20 hover:bg-surface-variant text-on-surface-variant transition-colors text-sm font-medium"
                                                title="分享海报"
                                            >
                                                <span className="material-symbols-outlined text-sm">image</span>
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                        </div>
                                    </div>
                                    
                                    {/* Card Hover Glow */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                                </div>
                            );
                        })}
                    </div>
            </main>

            {/* --- MOBILE FILTER DRAWER (< md) --- */}
            <div className={`fixed inset-0 z-[110] md:hidden transition-opacity duration-300 ${isMobileFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)}></div>
                
                {/* Bottom Sheet */}
                <div className={`absolute bottom-0 left-0 right-0 bg-surface-container border-t border-outline-variant/20 rounded-t-[2rem] p-6 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.2,1)] ${isMobileFilterOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-6"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-headline font-medium text-on-surface">筛选模板</h3>
                        <button onClick={() => setIsMobileFilterOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant active:scale-95 transition-transform">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>

                    <div className="overflow-y-auto max-h-[60vh] custom-scrollbar pb-8">
                        {/* Mobile Level 1 */}
                        <div className="mb-8">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center">
                                <span className="material-symbols-outlined text-sm mr-1">mood</span>
                                情绪分类
                            </h4>
                            <div className="flex flex-wrap gap-2.5">
                                <button 
                                    onClick={() => { setActiveCategory('all'); setActiveOption('all'); }}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all font-medium border text-sm ${activeCategory === 'all' ? 'bg-primary/20 text-primary-fixed border-primary/40' : 'text-on-surface-variant hover:bg-surface-container-high border-outline-variant/10 bg-surface-container-low'}`}
                                >
                                    <span className="material-symbols-outlined text-sm">grid_view</span>
                                    全部
                                </button>
                                {Object.entries(INTENT_DATA).map(([key, data]) => (
                                    <button 
                                        key={key}
                                        onClick={() => { setActiveCategory(key); setActiveOption('all'); }}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all font-medium border text-sm ${activeCategory === key ? 'bg-primary/20 text-primary-fixed border-primary/40' : 'text-on-surface-variant hover:bg-surface-container-high border-outline-variant/10 bg-surface-container-low'}`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{data.icon}</span>
                                        {data.categoryLabel}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Level 2 */}
                        {activeCategory !== 'all' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center">
                                    <span className="material-symbols-outlined text-sm mr-1">subtitles</span>
                                    细分场景
                                </h4>
                                <div className="flex flex-wrap gap-2.5">
                                    <button 
                                        onClick={() => { setActiveOption('all'); setIsMobileFilterOpen(false); }}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeOption === 'all' ? 'bg-secondary/20 text-secondary-dim border-secondary/40' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/10'}`}
                                    >
                                        探索全部
                                    </button>
                                    {INTENT_DATA[activeCategory].options.map((opt, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => { setActiveOption(opt.id); setIsMobileFilterOpen(false); }}
                                            className={`px-4 py-2 mb-1 rounded-xl text-sm font-medium transition-all border text-left ${activeOption === opt.id ? 'bg-secondary/20 text-secondary-dim border-secondary/40' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/10'}`}
                                        >
                                            {opt.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            

            <PosterModal
                isOpen={!!posterTemplate}
                onClose={() => setPosterTemplate(null)}
                projectUrl={posterTemplate?.url}
                title="模板预览"
                templateTitle={posterTemplate?.title}
                rawHtml={posterTemplate?.rawHtml}
            />
        </div>
    );
}
