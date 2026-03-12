import { Link } from 'react-router-dom';

const FEATURES = [
    { icon: '🎨', title: '精美网页款式', desc: '多款专业设计的浪漫主题网页，精心调配配色与动效，开箱即用。' },
    { icon: '⚡', title: '即时生成', desc: '填写内容后秒速生成专属网页，附赠属于你们的专属独立网址。' },
    { icon: '🚀', title: '极速访问', desc: '采用全球极速网络，情意传递零延迟，世界任意角落均可秒开。' },
    { icon: '🔒', title: '安全可靠', desc: '全程加密保护隐私，数据永久存于云端，随时随地重温美好。' },
];

export default function Home() {
    return (
        <>
            <section className="hero">
                <span className="hero__emoji">💕</span>
                <h1 className="hero__title">
                    打造你的<span>专属浪漫网页</span>
                </h1>
                <p className="hero__sub">
                    选择心仪模板，填入你们之间的故事，一键生成专属链接——送给最重要的那个人。
                </p>
                <div className="hero__actions">
                    <Link to="/gallery" className="btn btn--primary">挑选心仪款式 →</Link>
                    <Link to="/builder" className="btn btn--outline">立即制作网页</Link>
                </div>
            </section>

            <section className="page container">
                <div className="grid">
                    {FEATURES.map((f) => (
                        <div className="card" key={f.title}>
                            <span className="feature-icon">{f.icon}</span>
                            <p className="feature-title">{f.title}</p>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
