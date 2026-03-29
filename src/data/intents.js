export const INTENT_DATA = {
    joy: {
        title: "有些快乐，就该这样分享",
        subtitle: "这份喜悦，你打算如何安放？",
        categoryLabel: "开心 / 喜悦",
        icon: "sentiment_very_satisfied",
        options: [
            { id: 'send_to_them', text: "发送给TA", helper: "想把这份满溢的快乐，原封不动地传递给TA" },
            { id: 'self_record', text: "记录自我", helper: "把此刻的灿烂写进日记，奖励未来的自己" },
            { id: 'celebrate', text: "庆祝 / 纪念", helper: "标记这个时刻，让它在平淡生活中闪闪发光" },
            { id: 'share', text: "分享 / 展示", helper: "整理成精美页面，在社交平台上展示给所有人" },
            { id: 'duo_space', text: "双人空间", helper: "属于我们两个人的秘密成就与快乐" },
            { id: 'explore', text: "探索模式", helper: "不想预设意图，先去看看有哪些有趣的模板" }
        ],
        templates: [
            { id: 'anniversary', name: '周年纪念帖', icon: 'favorite', desc: '每一个值得纪念的日子，都应被温柔记起。', color: 'secondary' },
            { id: 'city_trace_map', name: '城市足迹地图', icon: 'map', desc: '在这座城市，写下我们的专属地图。', color: 'tertiary' },
            { id: 'daily_encouragement', name: '每日打气筒', icon: 'lightbulb', desc: '给自己的一份元气补给站。', color: 'secondary' },
            { id: 'film_memory_wallv', name: '复古影音墙', icon: 'movie', desc: '让回忆像老胶卷一样缓缓流淌。', color: 'primary' },
            { id: 'game_achievement', name: '游戏成就达成', icon: 'sports_esports', desc: '恭喜！达成这一项人生专属成就。', color: 'secondary' },
            { id: 'relationship_booster', name: '感情助推器', icon: 'rocket_launch', desc: '注入新鲜感，让感情持续升温。', color: 'secondary' },
            { id: 'special_moments', name: '精彩瞬间', icon: 'photo_camera', desc: '捕捉生活中的高光时刻。', color: 'tertiary' }
        ]
    },
    love: {
        title: "最深的情感，最美的表达",
        subtitle: "你心里的那份爱，现在是什么频率？",
        categoryLabel: "爱 / 想念",
        icon: "favorite",
        options: [
            { id: 'send_to_them', text: "发送给TA", helper: "写给TA的一封信，有些话不便当面开口" },
            { id: 'self_record', text: "记录自我", helper: "记录下爱意萌动的瞬间，这是属于我的秘密" },
            { id: 'celebrate', text: "庆祝 / 纪念", helper: "属于我们的专属周年，值得最深刻的纪念" },
            { id: 'share', text: "分享 / 展示", helper: "向世界展示我们的浪漫故事" },
            { id: 'duo_space', text: "双人空间", helper: "在这个私密空间里，只留下我们的足迹" },
            { id: 'explore', text: "探索模式", helper: "寻觅更多表达爱意的新奇方式" }
        ],
        templates: [
            { id: 'starry_confession', name: '星空告白', icon: 'auto_awesome', desc: '星空下的告白，最极致浪漫。', color: 'primary' },
            { id: 'love_letter', name: '纸间情书', icon: 'favorite', desc: '字字句句，皆是少年意气。', color: 'secondary' },
            { id: 'cyber_confession_neon', name: '赛博告白', icon: 'bolt', desc: '赛博朋克风格的直白心意表达。', color: 'primary' },
            { id: 'endless_romance', name: '无尽浪漫', icon: 'infinite', desc: '关于浪漫，我们有无尽的想象。', color: 'secondary' },
            { id: 'father_love', name: '父爱如山', icon: 'man', desc: '有些爱不必开口，沉默即是重若千钧。', color: 'tertiary' },
            { id: 'magic_contract', name: '魔法爱情契约', icon: 'auto_awesome', desc: '在此立约，共同开启一段奇幻旅程。', color: 'primary' },
            { id: 'oriental_poetry_and_painting_love_letter', name: '古韵诗画', icon: 'brush', desc: '笔墨书香中，藏着对你的思念。', color: 'tertiary' },
            { id: 'anniversary', name: '周年纪念帖', icon: 'favorite', desc: '每一个值得纪念的日子，都应被温柔记起。', color: 'secondary' },
            { id: 'special_moments', name: '精彩瞬间', icon: 'photo_camera', desc: '捕捉生活中的高光时刻。', color: 'tertiary' },
            { id: 'relationship_booster', name: '感情助推器', icon: 'rocket_launch', desc: '注入新鲜感，让感情持续升温。', color: 'secondary' }
        ]
    },
    guilt: {
        title: "所有的裂痕，都是光照进来的地方",
        subtitle: "想打破僵局，或许只需要一点点勇气。",
        categoryLabel: "愧疚 / 道歉",
        icon: "sentiment_dissatisfied",
        options: [
            { id: 'send_to_them', text: "发送给TA", helper: "通过一个安静的页面，传递没能说出的对不起" },
            { id: 'repair', text: "沟通 / 修复", helper: "希望能重申我的心意，给彼此一个和好的台阶" },
            { id: 'self_record', text: "记录自我", helper: "记录下这次反思，以免在未来再次犯错" },
            { id: 'self_heal', text: "自我疗愈", helper: "原谅那个不够完美的自己，重新出发" },
            { id: 'explore', text: "探索模式", helper: "看看有没有更温和的方式，能化解此刻的尴尬" }
        ],
        templates: [
            { id: 'oriental_poetry_and_painting_love_letter', name: '古韵诗画', icon: 'brush', desc: '静谧的笔墨，最适合传递和解的心意。', color: 'tertiary' },
            { id: 'daily_encouragement', name: '每日打气筒', icon: 'lightbulb', desc: '与其深陷自责，不如尝试一点点改变。', color: 'secondary' }
        ]
    },
    sadness: {
        title: "每一段回忆，都有它的重量",
        subtitle: "有些离别，是为了更好的怀念。",
        categoryLabel: "伤感 / 回忆",
        icon: "auto_stories",
        options: [
            { id: 'send_to_them', text: "发送给TA", helper: "最后的郑重道别，或者一段未完待续的回音" },
            { id: 'self_record', text: "记录自我", helper: "珍藏那些美好的碎影，作为日后成长的慰藉" },
            { id: 'self_heal', text: "自我疗愈", helper: "释放积压的情绪，在这片空间里彻底倾诉" },
            { id: 'share', text: "分享 / 展示", helper: "祭奠一段情感，或者对往昔时光的一场致敬" },
            { id: 'explore', text: "探索模式", helper: "在慢节奏的模板中，给情绪找一个出口" }
        ],
        templates: [
            { id: 'film_memory_wallv', name: '复古影音墙', icon: 'movie', desc: '泛黄的胶片，记录隽永的记忆。', color: 'primary' },
            { id: 'emotion_tree_hole', name: '情绪树洞', icon: 'nature', desc: '有些不能说的秘密，就让它在这里生根发芽。', color: 'primary' }
        ]
    },
    stress: {
        title: "慢下来，给心灵一个出口",
        subtitle: "压力很大的时候，这里是你的秘密港湾。",
        categoryLabel: "压力 / 焦虑",
        icon: "nest_eco_leaf",
        options: [
            { id: 'self_heal', text: "自我疗愈", helper: "通过文字将焦虑转化为平静，找回对生活的掌控感" },
            { id: 'self_record', text: "记录自我", helper: "把烦恼都写下来，然后通通关在网页里" },
            { id: 'share', text: "分享 / 展示", helper: "输出你的压力，或许能遇到同频共鸣的人" },
            { id: 'explore', text: "探索模式", helper: "不想思考，只想随便逛逛，找点治愈的感觉" }
        ],
        templates: [
            { id: 'self_care_room', name: '自愈小站', icon: 'self_care', desc: '伴随节拍，让情绪彻底放松。', color: 'primary' },
            { id: 'emotion_tree_hole', name: '情绪树洞', icon: 'nature', desc: '在极简的空白中，给紧绷的神经透透气。', color: 'primary' }
        ]
    },
    calm: {
        title: "于平淡中，发现温暖的力量",
        subtitle: "心境平和的时候，你想记录些什么？",
        categoryLabel: "平静 / 感谢",
        icon: "spa",
        options: [
            { id: 'send_to_them', text: "发送给TA", helper: "向曾经给予过帮助的TA，道一声久违的感谢" },
            { id: 'self_record', text: "记录自我", helper: "记下那些微小的美好，它们构成了生活的底色" },
            { id: 'celebrate', text: "庆祝 / 纪念", helper: "简单而神圣地纪念此刻的内心平和" },
            { id: 'share', text: "分享 / 展示", helper: "分享一种宁静的生活态度，传递正向能量" },
            { id: 'explore', text: "探索模式", helper: "看看还有哪些极简风格，能衬托当下的心境" }
        ],
        templates: [
            { id: 'city_trace_map', name: '城市足迹地图', icon: 'map', desc: '每一段路，都代表一个感恩的瞬间。', color: 'tertiary' },
            { id: 'self_care_room', name: '自愈小站', icon: 'self_care', desc: '平和的心境，简单的表达。', color: 'primary' },
            { id: 'daily_encouragement', name: '每日打气筒', icon: 'lightbulb', desc: '记录下今日份的小确幸。', color: 'secondary' },
            { id: 'father_love', name: '父爱如山', icon: 'man', desc: '在深切的安稳中，感受岁月的馈赠。', color: 'tertiary' },
            { id: 'oriental_poetry_and_painting_love_letter', name: '古韵诗画', icon: 'brush', desc: '笔墨书香中，藏着对生活的淡定坦然。', color: 'tertiary' }
        ]
    },
    neutral: {
        title: "开始一段，未定义的旅程",
        subtitle: "不确定要去向何方？让我们先看看风景。",
        categoryLabel: "探索 / 空白",
        icon: "explore",
        options: [
            { id: 'explore', text: "探索模式", helper: "直接前往模板大厅，挑选你第一眼心动的风格" }
        ],
        templates: []
    }
};

