import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { listTemplates, renderProject, getConfigBySubdomain, getUserStatus, checkDomainAvailability, supabase } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import PosterModal from '../components/PosterModal.jsx';

const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'moodspace.xyz';

const FIELD_LABELS = {
    title: '网页标题',
    sender: '发送人 (你)',
    receiver: '接收人 (TA)',
    paragraphs: '浪漫留言'
};

const DEFAULT_VALUES = {
    title: '致我最爱的人',
    sender: '小明',
    receiver: '小红',
    paragraphs: '在这个特别的日子里，\n我想对你说，\n遇见你是我这辈子最幸运的事。'
};

const TEMPLATE_NAME_MAP = {
    starry_confession: '星空告白',
    love_letter: '情书时代',
    neon_heart: '霓虹心跳',
    rainy_apology: '雨夜低语',
    warm_light: '微光倾听',
    broken_glass: '时光拼图',
    golden_memories: '流金岁月',
    celebration_fireworks: '花火灿烂',
    polaroid_wall: '拍立得影集',
    vintage_film: '复古胶卷',
    breeze_diary: '微风手账',
    constellation_map: '星轨连线',
    minimal_white: '极简白纸',
    lofi_room: 'Lofi 房间',
    sunset_glow: '落日余晖'
};

/** 模板属性里的 {{}} 替换时转义，避免 URL 中的 &、" 等破坏 HTML 或导致图片无法加载 */
function escapeHtmlAttr(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;');
}

/** 照片 / 图床 URL 类字段：提供本地上传，减轻用户找链接的成本 */
function isImageUrlField(f) {
    const key = typeof f === 'string' ? f : (f.id || f.key || '');
    const label = typeof f === 'string' ? (FIELD_LABELS[f] || f || '') : (f.label || f.id || f.key || '');
    const type = typeof f === 'object' && f != null ? (f.type || '') : '';
    const lk = String(label).toLowerCase();
    const kk = String(key).toLowerCase();
    if (type === 'image' || type === 'imageurl' || type === 'image_url') return true;
    if (/(照片|图片|封面|配图|photo|image|img|picture|avatar|头像|胶片)/i.test(label) && /(url|链接|地址|link)/i.test(label)) return true;
    if (/photo|picture|image|img|cover|avatar|thumb|film/.test(kk) && /url|src|link|uri/.test(kk)) return true;
    return false;
}

const MAX_BUILDER_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BUILDER_IMAGE_DATA_URL_LEN = 650000;

/** 全模板通用配色预设（按顺序写入本页检测到的「颜色类」字段） */
const MOODSPACE_COLOR_PRESETS = [
    { id: 'fresh_bluegreen', name: '薄荷晴空', colors: ['#67e8c6', '#60a5fa', '#f3f4f6'] },
    { id: 'rose_dusk', name: '玫瑰暮色', colors: ['#fb7185', '#fda4af', '#fff1f2'] },
    { id: 'lavender_dream', name: '芋泥薰衣草', colors: ['#c4b5fd', '#a78bfa', '#f5f3ff'] },
    { id: 'golden_hour', name: '落日鎏金', colors: ['#fbbf24', '#f59e0b', '#fffbeb'] },
    { id: 'deep_ocean', name: '深海夜幕', colors: ['#22d3ee', '#6366f1', '#0f172a'] },
    { id: 'mono_gray', name: '极简灰白', colors: ['#64748b', '#94a3b8', '#f8fafc'] },
];

function sanitizeFieldLabel(raw) {
    if (raw == null) return '';
    let s = String(raw)
        .replace(/\s*（[^）]*HEX[^）]*）\s*/gi, ' ')
        .replace(/\s*（[^）]*hex[^）]*）\s*/gi, ' ')
        .replace(/\s*HEX\s*/gi, ' ')
        .replace(/\s*Json\s*$/i, '')
        .replace(/\s*JSON\s*$/i, '')
        .replace(/[「」]?\s*JSON\s*[「」]?/gi, '')
        .replace(/\s*\(JSON\)\s*/gi, ' ')
        .replace(/\s*格式\s*JSON\s*/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    return s || String(raw);
}

function normalizeHexForPicker(val) {
    const s = String(val || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
        return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
    }
    return '#e08efe';
}

function isJsonConfigField(f) {
    const type = typeof f === 'object' && f != null ? (f.type || '') : '';
    if (type === 'json' || type === 'jsonarray' || type === 'structured') return true;
    const label = String(typeof f === 'object' ? (f.label || '') : '');
    return /\bJSON\b|结构化\s*数据|配置\s*列表/i.test(label);
}

function isColorHexField(f) {
    if (isImageUrlField(f)) return false;
    const type = typeof f === 'object' && f != null ? (f.type || '') : '';
    if (type === 'color') return true;
    const key = (typeof f === 'string' ? f : (f.id || f.key || '')).toLowerCase();
    const label = String(typeof f === 'object' ? (f.label || '') : '').toLowerCase();
    if (/url|链接|http|photo|img|image|cover|avatar|qrcode/.test(key)) return false;
    if (/主色|辅色|强调色|配色|色值|accent|primary|secondary|tertiary|mint|gradient|palette/.test(key)) return true;
    if ((/主色|辅色|强调色|配色|色值/.test(label) || /hex/.test(label)) && !/url|链接|图片|照片/.test(label)) return true;
    return false;
}

function applyColorPresetToKeys(preset, keys, setFieldValues) {
    setFieldValues((prev) => {
        const next = { ...prev };
        keys.forEach((k, i) => {
            if (preset.colors[i]) next[k] = preset.colors[i];
        });
        return next;
    });
}

function dataUrlToBlob(dataUrl) {
    const [meta, b64] = String(dataUrl).split(',');
    const mime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/webp';
    const bin = atob(b64 || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片解析失败'));
        img.src = dataUrl;
    });
}

async function optimizeImageForTemplate(file) {
    const originalDataUrl = await readFileAsDataUrl(file);
    const img = await loadImageFromDataUrl(originalDataUrl);

    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * scale));
    const targetH = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器不支持图片压缩');

    ctx.drawImage(img, 0, 0, targetW, targetH);

    const qualities = [0.88, 0.8, 0.72, 0.64, 0.56];
    for (const q of qualities) {
        const webp = canvas.toDataURL('image/webp', q);
        if (webp && webp !== 'data:,' && webp.length <= MAX_BUILDER_IMAGE_DATA_URL_LEN) {
            return webp;
        }
    }
    for (const q of qualities) {
        const jpeg = canvas.toDataURL('image/jpeg', q);
        if (jpeg && jpeg !== 'data:,' && jpeg.length <= MAX_BUILDER_IMAGE_DATA_URL_LEN) {
            return jpeg;
        }
    }

    throw new Error('图片仍然过大，请换一张更小的图');
}

export default function Builder() {
    const { templateName } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, profile } = useAuth();
    const editSubdomain = searchParams.get('edit');

    // Mobile States
    const [activeTab, setActiveTab] = useState('template'); // 'template', 'content', 'publish'
    const [isSheetOpen, setIsSheetOpen] = useState(true);
    const [highlightContentNav, setHighlightContentNav] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [previewBaseHtml, setPreviewBaseHtml] = useState('');
    const publishSectionRef = useRef(null);

    useEffect(() => {
        if (activeTab === 'content') setHighlightContentNav(false);
    }, [activeTab]);

    useEffect(() => {
        if (!highlightContentNav || activeTab !== 'template') return;
        const id = window.setTimeout(() => setHighlightContentNav(false), 12000);
        return () => clearTimeout(id);
    }, [highlightContentNav, activeTab]);

    // Keyboard Detection
    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                // If keyboard is up, visual viewport height is significantly less than window height
                const isUp = window.visualViewport.height < window.innerHeight * 0.85;
                setIsKeyboardVisible(isUp);
            }
        };
        window.visualViewport?.addEventListener('resize', handleResize);
        return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }, []);

    // Mobile bottom sheet drag: refs avoid stale state on first pointermove; 100% matches sheet height (incl. keyboard).
    const SHEET_PEEK_PX = 44;
    const sheetDragRef = useRef({ pointerId: null, startY: 0, startedOpen: true });
    const [sheetDragOffset, setSheetDragOffset] = useState(0);
    const [isSheetPointerActive, setIsSheetPointerActive] = useState(false);
    /** 本次拖拽起始时抽屉是否展开（仅用于渲染 transform，与 ref 同步写入） */
    const [dragSheetWasOpen, setDragSheetWasOpen] = useState(true);

    const resetSheetPointer = () => {
        sheetDragRef.current = { pointerId: null, startY: 0, startedOpen: true };
        setIsSheetPointerActive(false);
        setSheetDragOffset(0);
    };

    const onSheetHandlePointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const open = isSheetOpen;
        sheetDragRef.current = {
            pointerId: e.pointerId,
            startY: e.clientY,
            startedOpen: open,
        };
        setDragSheetWasOpen(open);
        setIsSheetPointerActive(true);
        setSheetDragOffset(0);
    };

    const onSheetHandlePointerMove = (e) => {
        if (sheetDragRef.current.pointerId !== e.pointerId) return;
        const { startY } = sheetDragRef.current;
        setSheetDragOffset(startY - e.clientY);
    };

    const finishSheetPointer = (e, clientY) => {
        if (sheetDragRef.current.pointerId !== e.pointerId) return;
        const { startY, startedOpen } = sheetDragRef.current;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* already released */
        }

        const delta = startY - clientY;
        const threshold = 48;
        const tapSlop = 14;

        resetSheetPointer();

        if (Math.abs(startY - clientY) < tapSlop) {
            setIsSheetOpen((v) => !v);
            return;
        }

        if (startedOpen) {
            if (delta < -threshold) setIsSheetOpen(false);
            else if (delta > threshold) setIsSheetOpen(true);
        } else {
            if (delta > threshold) setIsSheetOpen(true);
            else if (delta < -threshold) setIsSheetOpen(false);
        }
    };

    const onSheetHandlePointerUp = (e) => {
        finishSheetPointer(e, e.clientY);
    };

    const onSheetHandlePointerCancel = (e) => {
        if (sheetDragRef.current.pointerId !== e.pointerId) return;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            /* already released */
        }
        resetSheetPointer();
    };

    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelected] = useState(null);

    const colorFieldKeys = useMemo(() => {
        const fields = selectedTemplate?.fields;
        if (!fields?.length) return [];
        return fields
            .map((f) => (typeof f === 'string' ? { key: f, f } : { key: f.id || f.key, f }))
            .filter(({ f }) => isColorHexField(f))
            .map(({ key }) => key)
            .filter(Boolean);
    }, [selectedTemplate]);
    const [subdomain, setSubdomain] = useState('');
    const [publishSubdomainError, setPublishSubdomainError] = useState('');
    const [quotaModalOpen, setQuotaModalOpen] = useState(false);
    const [projectTitle, setProjectTitle] = useState('');
    const [fieldValues, setFieldValues] = useState({});
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isTemplateFetching, setIsTemplateFetching] = useState(false);
    const [result, setResult] = useState(null); // { url }
    const [showPoster, setShowPoster] = useState(false);
    const [status, setStatus] = useState(null); // { dailyUsedEdits, maxDailyEdits }
    const [showViralFooter, setShowViralFooter] = useState(true);

    // BSR (Browser-Side Rendering) Raw HTML
    const [rawHtml, setRawHtml] = useState(null);
    const [originalData, setOriginalData] = useState(null);
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const desktopIframeRef = useRef(null);
    const mobileIframeRef = useRef(null);
    const mobileTemplateTapRef = useRef({ name: null, at: 0 });

    const scrollToField = (key) => {
        const msg = { type: 'bsr-scroll', field: key };
        desktopIframeRef.current?.contentWindow?.postMessage(msg, '*');
        mobileIframeRef.current?.contentWindow?.postMessage(msg, '*');
    };

    const handleImageFilePick = async (key, file) => {
        if (!file) return;
        if (file.size > MAX_BUILDER_IMAGE_BYTES) {
            toast.error('图片请小于 8MB');
            return;
        }
        const toastId = toast.loading('正在优化图片...');
        try {
            const optimized = await optimizeImageForTemplate(file);
            let finalValue = optimized;

            // 优先上传到 Supabase Storage，发布后使用公网 URL（避免后端过滤 data: 的场景）
            try {
                if (user?.id) {
                    const blob = dataUrlToBlob(optimized);
                    const ext = blob.type.includes('png') ? 'png' : (blob.type.includes('jpeg') ? 'jpg' : 'webp');
                    const uploadFile = new File([blob], `builder-${Date.now()}.${ext}`, { type: blob.type });
                    const buckets = ['builder-images', 'uploads', 'public', 'assets', 'images', 'media'];
                    for (const bucket of buckets) {
                        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
                        const { error } = await supabase.storage.from(bucket).upload(path, uploadFile, {
                            cacheControl: '31536000',
                            upsert: false,
                        });
                        if (!error) {
                            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
                            if (data?.publicUrl) {
                                finalValue = data.publicUrl;
                                break;
                            }
                        }
                    }
                }
            } catch {
                // ignore storage errors and keep data URL fallback
            }

            setFieldValues((p) => ({ ...p, [key]: finalValue }));
            toast.success(finalValue.startsWith('http') ? '图片已上传并应用' : '图片已应用', { id: toastId });
        } catch (err) {
            toast.error(err.message || '图片处理失败', { id: toastId });
        }
    };

    // Domain Checker State
    const [domainStatus, setDomainStatus] = useState('idle'); // idle, checking, available, taken, error
    const [domainMsg, setDomainMsg] = useState('');

    // 0. Domain Availability Checker (Debounced)
    useEffect(() => {
        if (editSubdomain || !subdomain) {
            setDomainStatus('idle');
            setDomainMsg('');
            return;
        }

        const minLen = status?.minDomainLen ?? 3;
        if (subdomain.length < minLen) {
            setDomainStatus('error');
            setDomainMsg(`⚠️ 域名太短，您的等级至少需要 ${minLen} 个字符`);
            return;
        }

        setDomainStatus('checking');
        setDomainMsg('正在实时检测可用性...');

        const timer = setTimeout(() => {
            checkDomainAvailability(subdomain)
                .then(res => {
                    if (res.available) {
                        setDomainStatus('available');
                        setDomainMsg(res.message);
                    } else {
                        setDomainStatus('taken');
                        setDomainMsg(`❌ ${res.message}`);
                    }
                })
                .catch(err => {
                    setDomainStatus('error');
                    setDomainMsg('⚠️ 检测网络异常，请重试');
                });
        }, 1000); // 1-second debounce

        return () => clearTimeout(timer);
    }, [subdomain, editSubdomain, status]);

    // 1. Persistence for referral code (Runs once)
    useEffect(() => {
        const urlRef = searchParams.get('ref');
        if (urlRef) {
            localStorage.setItem('rs_ref', JSON.stringify({ code: urlRef, time: Date.now() }));
        }
    }, [searchParams]);

    // 2. Load template list (Runs once)
    useEffect(() => {
        listTemplates().then(d => {
            setTemplates(d.templates ?? []);
            setInitialLoading(false);
        }).catch(e => {
            console.error('[Templates Fetch Error]', e);
            toast.error('获取模板列表失败');
            setInitialLoading(false);
        });
    }, []);

    // 3. Handle Edit Mode Data (Runs once when user/subdomain available)
    useEffect(() => {
        if (editSubdomain && user && !initialDataLoaded) {
            getConfigBySubdomain(editSubdomain, user.id).then(cfgRes => {
                if (cfgRes.success && cfgRes.data) {
                    const project = cfgRes.data;
                    setSubdomain(project.subdomain);
                    // Field values and footer
                    setFieldValues(project.data || {});
                    setProjectTitle(project.data?.title || '');
                    setShowViralFooter(project.show_viral_footer !== false);

                    if (templates.length > 0) {
                        const found = templates.find(t => t.name === project.template_type);
                        if (found) setSelected(found);
                        
                        // Capture original state for change detection (Only once)
                        setOriginalData({
                            fieldValues: project.data || {},
                            projectTitle: project.data?.title || '未命名网页',
                            showViralFooter: project.show_viral_footer !== false,
                            templateName: project.template_type
                        });
                    }
                    setInitialDataLoaded(true);
                }
            }).catch(e => console.error('[Edit Data Error]', e));
        }
    }, [editSubdomain, user, templates, initialDataLoaded]);

    // 4. Handle initial template choice from URL (New Page Flow)
    useEffect(() => {
        if (!editSubdomain && templates.length > 0 && !selectedTemplate) {
            const qTemplateId = searchParams.get('templateId');
            const targetName = templateName || qTemplateId;
            
            if (targetName) {
                const found = templates.find(t => t.name === targetName);
                if (found) setSelected(found);
            }
        }
    }, [templateName, searchParams, templates, editSubdomain, selectedTemplate]);

    // Fetch user quota for status display
    useEffect(() => {
        if (!user) return;
        getUserStatus(user.id)
            .then(res => {
                if (res.success) setStatus(res.data);
            })
            .catch(err => console.error('[Status Fetch Error]', err));
    }, [user]);

    // Fetch raw HTML when template changes (for BSR Preview)
    useEffect(() => {
        if (!selectedTemplate) {
            setRawHtml(null);
            return;
        }

        const controller = new AbortController();
        setIsTemplateFetching(true);

        const isEditModeJustLoaded = !!editSubdomain && Object.keys(fieldValues).length > 0;
        let loadedFromDraft = false;

        // Draft restoration logic
        if (!editSubdomain) {
            const draftStr = localStorage.getItem('rs_builder_draft');
            if (draftStr) {
                try {
                    const draft = JSON.parse(draftStr);
                    if (draft.templateName === selectedTemplate.name) {
                        setFieldValues(draft.fieldValues || {});
                        setSubdomain(draft.subdomain || '');
                        setProjectTitle(draft.projectTitle || '');
                        setShowViralFooter(draft.showViralFooter ?? true);
                        loadedFromDraft = true;
                        localStorage.removeItem('rs_builder_draft');
                        toast.success('已为您恢复登录前的网页草稿 ✍️');
                    }
                } catch(e) {}
            }
        }

        // Pre-fill fields logic
        if (!selectedTemplate.static && selectedTemplate.fields) {
            if (!isEditModeJustLoaded && !loadedFromDraft) {
                const initialVals = {};
                selectedTemplate.fields.forEach(f => {
                    const key = typeof f === 'string' ? f : (f.id || f.key);
                    const defaultValue = typeof f === 'string'
                        ? (DEFAULT_VALUES[f] || '')
                        : (f.default !== undefined ? f.default : (DEFAULT_VALUES[key] || ''));
                    initialVals[key] = defaultValue;
                });
                
                setFieldValues(initialVals);
            }
        } else {
            if (!isEditModeJustLoaded && !loadedFromDraft) setFieldValues({});
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
        const versionParam = selectedTemplate.version ? `?v=${selectedTemplate.version}` : '';
        
        fetch(`${apiBase}/api/template/raw/${selectedTemplate.name}${versionParam}`, { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch raw template');
                return res.text();
            })
            .then(html => {
                setRawHtml(html);
                setIsTemplateFetching(false);
            })
            .catch(err => {
                if (err.name === 'AbortError') return; // Ignore intentionally aborted requests
                console.error('[BSR Error]', err);
                setIsTemplateFetching(false);
            });

        return () => controller.abort();
    }, [selectedTemplate, editSubdomain]); // Added editSubdomain for stability, but kept dependencies lean

    function handleTemplateChange(e) {
        const found = templates.find((t) => t.name === e.target.value) ?? null;
        setSelected(found);
        setFieldValues({});
        setResult(null);

        // Preserve edit mode if active
        const query = editSubdomain ? `?edit=${editSubdomain}` : '';
        if (found) navigate(`/builder/${found.name}${query}`, { replace: true });
        else navigate(`/builder${query}`, { replace: true });
    }

    function handleMobileTemplateSelect(t) {
        const found = templates.find((tmp) => tmp.name === t.name) ?? null;
        if (!found) return;
        setSelected(found);
        const query = editSubdomain ? `?edit=${editSubdomain}` : '';
        navigate(`/builder/${found.name}${query}`, { replace: true });
        setHighlightContentNav(true);
    }

    /** 双击 / 双触：单击已选过模板，此处只切换步骤 */
    function handleMobileTemplateDoubleClick() {
        setActiveTab('content');
        setIsSheetOpen(true);
        setHighlightContentNav(false);
    }

    function handleMobileTemplateTouchEnd(t, e) {
        const now = Date.now();
        const { name: prev, at } = mobileTemplateTapRef.current;
        if (prev === t.name && now - at < 400) {
            e.preventDefault();
            handleMobileTemplateDoubleClick();
            mobileTemplateTapRef.current = { name: null, at: 0 };
            return;
        }
        mobileTemplateTapRef.current = { name: t.name, at: now };
    }

    async function executeRenderSubmit() {
        setQuotaModalOpen(false);
        const toastId = toast.loading(editSubdomain ? '正在更新您的浪漫网页...' : '正在为您全网生成中...');
        setLoading(true);
        try {
            const response = await renderProject({
                subdomain,
                type: selectedTemplate.name,
                data: { ...fieldValues, title: projectTitle || '未命名网页' },
                showViralFooter,
            });

            if (response.code !== 0) {
                toast.error(response.message || '生成失败', { id: toastId });
                return;
            }

            const pageUrl = response.data?.url || `https://${subdomain}.${BASE_DOMAIN}/`;
            setResult({ url: pageUrl });
            setShowPoster(false);

            toast.success(
                <div style={{ fontSize: '0.85rem' }}>
                    🎉 {editSubdomain ? '更新成功！' : '发布成功！'}<br />
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#d6336c', fontWeight: 'bold', display: 'block', margin: '4px 0' }}>
                        立即访问页面 →
                    </a>
                    <div style={{ opacity: 0.8, fontSize: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '4px' }}>
                        💡 提示：云端同步通常需要 30 秒，如点击后未见更新请刷新页面。
                    </div>
                </div>,
                { id: toastId, duration: 8000 }
            );

            getUserStatus(user.id).then(res => { if (res.success) setStatus(res.data); });

            if (editSubdomain && window.innerWidth < 1024) {
                setTimeout(() => navigate('/myspace'), 2000);
            }
        } catch (err) {
            toast.error(err.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setResult(null);

        if (!selectedTemplate) return toast.error('请选择一个网页模板');

        const minLen = status?.minDomainLen ?? 3;
        if (!editSubdomain) {
            if (!subdomain?.trim()) {
                setPublishSubdomainError('请输入专属域名');
                setActiveTab('publish');
                setIsSheetOpen(true);
                return;
            }
            if (subdomain.length < minLen) {
                setPublishSubdomainError(`专属域名至少需要 ${minLen} 个字符`);
                setActiveTab('publish');
                setIsSheetOpen(true);
                return;
            }
        }
        setPublishSubdomainError('');

        if (!user) {
            toast.error('请先登录后再发布网页 🔑');

            if (selectedTemplate) {
                localStorage.setItem('rs_builder_draft', JSON.stringify({
                    templateName: selectedTemplate.name,
                    subdomain,
                    projectTitle,
                    fieldValues,
                    showViralFooter,
                    timestamp: Date.now()
                }));
            }

            const hasRef = searchParams.get('ref') || localStorage.getItem('rs_ref');
            navigate(hasRef ? '/auth?mode=register' : '/auth');
            return;
        }

        if (editSubdomain && originalData) {
            const currentTitle = projectTitle || '未命名网页';
            const contentChanged = JSON.stringify(fieldValues) !== JSON.stringify(originalData.fieldValues);
            const titleChanged = currentTitle !== originalData.projectTitle;
            const footerChanged = showViralFooter !== originalData.showViralFooter;
            const templateChanged = selectedTemplate?.name !== originalData.templateName;

            const hasChanged = contentChanged || titleChanged || footerChanged || templateChanged;

            if (!hasChanged) {
                toast.error('内容未发生改变，无需更新 💡');
                return;
            }

            if (titleChanged && !contentChanged && !footerChanged && !templateChanged) {
                setLoading(true);
                const toastId = toast.loading('正在更新项目备注...');
                try {
                    const { error } = await supabase
                        .from('projects')
                        .update({ data: { ...fieldValues, title: currentTitle } })
                        .eq('subdomain', subdomain);

                    if (error) throw error;

                    setOriginalData(prev => ({ ...prev, projectTitle: currentTitle }));
                    toast.success('项目备注已更新 (不消耗额度) ✨', { id: toastId });

                    if (window.innerWidth < 1024) {
                        setTimeout(() => navigate('/myspace'), 2000);
                    }
                } catch (err) {
                    toast.error('备注更新失败: ' + err.message, { id: toastId });
                } finally {
                    setLoading(false);
                }
                return;
            }
        }

        getUserStatus(user.id)
            .then(res => {
                if (res?.success) setStatus(res.data);
            })
            .catch(() => {});

        setQuotaModalOpen(true);
    }

    // --- BSR Real-time Preview Generation (No-Reload Architecture) ---
    // Effect to generate the BASE HTML for the preview iframe (loaded once per template)
    useEffect(() => {
        if (!rawHtml || !selectedTemplate) {
            setPreviewBaseHtml('');
            return;
        }

        const referrerMeta = '<meta name="referrer" content="no-referrer" />';
        const baseTag = `<base href="https://www.${BASE_DOMAIN}/assets/${selectedTemplate.name}/" />`;
        const runtimeStyles = `<style>
            ::-webkit-scrollbar{display:none!important}
            *{scrollbar-width:none;-ms-overflow-style:none}
            .bsr-marker{display:inline-block;min-height:1em;min-width:1px;transition:all 0.3s ease;}
            body { padding-top: 100px !important; padding-bottom: 80vh !important; }
        </style>`;

        let html = rawHtml;
        const headRegex = /<head[^>]*>/i;
        if (headRegex.test(html)) {
            html = html.replace(headRegex, (m) => m + '\n' + referrerMeta + '\n' + baseTag + '\n' + runtimeStyles);
        } else {
            html = referrerMeta + '\n' + baseTag + '\n' + runtimeStyles + '\n' + html;
        }

        // Replace placeholders safely by parsing HTML tokens
        // Protect scripts, styles, titles, textareas, and any HTML tag attributes from being wrapped in <span>
        const regex = /(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<title\b[^>]*>[\s\S]*?<\/title>|<textarea\b[^>]*>[\s\S]*?<\/textarea>|<[^>]+>)|(\{\{([^}]+)\}\})/gi;
        html = html.replace(regex, (match, tagMatch, tplMatch, key) => {
            if (tagMatch) {
                // Inside protected blocks or tags, just replace with raw values
                return tagMatch.replace(/\{\{([^}]+)\}\}/g, (m, k) => {
                    k = k.trim();
                    const raw = fieldValues[k] !== undefined ? fieldValues[k] : (DEFAULT_VALUES[k] || '');
                    return escapeHtmlAttr(raw);
                });
            } else if (tplMatch) {
                // In text nodes, wrap in bsr-marker for real-time live preview updates
                const k = key.trim();
                const val = fieldValues[k] !== undefined ? fieldValues[k] : (DEFAULT_VALUES[k] || '');
                return `<span data-field="${k}" class="bsr-marker">${val || '&nbsp;'}</span>`;
            }
            return match;
        });

        const runtimeScript = `
        <script>
            window.RS_FOCUSED_FIELD = ${JSON.stringify(focusedField)};
            
            function handleScroll(field) {
                if(!field) return;
                var el = document.querySelector("[data-field='" + field + "']") || 
                         document.querySelector("[data_text='" + field + "']") || 
                         document.getElementById(field);
                if(el) {
                    var modal = el.closest(".modal") || el.closest("[role='dialog']");
                    if(modal) modal.classList.add("is_open");
                    
                    // Calculate precise position with offset to avoid top nav overlap
                    var rect = el.getBoundingClientRect();
                    var absoluteTop = window.pageYOffset + rect.top;
                    // Lower offset on screen: scroll to (absoluteTop - center - margin)
                    // On mobile (H < 800), use a larger offset (80px) to clear floating UI
                    var offset = window.innerHeight < 800 ? 80 : 40;
                    var target = absoluteTop - (window.innerHeight / 2) + (rect.height / 2) - offset;
                    window.scrollTo({ top: target, behavior: 'smooth' });
                }
            }

            function updateContent(values) {
                for (var k in values) {
                    var val = values[k];
                    var elements = document.querySelectorAll("[data-field='" + k + "'], [data_text='" + k + "']");
                    elements.forEach(function(el) {
                        try {
                            if (el.tagName === 'IMG') {
                                try {
                                    el.referrerPolicy = 'no-referrer';
                                    el.removeAttribute('crossorigin');
                                    el.src = val || '';
                                } catch (e) {}
                            } else if (el.classList.contains('bsr-marker')) {
                                el.textContent = val || ' ';
                            } else {
                                el.innerText = val || ' ';
                            }
                        } catch(e) {}
                    });
                }
            }

            window.addEventListener("message", function(e) {
                if(!e.data) return;
                if(e.data.type === "bsr-scroll") handleScroll(e.data.field);
                if(e.data.type === "bsr-update") updateContent(e.data.values);
            });

            if(window.RS_FOCUSED_FIELD) {
                setTimeout(function() { handleScroll(window.RS_FOCUSED_FIELD); }, 100);
            }
        </script>`;

        const finalHtml = html.includes('</body>') ? html.replace('</body>', runtimeScript + '</body>') : html + runtimeScript;
        setPreviewBaseHtml(finalHtml);
    }, [rawHtml, selectedTemplate?.name]);

    // Effect to Push Real-time Updates to Iframe (No Reload)
    useEffect(() => {
        const msg = {
            type: 'bsr-update',
            values: fieldValues
        };
        if (desktopIframeRef.current?.contentWindow) {
            desktopIframeRef.current.contentWindow.postMessage(msg, '*');
        }
        if (mobileIframeRef.current?.contentWindow) {
            mobileIframeRef.current.contentWindow.postMessage(msg, '*');
        }
    }, [fieldValues]);

    // Fallback animation for Safari/older browsers without View Transitions
    const isFromHomeFallback = location.state?.from === 'home' && !('startViewTransition' in document);

    return (
        <div className={`w-full h-[100dvh] cosmic-bg overflow-hidden flex flex-col font-body text-on-surface ${isFromHomeFallback ? 'builder-slide-up-fallback' : 'animate-in fade-in duration-1000 ease-in-out'}`}>

            {/* ─── DESKTOP VIEW (hidden on mobile) ─── */}
            <div className="hidden lg:flex flex-col h-full w-full">
                <main className="flex-grow w-full max-w-6xl mx-auto h-[calc(100dvh-5rem)] pb-12 pt-24 px-6 md:px-12 flex flex-col lg:flex-row gap-6 lg:gap-10 relative z-10 justify-center">

                    {/* Left Panel: Workspace Area */}
                    <section className="flex-1 flex flex-col w-full max-w-2xl mx-auto overflow-hidden h-full relative">

                        {/* Header: Title and Gallery Link */}
                        <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0 pt-2 md:pt-4 w-full z-10 px-1">
                            <div className="text-on-surface-variant font-headline font-light text-base md:text-lg tracking-wide opacity-80 italic">
                                {editSubdomain ? '继续雕琢这份心意' : '那我们慢慢把它写下来'}
                            </div>
                            <Link
                                to="/gallery"
                                className="group flex items-center justify-center gap-1.5 text-secondary-dim hover:text-secondary transition-all font-headline font-light tracking-widest px-4 py-1.5 cursor-pointer rounded-full bg-secondary/5 hover:bg-secondary/10 border border-secondary/20 backdrop-blur-md text-xs shadow-sm whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">explore</span>
                                模板大厅
                            </Link>
                        </div>

                        <form id="builder-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 w-full relative z-10 px-1 overflow-y-auto scrollbar-hide pb-32">

                            {/* Fixed Top Controls & Warnings */}
                            <div className="flex flex-col gap-4 md:gap-6 shrink-0 w-full mb-4 md:mb-6">

                                {/* Status Warnings */}
                                {status?.isOverQuota && (
                                    <div className="bg-error-container/20 border border-error-dim/40 p-4 rounded-xl flex gap-3 items-start animate-in fade-in">
                                        <span className="text-2xl">⚠️</span>
                                        <div className="text-sm text-error-dim leading-relaxed">
                                            <strong className="text-base text-error">进入维护模式</strong><br />
                                            由于您的配额已到期，您可以继续维护<strong>最近编辑过的一个网页</strong>，但目前只能使用<strong>“免费”模板</strong>进行更新。其他网页已暂时锁定，续费后将立即解锁。建议尽快续费以防止域名被回收。
                                        </div>
                                    </div>
                                )}

                                {editSubdomain && status && (
                                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex gap-3 items-start text-on-surface-variant">
                                        <span className="text-xl text-primary-dim">ℹ️</span>
                                        <div className="text-sm">
                                            当前为更新页面内容，不消耗建站网址数量配额。<br />
                                            <span className="opacity-80 mt-1 block">今日剩余可修改次数：<span className="text-primary font-bold">{status.maxDailyEdits - status.dailyUsedEdits} / {status.maxDailyEdits}</span></span>
                                        </div>
                                    </div>
                                )}

                                {/* Template Selector */}
                                <div className="group">
                                    <label className="text-xs uppercase tracking-[0.2em] text-primary-dim/60 font-bold mb-3 block">选择模板</label>
                                    <select
                                        value={selectedTemplate?.name ?? ''}
                                        onChange={handleTemplateChange}
                                        required
                                        className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-lg md:text-xl font-light font-headline py-2 transition-all writing-area text-on-surface appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-surface text-on-surface">-- 请先选择一个模板 --</option>
                                        {templates.map((t) => (
                                            <option key={t.name} value={t.name} className="bg-surface text-on-surface">
                                                {t.tier === 'pro' ? '💎 [PRO] ' : ''}{t.title || t.name}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedTemplate?.price > 0 && (
                                        <div className="mt-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs text-primary-dim flex justify-between">
                                            <span>💎 <strong>单独买断价格:</strong> ¥{selectedTemplate.price}</span>
                                            <span className="opacity-60">暂未开放单独支付</span>
                                        </div>
                                    )}
                                </div>

                                {/* Subdomain Input — 桌面底栏「发布」会滚动定位到这里 */}
                                <div ref={publishSectionRef} id="builder-publish-anchor" className="group scroll-mt-28">
                                    <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary-dim/60 font-bold mb-3">
                                        专属网址
                                        {editSubdomain && <span className="text-on-surface-variant/50 font-normal lowercase tracking-normal">(不可修改)</span>}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={subdomain}
                                            onChange={(e) => {
                                                if (editSubdomain) return;
                                                setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                                setPublishSubdomainError('');
                                            }}
                                            placeholder="例如：our-love-story"
                                            required
                                            readOnly={!!editSubdomain}
                                            className={`flex-1 bg-transparent border-b ${editSubdomain ? 'border-outline-variant/10 text-on-surface-variant/50 cursor-not-allowed' : publishSubdomainError ? 'border-error/60 focus:border-error' : 'border-outline-variant/30 focus:border-primary'} focus:ring-0 text-xl md:text-2xl font-light font-headline py-2 transition-all writing-area text-on-surface`}
                                        />
                                        <span className="text-on-surface-variant text-base font-light">.{BASE_DOMAIN}</span>
                                    </div>
                                    {publishSubdomainError && !editSubdomain && (
                                        <p className="text-sm text-error font-medium mt-2" role="alert">{publishSubdomainError}</p>
                                    )}
                                    {!editSubdomain && (
                                        <>
                                            <div className="text-xs text-error-dim mt-2 font-medium">⚠️ 专属网址一经创建永久绑定，无法修改或删除！</div>
                                            {domainStatus !== 'idle' && (
                                                <div className={`text-xs mt-2 flex items-center gap-2 ${domainStatus === 'available' ? 'text-green-400' : domainStatus === 'checking' ? 'text-on-surface-variant' : 'text-error-dim'}`}>
                                                    {domainStatus === 'checking' && <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"></span>}
                                                    {domainMsg}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Dynamic Fields Area container */}
                            {selectedTemplate && !selectedTemplate.static && (selectedTemplate.fields ?? []).length > 0 && (
                                <div className="flex flex-col bg-surface/30 backdrop-blur-md border border-outline-variant/20 shadow-[inset_0_4px_24px_rgba(0,0,0,0.05)] rounded-2xl w-full rounded-b-3xl shrink-0">

                                    {/* Fixed Header */}
                                    <div className="p-5 md:p-8 pb-4 shrink-0 border-b border-outline-variant/10">
                                        <div className="text-primary-dim text-sm font-bold uppercase tracking-widest flex items-center gap-2 opacity-80">
                                            <span className="material-symbols-outlined text-base">edit_document</span>
                                            专属内容填写
                                        </div>
                                    </div>

                                    {/* Scrollable Fields */}
                                    <div className="p-5 md:p-8 pt-6 flex flex-col gap-6 md:gap-8">
                                        {colorFieldKeys.length > 0 && (
                                            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 md:p-5 space-y-3 -mt-1">
                                                <div className="text-xs font-bold text-primary-dim uppercase tracking-widest">整体配色</div>
                                                <p className="text-[10px] md:text-xs text-on-surface-variant/75 leading-relaxed">任选一套，将按顺序填入本页中的配色项（全站模板通用）。仍可在下方单独微调。</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {MOODSPACE_COLOR_PRESETS.map((preset) => (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => applyColorPresetToKeys(preset, colorFieldKeys, setFieldValues)}
                                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant/25 bg-surface-container-low/50 hover:border-primary/40 hover:bg-primary/10 transition-all text-left"
                                                        >
                                                            <span className="flex -space-x-1">
                                                                {preset.colors.map((c) => (
                                                                    <span key={c} className="w-4 h-4 rounded-full border border-white/15 shadow-sm" style={{ backgroundColor: c }} title={c} />
                                                                ))}
                                                            </span>
                                                            <span className="text-xs font-medium text-on-surface">{preset.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedTemplate.fields.map((f) => {
                                            const key = typeof f === 'string' ? f : (f.id || f.key);
                                            const label = typeof f === 'string' ? (FIELD_LABELS[f] || f) : (f.label || f.id || f.key);
                                            const displayLabel = sanitizeFieldLabel(label);
                                            const placeholder = typeof f === 'string'
                                                ? (`输入 ${FIELD_LABELS[f] || f}...`)
                                                : (f.placeholder || `输入 ${displayLabel}...`);
                                            const inputType = typeof f === 'string' ? 'textarea' : (f.type || 'text');
                                            const showImagePick = isImageUrlField(f) && inputType !== 'textarea';
                                            const jsonField = isJsonConfigField(f);
                                            const colorField = isColorHexField(f);

                                            return (
                                                <div className={`group shrink-0 relative ${focusedField === key && (showImagePick || colorField) ? 'rounded-xl ring-2 ring-primary/30 ring-offset-2 ring-offset-surface/0 p-3 -mx-1' : ''}`} key={key}>
                                                    <label className="text-xs uppercase tracking-[0.2em] text-primary-dim/60 font-bold mb-3 block">{displayLabel}</label>
                                                    {jsonField ? (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] text-on-surface-variant/65 leading-relaxed">按示例修改文字与标点即可，无需了解技术名词。</p>
                                                            <textarea
                                                                rows={8}
                                                                value={fieldValues[key] ?? ''}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                onFocus={() => { scrollToField(key); setFocusedField(key); }}
                                                                onBlur={() => setFocusedField(null)}
                                                                placeholder={placeholder}
                                                                spellCheck={false}
                                                                className="w-full bg-surface-container-low/40 border border-outline-variant/20 rounded-xl px-3 py-3 focus:border-primary focus:ring-0 text-sm font-mono leading-relaxed resize-y text-on-surface min-h-[140px]"
                                                            />
                                                        </div>
                                                    ) : inputType === 'textarea' ? (
                                                        <textarea
                                                            rows={key === 'paragraphs' ? 6 : 3}
                                                            value={fieldValues[key] ?? ''}
                                                            onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                            onFocus={() => { scrollToField(key); setFocusedField(key); }}
                                                            onBlur={() => setFocusedField(null)}
                                                            placeholder={placeholder}
                                                            className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-lg md:text-xl font-light font-headline leading-relaxed resize-none writing-area text-on-surface transition-all"
                                                        />
                                                    ) : showImagePick ? (
                                                        <div className="space-y-2">
                                                            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                                                <input
                                                                    type="text"
                                                                    value={fieldValues[key] ?? ''}
                                                                    onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                    onFocus={() => { scrollToField(key); setFocusedField(key); }}
                                                                    onBlur={() => setFocusedField(null)}
                                                                    placeholder={placeholder || '粘贴 HTTPS 图片链接'}
                                                                    className="flex-1 min-w-0 w-full bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-xl font-light font-headline py-2 transition-all writing-area text-on-surface"
                                                                />
                                                                <label className="inline-flex items-center justify-center shrink-0 px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/35 text-primary text-sm font-medium cursor-pointer hover:bg-primary/25 transition-colors touch-manipulation">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="sr-only"
                                                                        onChange={async (ev) => {
                                                                            const file = ev.target.files?.[0];
                                                                            ev.target.value = '';
                                                                            await handleImageFilePick(key, file);
                                                                        }}
                                                                    />
                                                                    上传图片
                                                                </label>
                                                            </div>
                                                            <p className="text-[10px] text-on-surface-variant/55 leading-relaxed">支持图床链接或本地上传；上传后以数据形式写入，发布时请留意页面体积。</p>
                                                        </div>
                                                    ) : colorField ? (
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <input
                                                                type="color"
                                                                aria-label={displayLabel}
                                                                value={normalizeHexForPicker(fieldValues[key])}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                onFocus={() => { scrollToField(key); setFocusedField(key); }}
                                                                onBlur={() => setFocusedField(null)}
                                                                className="h-11 w-[4.5rem] cursor-pointer rounded-xl border border-outline-variant/30 bg-surface-container-low p-1 shadow-inner"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={fieldValues[key] ?? ''}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                onFocus={() => { scrollToField(key); setFocusedField(key); }}
                                                                onBlur={() => setFocusedField(null)}
                                                                placeholder="#RRGGBB"
                                                                className="flex-1 min-w-[8rem] bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-mono py-2 text-on-surface"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={fieldValues[key] ?? ''}
                                                            onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                            onFocus={() => { scrollToField(key); setFocusedField(key); }}
                                                            onBlur={() => setFocusedField(null)}
                                                            placeholder={placeholder}
                                                            className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-xl font-light font-headline py-2 transition-all writing-area text-on-surface"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Project Memo Name */}
                                        <div className="group pt-6 border-t border-outline-variant/10 shrink-0">
                                            <label className="text-xs uppercase tracking-[0.2em] text-primary-dim/60 font-bold mb-3 block">项目备注名称</label>
                                            <input 
                                                type="text"
                                                value={projectTitle}
                                                onChange={(e) => setProjectTitle(e.target.value)}
                                                placeholder="给这个网页起个名字（仅自己可见）"
                                                className="w-full bg-transparent border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-lg font-light font-headline py-2 transition-all writing-area text-on-surface"
                                            />
                                            <p className="text-[10px] text-on-surface-variant mt-2 opacity-60">此名称仅用于在“我的空间”中管理，不会显示在实际发布的网页上。</p>
                                        </div>

                                        {/* Viral Footer Toggle */}
                                        <div className="group pt-6 border-t border-outline-variant/10 shrink-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <label className="text-sm font-bold text-on-surface md:text-base block mb-1">📢 显示“制作同款”按钮</label>
                                                    <div className="text-xs text-on-surface-variant font-light leading-relaxed">
                                                        {status?.allowHideFooter === false
                                                            ? '⚠️ 您的等级需保留此功能以支持我们（默认开启）'
                                                            : '开启后页面底部将悬浮一个优雅的跳转按钮'}
                                                    </div>
                                                </div>
                                                <label className="switch mt-1 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={showViralFooter}
                                                        disabled={status?.allowHideFooter === false}
                                                        onChange={(e) => setShowViralFooter(e.target.checked)}
                                                    />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </section>

                    {/* Right Panel: Live Preview iframe (BSR) */}
                    <section className="w-full lg:w-auto lg:max-w-[380px] flex flex-col h-auto lg:h-full max-h-[82vh] lg:max-h-[800px] aspect-[9/19.5] shrink-0 mx-auto lg:my-auto py-2">
                        <div className="flex-1 glass-panel rounded-xl overflow-hidden border border-outline-variant/20 relative shadow-2xl flex flex-col group transition-all duration-500 hover:border-primary/30">
                            {/* Preview Header Overlay */}
                            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-surface/90 to-transparent z-10 p-6 pointer-events-none transition-opacity duration-300 group-hover:opacity-40">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-primary-dim font-bold flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                    Live Space Preview
                                </div>
                            </div>

                            {/* Iframe injection */}
                            <div className="flex-1 relative bg-black">
                                {(!selectedTemplate || !rawHtml || isTemplateFetching) ? (
                                    <div className="absolute inset-0 bg-surface/5 flex flex-col items-center justify-center pointer-events-none transition-colors duration-500">
                                        {isTemplateFetching ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                <span className="text-on-surface-variant font-headline font-light tracking-widest text-xs opacity-60">
                                                    正在开启新的时空...
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-3xl md:text-5xl text-primary/30 mb-2 md:mb-4 group-hover:scale-110 transition-transform">visibility</span>
                                                <span className="text-on-surface-variant font-light text-sm tracking-widest opacity-80 group-hover:opacity-0 transition-opacity">填写左侧信息实时预览</span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <iframe
                                        ref={desktopIframeRef}
                                        srcDoc={previewBaseHtml}
                                        style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                                        title="Live Preview"
                                        id="preview-iframe"
                                        className="absolute inset-0 z-0 bg-transparent"
                                    />
                                )}
                            </div>
                        </div>
                    </section>
                </main>

                {/* Fixed Floating Action Bar (Universal Navigation) */}
                <div className={`fixed bottom-[100px] left-0 w-full z-40 pointer-events-none`}>
                    <div className="w-full max-w-7xl mx-auto px-4 md:px-12 flex flex-wrap justify-between items-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                const from = location.state?.from;
                                if (from === 'gallery') navigate('/gallery');
                                else if (from === 'myspace') navigate('/myspace');
                                else navigate('/', { state: { returnToStep: 2 } });
                            }}
                            className={`group flex items-center justify-center gap-2 text-on-surface hover:text-white transition-all font-headline font-light tracking-widest px-5 py-3 md:px-8 md:py-3.5 cursor-pointer rounded-full bg-surface-container-high/60 hover:bg-surface-container-highest border border-outline-variant/20 backdrop-blur-xl shadow-lg shadow-black/20 text-sm md:text-base pointer-events-auto`}
                        >
                            <span className="material-symbols-outlined text-base md:text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            上一步
                        </button>

                        <div className="flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
                            <button
                                type="button"
                                onClick={() => publishSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                className="flex items-center justify-center gap-1.5 text-on-surface font-headline font-medium tracking-widest px-5 py-3 md:px-6 rounded-full bg-surface-container-high/70 border border-outline-variant/25 backdrop-blur-xl shadow-md text-sm hover:border-primary/30 transition-all"
                            >
                                <span className="material-symbols-outlined text-base">rocket_launch</span>
                                发布
                            </button>
                            <button
                                type="submit"
                                form="builder-form"
                                disabled={loading || domainStatus === 'checking'}
                                className="group flex items-center justify-center gap-2 text-primary hover:text-primary-container transition-all font-headline font-medium tracking-widest px-6 py-3 md:px-10 md:py-3.5 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/30 backdrop-blur-xl shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm md:text-base ease-out duration-500 hover:scale-[1.02] active:scale-95"
                            >
                                <span>{loading ? (editSubdomain ? '全网刷新' : '宇宙级生成') : (editSubdomain ? '更新当前宇宙' : '点亮这片星空')}</span>
                                {!loading && <span className="material-symbols-outlined text-base md:text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>}
                            </button>
                            {result && (
                                <button
                                    type="button"
                                    onClick={() => setShowPoster(true)}
                                    className="group flex items-center justify-center gap-2 text-secondary hover:text-secondary-container transition-all font-headline font-medium tracking-widest px-5 py-3 rounded-full bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 backdrop-blur-xl shadow-lg shadow-secondary/20 text-sm"
                                >
                                    <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">image</span>
                                    生成分享海报
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── MOBILE VIEW (hidden on desktop) ─── */}
            <div className="lg:hidden flex flex-col h-full w-full relative">

                {/* Mobile Top Header */}
                <header className={`fixed top-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-surface/60 backdrop-blur-2xl transition-transform duration-500 ${!isSheetOpen ? '-translate-y-full' : 'translate-y-0'}`}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                const from = location.state?.from;
                                if (from === 'gallery') navigate('/gallery');
                                else if (from === 'myspace') navigate('/myspace');
                                else navigate('/', { state: { returnToStep: 2 } });
                            }}
                            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors scale-95 active:duration-150"
                        >
                            <span className="material-symbols-outlined text-primary">arrow_back</span>
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-regular text-on-surface font-headline tracking-tight truncate max-w-[120px]">
                                {selectedTemplate?.title || TEMPLATE_NAME_MAP[selectedTemplate?.name] || selectedTemplate?.name || '未命名空间'}
                            </h1>
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">
                                {loading ? 'Saving...' : 'Live Preview'}
                            </span>
                        </div>
                    </div>
                    <Link to="/" className="text-primary font-medium font-headline tracking-tight text-sm px-4 py-2 hover:bg-white/5 rounded-full transition-colors flex items-center gap-2" style={{ textDecoration: 'none' }}>
                        Mood Space
                        <span className="material-symbols-outlined text-sm">home</span>
                    </Link>
                </header>

                {/* Mobile Live Preview (Proportional Phone Frame) */}
                <main
                    className="flex-grow flex items-center justify-center relative overflow-hidden h-full pt-20 pb-24"
                    style={{ overscrollBehavior: 'none', touchAction: 'pan-y' }}
                    onClick={() => !isSheetOpen && setIsSheetOpen(true)}
                >
                    <div className="absolute inset-0 bg-surface-dim z-0 pointer-events-none"></div>

                    <div
                        className={`relative z-10 flex items-center justify-center w-full h-full px-4 pb-12 transition-transform duration-500 ${(isKeyboardVisible || (isSheetOpen && activeTab === 'content')) ? '-translate-y-48' : 'translate-y-0'}`}
                    >
                        <div className="w-full max-w-[360px] aspect-[9/19.5] max-h-[82vh] rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative bg-black">
                            {(!selectedTemplate || !rawHtml || isTemplateFetching) ? (
                                <div className="absolute inset-0 bg-surface/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
                                    {isTemplateFetching ? (
                                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
                                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-primary font-headline font-light tracking-widest text-sm">
                                                正在为您点亮星空...
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-5xl text-primary/40 mb-6 animate-pulse">edit_document</span>
                                            <span className="text-on-surface-variant font-light text-base tracking-widest leading-relaxed opacity-80">
                                                选择模板并输入文字<br />实时见证星空绽放
                                            </span>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <iframe
                                    ref={mobileIframeRef}
                                    srcDoc={previewBaseHtml}
                                    style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                                    title="Mobile Live Preview"
                                    className="absolute inset-0 z-0 bg-transparent"
                                />
                            )}
                        </div>
                    </div>
                </main>

                {/* Mobile Draggable Bottom Sheet */}
                <div
                    style={{
                        transform: isSheetPointerActive
                            ? (dragSheetWasOpen
                                ? `translateY(${Math.max(0, -sheetDragOffset)}px)`
                                : `translateY(calc(100% - ${SHEET_PEEK_PX}px - ${sheetDragOffset}px))`)
                            : undefined,
                        transition: isSheetPointerActive ? 'none' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        height: isKeyboardVisible ? '40vh' : '65vh',
                        overscrollBehavior: 'contain',
                        touchAction: 'pan-y',
                    }}
                    className={`fixed inset-x-0 bottom-0 z-40 bg-[#120f2f]/95 backdrop-blur-3xl rounded-t-[32px] shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/5 pt-1 flex flex-col transition-[height,transform]
                        ${!isSheetPointerActive && (isSheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-44px)]')}`}
                >
                    {/* Handle Bar (Draggable) — pointer capture + tap 在 pointerup 中区分，避免误触与点击双重切换 */}
                    <div
                        className="w-full py-4 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
                        onPointerDown={onSheetHandlePointerDown}
                        onPointerMove={onSheetHandlePointerMove}
                        onPointerUp={onSheetHandlePointerUp}
                        onPointerCancel={onSheetHandlePointerCancel}
                    >
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto shadow-sm"></div>
                    </div>

                    <div
                        className={`flex-1 overflow-y-auto custom-scrollbar px-6 ${activeTab === 'template' || activeTab === 'content' ? 'pb-44' : 'pb-32'}`}
                        style={{ overscrollBehaviorY: 'contain', WebkitOverflowScrolling: 'touch' }}
                    >
                        {activeTab === 'content' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <header className="flex justify-between items-center mb-6">
                                    <h3 className="font-headline text-2xl font-light text-on-surface">内容编辑</h3>
                                    <span className="material-symbols-outlined text-primary">edit_note</span>
                                </header>
                                {selectedTemplate && !selectedTemplate.static ? (
                                    <div className="space-y-6">
                                        {colorFieldKeys.length > 0 && (
                                            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 space-y-2">
                                                <div className="text-[10px] font-bold text-primary tracking-widest uppercase">整体配色</div>
                                                <p className="text-[10px] text-on-surface-variant/70 leading-relaxed">点选一套即可套用，全模板通用。</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {MOODSPACE_COLOR_PRESETS.map((preset) => (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => applyColorPresetToKeys(preset, colorFieldKeys, setFieldValues)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 bg-white/5 active:scale-[0.98]"
                                                        >
                                                            <span className="flex -space-x-1">
                                                                {preset.colors.map((c) => (
                                                                    <span key={c} className="w-3.5 h-3.5 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                                                                ))}
                                                            </span>
                                                            <span className="text-[11px] font-medium text-on-surface">{preset.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedTemplate.fields.map((f) => {
                                            const key = typeof f === 'string' ? f : (f.id || f.key);
                                            const label = typeof f === 'string' ? (FIELD_LABELS[f] || f) : (f.label || f.id || f.key);
                                            const displayLabel = sanitizeFieldLabel(label);
                                            const placeholder = typeof f === 'string'
                                                ? (`输入 ${FIELD_LABELS[f] || f}...`)
                                                : (f.placeholder || `输入 ${displayLabel}...`);
                                            const inputType = typeof f === 'string' ? 'textarea' : (f.type || 'text');
                                            const showImagePick = isImageUrlField(f) && inputType !== 'textarea' && key !== 'paragraphs';
                                            const jsonField = isJsonConfigField(f);
                                            const colorField = isColorHexField(f);

                                            return (
                                                <div className={`relative group ${focusedField === key && (showImagePick || colorField) ? 'rounded-xl ring-2 ring-primary/35 p-2 -mx-1' : ''}`} key={key}>
                                                    <label className="block text-[10px] text-primary tracking-widest uppercase mb-1 font-semibold">{displayLabel}</label>
                                                    {jsonField ? (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] text-on-surface-variant/60">按示例修改即可，无需了解技术词。</p>
                                                            <textarea
                                                                value={fieldValues[key] ?? ''}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                onFocus={(e) => {
                                                                    scrollToField(key);
                                                                    setFocusedField(key);
                                                                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                                                                }}
                                                                onBlur={() => setFocusedField(null)}
                                                                rows={6}
                                                                spellCheck={false}
                                                                placeholder={placeholder}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-on-surface focus:ring-0 focus:border-primary resize-y min-h-[120px]"
                                                            />
                                                        </div>
                                                    ) : key === 'paragraphs' || inputType === 'textarea' ? (
                                                        <textarea
                                                            value={fieldValues[key] ?? ''}
                                                            onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                            onFocus={(e) => {
                                                                scrollToField(key);
                                                                setFocusedField(key);
                                                                setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                                                            }}
                                                            onBlur={() => setFocusedField(null)}
                                                            className="w-full bg-transparent border-0 border-b-2 border-white/10 py-3 text-lg text-on-surface focus:ring-0 focus:border-primary transition-all resize-none"
                                                            rows="4"
                                                        />
                                                    ) : showImagePick ? (
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                value={fieldValues[key] ?? ''}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                onFocus={(e) => {
                                                                    scrollToField(key);
                                                                    setFocusedField(key);
                                                                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                                                                }}
                                                                onBlur={() => setFocusedField(null)}
                                                                placeholder={placeholder || '粘贴 HTTPS 图片链接'}
                                                                className="w-full bg-transparent border-0 border-b-2 border-white/10 py-3 text-lg text-on-surface focus:ring-0 focus:border-primary transition-all"
                                                            />
                                                            <label className="flex items-center justify-center w-full py-3 rounded-xl bg-primary/15 border border-primary/35 text-primary text-sm font-medium cursor-pointer active:scale-[0.98] transition-transform touch-manipulation">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="sr-only"
                                                                    onChange={async (ev) => {
                                                                        const file = ev.target.files?.[0];
                                                                        ev.target.value = '';
                                                                        await handleImageFilePick(key, file);
                                                                    }}
                                                                />
                                                                <span className="material-symbols-outlined text-lg mr-2">add_photo_alternate</span>
                                                                从相册选择图片
                                                            </label>
                                                            <p className="text-[10px] text-on-surface-variant/50 leading-relaxed">可粘贴图床链接，或上传本地图；上方预览会同步更新。</p>
                                                        </div>
                                                    ) : colorField ? (
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <input
                                                                type="color"
                                                                aria-label={displayLabel}
                                                                value={normalizeHexForPicker(fieldValues[key])}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                onFocus={(e) => {
                                                                    scrollToField(key);
                                                                    setFocusedField(key);
                                                                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                                                                }}
                                                                onBlur={() => setFocusedField(null)}
                                                                className="h-12 w-16 cursor-pointer rounded-xl border border-white/15 bg-white/5 p-1"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={fieldValues[key] ?? ''}
                                                                onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                                className="flex-1 min-w-[6rem] bg-transparent border-b-2 border-white/10 py-2 text-sm font-mono text-on-surface focus:border-primary focus:ring-0"
                                                                placeholder="#RRGGBB"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={fieldValues[key] ?? ''}
                                                            onChange={(e) => setFieldValues((p) => ({ ...p, [key]: e.target.value }))}
                                                            onFocus={(e) => {
                                                                scrollToField(key);
                                                                setFocusedField(key);
                                                                setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                                                            }}
                                                            onBlur={() => setFocusedField(null)}
                                                            className="w-full bg-transparent border-0 border-b-2 border-white/10 py-3 text-lg text-on-surface focus:ring-0 focus:border-primary transition-all"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <div className="pt-6 pb-2 space-y-3 border-t border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setActiveTab('publish');
                                                    setIsSheetOpen(true);
                                                }}
                                                className="w-full py-3.5 rounded-2xl border border-secondary/45 bg-secondary/15 text-secondary text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform touch-manipulation"
                                            >
                                                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                                下一步：发布
                                            </button>
                                            <p className="text-center text-[10px] text-on-surface-variant/55 leading-snug">
                                                也可点击屏幕最下方的「发布」标签
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-on-surface-variant font-light">
                                        请先在“模板”页选择一个主题
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'template' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <header className="flex justify-between items-center mb-6">
                                    <h3 className="font-headline text-2xl font-light text-on-surface">选择风格</h3>
                                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                                </header>
                                <div className="grid grid-cols-2 gap-4">
                                    {templates.map((t) => (
                                        <button
                                            key={t.name}
                                            type="button"
                                            onClick={() => handleMobileTemplateSelect(t)}
                                            onDoubleClick={(e) => {
                                                e.preventDefault();
                                                handleMobileTemplateDoubleClick();
                                            }}
                                            onTouchEnd={(e) => handleMobileTemplateTouchEnd(t, e)}
                                            className={`p-4 rounded-2xl border text-center transition-all touch-manipulation select-none ${selectedTemplate?.name === t.name ? 'border-primary bg-primary/10 text-primary shadow-lg' : 'border-white/5 bg-white/5 text-on-surface-variant'}`}
                                        >
                                            <div className="text-sm font-medium mb-1 truncate">{t.title || t.name}</div>
                                            <div className="text-[10px] opacity-50 uppercase tracking-tighter">{t.tier || 'Standard'}</div>
                                        </button>
                                    ))}
                                </div>

                                {selectedTemplate && (
                                    <div className="mt-8 space-y-4 pb-2">
                                        <p className="text-center text-[11px] text-on-surface-variant/85 leading-relaxed px-1">
                                            单击切换风格；<span className="text-primary font-medium">双击已选卡片</span>
                                            可快速进入「内容」编辑
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab('content');
                                                setIsSheetOpen(true);
                                                setHighlightContentNav(false);
                                            }}
                                            className="w-full py-3.5 rounded-2xl border border-primary/45 bg-primary/15 text-primary text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform touch-manipulation"
                                        >
                                            <span className="material-symbols-outlined text-lg">south</span>
                                            下一步：编辑内容
                                        </button>
                                        <p className="text-center text-[10px] text-on-surface-variant/55 leading-snug">
                                            也可点击屏幕最下方的「内容」标签继续
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'publish' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                                <header className="flex justify-between items-center mb-6">
                                    <h3 className="font-headline text-2xl font-light text-on-surface">发布</h3>
                                    <span className="material-symbols-outlined text-primary">rocket_launch</span>
                                </header>

                                {/* Merged Settings Section */}
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1 pr-4">
                                            <div className="text-sm font-medium">显示“制作同款”</div>
                                            <div className="text-[10px] text-on-surface-variant font-light mt-0.5">在页面底部加入精致的推广标签</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={showViralFooter}
                                                disabled={status?.allowHideFooter === false}
                                                onChange={(e) => setShowViralFooter(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <label className="block text-[10px] text-primary tracking-widest uppercase mb-1 font-semibold">项目备注名称</label>
                                        <input
                                            type="text"
                                            value={projectTitle}
                                            onChange={(e) => setProjectTitle(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-white/10 py-3 text-lg text-on-surface focus:ring-0 focus:border-primary"
                                            placeholder="起个名字（仅自己可见）"
                                        />
                                    </div>

                                    <div className="relative group">
                                        <label className="block text-[10px] text-primary tracking-widest uppercase mb-1 font-semibold">专属网址</label>
                                        <div className={`flex items-center gap-2 border-b-2 py-3 ${publishSubdomainError && !editSubdomain ? 'border-error/70' : 'border-white/10'}`}>
                                            <input
                                                type="text"
                                                value={subdomain}
                                                readOnly={!!editSubdomain}
                                                onChange={(e) => {
                                                    if (editSubdomain) return;
                                                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                                    setPublishSubdomainError('');
                                                }}
                                                className="flex-1 bg-transparent border-0 p-0 text-xl text-on-surface focus:ring-0"
                                                placeholder="xm-xh-520"
                                            />
                                            <span className="text-on-surface-variant text-sm font-light">.{BASE_DOMAIN}</span>
                                        </div>
                                        {publishSubdomainError && !editSubdomain && (
                                            <p className="text-sm text-error font-medium mt-2" role="alert">{publishSubdomainError}</p>
                                        )}
                                        {!editSubdomain && domainStatus !== 'idle' && (
                                            <div className={`text-[10px] mt-2 ${domainStatus === 'available' ? 'text-green-400' : 'text-error'}`}>
                                                {domainMsg}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || domainStatus === 'checking'}
                                    className="w-full py-5 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-xl shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? '正在生成宇宙...' : (editSubdomain ? '更新当前宇宙' : '点亮这片星空')}
                                </button>

                                {result && (
                                    <button
                                        onClick={() => setShowPoster(true)}
                                        className="w-full py-4 rounded-2xl border border-secondary/30 bg-secondary/10 text-secondary font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        <span className="material-symbols-outlined text-lg">image</span>
                                        生成分享海报
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Bottom Navigation Bar (Tab Bar) */}
                <nav className={`fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-3 bg-[#120f2f]/80 backdrop-blur-3xl rounded-t-[24px] shadow-[0_-20px_40px_rgba(0,0,0,0.4)] border-t border-white/5 transition-transform duration-500 will-change-transform
                    ${(!isSheetOpen || isKeyboardVisible) ? 'translate-y-full' : 'translate-y-0'}`}
                    style={{ transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                >
                    <button
                        onClick={() => { setActiveTab('template'); setIsSheetOpen(true); }}
                        className={`flex flex-col items-center justify-center p-2 px-6 rounded-2xl transition-all ${activeTab === 'template' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant/60'}`}
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'template' ? 1 : 0}` }}>auto_awesome</span>
                        <span className="text-[10px] tracking-wide uppercase mt-1">模板</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('content'); setIsSheetOpen(true); setHighlightContentNav(false); }}
                        className={`relative flex flex-col items-center justify-center p-2 px-6 rounded-2xl transition-all ${activeTab === 'content' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant/60'} ${highlightContentNav && activeTab === 'template' ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-[#120f2f] shadow-[0_0_18px_rgba(224,142,254,0.35)]' : ''}`}
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'content' ? 1 : 0}` }}>edit_note</span>
                        <span className="text-[10px] tracking-wide uppercase mt-1">内容</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('publish'); setIsSheetOpen(true); }}
                        className={`flex flex-col items-center justify-center p-2 px-6 rounded-2xl transition-all ${activeTab === 'publish' ? 'bg-primary/20 text-primary' : 'text-on-surface-variant/60'}`}
                    >
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${activeTab === 'publish' ? 1 : 0}` }}>rocket_launch</span>
                        <span className="text-[10px] tracking-wide uppercase mt-1">发布</span>
                    </button>
                </nav>
            </div>

            {/* Decorative Nebula Accents (Shared but hidden behind desktop/mobile sections) */}
            <div className="fixed top-1/4 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none z-[-1]"></div>
            <div className="fixed bottom-1/4 -left-24 w-80 h-80 bg-secondary/10 rounded-full blur-[100px] pointer-events-none z-[-1]"></div>
            {/* 发布前额度确认 — 提升付费与额度感知 */}
            {quotaModalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quota-modal-title"
                    onClick={(e) => { if (e.target === e.currentTarget && !loading) setQuotaModalOpen(false); }}
                >
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#120f2f]/95 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-6 md:p-8 text-on-surface max-h-[90dvh] overflow-y-auto custom-scrollbar">
                        <h2 id="quota-modal-title" className="text-lg md:text-xl font-headline font-semibold text-center mb-1">
                            发布前 · 额度一览
                        </h2>
                        <p className="text-[11px] md:text-xs text-on-surface-variant/85 text-center mb-6 leading-relaxed">
                            请确认当前套餐余量；继续操作将提交云端生成（更新会占用今日可修改次数等，以实际规则为准）
                        </p>

                        {status ? (
                            <>
                                <div className="space-y-4 mb-5">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden>
                                                <circle cx="32" cy="32" fill="transparent" r="28" stroke="#1e1a41" strokeWidth="5" />
                                                <circle
                                                    cx="32"
                                                    cy="32"
                                                    fill="transparent"
                                                    r="28"
                                                    stroke="url(#builderQuotaPrimary)"
                                                    strokeDasharray="175.93"
                                                    strokeDashoffset={175.93 - (175.93 * Math.min(1, (status.count ?? 0) / Math.max(1, status.maxDomains ?? 1)))}
                                                    strokeLinecap="round"
                                                    strokeWidth="5"
                                                />
                                                <defs>
                                                    <linearGradient id="builderQuotaPrimary" x1="0%" x2="100%" y1="0%" y2="100%">
                                                        <stop offset="0%" stopColor="#e08efe" />
                                                        <stop offset="100%" stopColor="#d180ef" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <span className="absolute text-[10px] font-headline font-bold flex items-baseline leading-none">
                                                <span>{status.count ?? 0}</span>
                                                <span className="text-[8px] text-on-surface-variant ml-0.5">/{status.maxDomains ?? 1}</span>
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">已创建空间</p>
                                            {status.inviteBonus > 0 && (
                                                <p className="text-[10px] text-primary-dim mt-0.5">邀请奖励 +{status.inviteBonus}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden>
                                                <circle cx="32" cy="32" fill="transparent" r="28" stroke="#1e1a41" strokeWidth="5" />
                                                <circle
                                                    cx="32"
                                                    cy="32"
                                                    fill="transparent"
                                                    r="28"
                                                    stroke="#9094fa"
                                                    strokeDasharray="175.93"
                                                    strokeDashoffset={175.93 - (175.93 * Math.min(1, (status.dailyUsedEdits ?? 0) / Math.max(1, status.maxDailyEdits ?? 1)))}
                                                    strokeLinecap="round"
                                                    strokeWidth="5"
                                                />
                                            </svg>
                                            <span className="absolute text-[10px] font-headline font-bold leading-none">
                                                {Math.round(((status.dailyUsedEdits ?? 0) / Math.max(1, status.maxDailyEdits ?? 1)) * 100)}%
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-on-surface">今日交互消耗</p>
                                            <p className="text-xs text-secondary mt-0.5">
                                                剩余 {Math.max(0, (status.maxDailyEdits ?? 0) - (status.dailyUsedEdits ?? 0))} 次修改
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] md:text-xs py-3 border-t border-white/10 mb-5">
                                    <span className="text-on-surface-variant">会员有效期</span>
                                    <span className="text-on-surface font-bold text-right">
                                        {profile?.subscription_expires_at
                                            ? (new Date(profile.subscription_expires_at) > new Date()
                                                ? `剩余 ${Math.ceil((new Date(profile.subscription_expires_at) - new Date()) / (1000 * 60 * 60 * 24))} 天`
                                                : '已到期')
                                            : '永久有效 (体验)'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-sm text-on-surface-variant py-6 mb-2">正在同步额度信息…</p>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => void executeRenderSubmit()}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editSubdomain ? '确认更新' : '确认发布'}
                            </button>
                            <Link
                                to="/upgrade"
                                className="block w-full py-3 rounded-2xl border border-secondary/40 bg-secondary/10 text-secondary text-center text-sm font-semibold hover:bg-secondary/20 transition-colors"
                                onClick={() => setQuotaModalOpen(false)}
                            >
                                升级套餐 · 提升额度
                            </Link>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => setQuotaModalOpen(false)}
                                className="text-on-surface-variant/80 text-sm py-2 hover:text-on-surface transition-colors"
                            >
                                稍后再说
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Poster Modal */}
            <PosterModal
                isOpen={showPoster}
                onClose={() => setShowPoster(false)}
                projectUrl={result?.url}
                title={projectTitle || '未命名网页'}
                templateTitle={selectedTemplate?.title || selectedTemplate?.name}
                rawHtml={rawHtml}
            />
        </div>
    );
}

