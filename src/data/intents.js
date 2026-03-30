export const INTENT_DATA = {
    joy: {
        title: "把这份藏不住的喜悦，分享给全世界",
        subtitle: "开心的时候，你想和谁一起庆祝？",
        categoryLabel: "满心欢喜",
        icon: "sentiment_very_satisfied",
        options: [
            { id: 'send_to_them', text: "遥寄给 TA", helper: "包成一份电子礼物，让 TA 打开时也在这头微笑" },
            { id: 'self_record', text: "留给未来的自己", helper: "把今天的高光捏碎了撒在日记里，做成时光胶囊" },
            { id: 'celebrate', text: "一场盛大的纪念", helper: "给平凡的日子打上一个专属的烟花烙印" },
            { id: 'share', text: "把快乐公之于众", helper: "不用藏着掖着，让所有人感受这满溢的喜悦" },
            { id: 'duo_space', text: "你我共建的岛屿", helper: "打造一个只有我们两个人能看到的秘密基地" },
            { id: 'explore', text: "先四处逛逛看", helper: "没有特定的目的地，只是想寻找一点意外之喜" }
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
        title: "关于你的心事，我想慢慢说给你听",
        subtitle: "爱意汹涌时，你需要一个安静的角落吗？",
        categoryLabel: "深情告白",
        icon: "favorite",
        options: [
            { id: 'send_to_them', text: "一封未寄出的信", helper: "那些当面说不出口的爱意，用网页慢慢讲给 TA 听" },
            { id: 'self_record', text: "心动频率日记", helper: "悄悄记录下每一次想念的震颤，这是专属我的小秘密" },
            { id: 'celebrate', text: "值得铭记的那一天", helper: "那些重要的纪念日，需要一场仪式满满的记录" },
            { id: 'share', text: "定格我们的浪漫", helper: "向世界展示属于我们的默契，把恩爱秀得有质感一点" },
            { id: 'duo_space', text: "搭建只属于咱俩的窝", helper: "门外是喧嚣的数字世界，门内是咱们的私人自留地" },
            { id: 'explore', text: "看看别人怎么说爱", helper: "寻找一些灵感，看看哪种浪漫最匹配现在的心境" }
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
        title: "如果时光能倒流，我想对你说声抱歉",
        subtitle: "那些说不出口的遗憾，交给我们来传递吧。",
        categoryLabel: "心生歉意",
        icon: "sentiment_dissatisfied",
        options: [
            { id: 'send_to_them', text: "其实，对不起", helper: "用最无声却饱含重量的方式，递去一张求和解的书签" },
            { id: 'repair', text: "重建沟通的桥梁", helper: "给彼此一个重归于好的阶梯，把裂痕填上温润的颜色" },
            { id: 'self_record', text: "一场自我审视", helper: "直面不够完美的自己，把这次反思写下来避免重蹈覆辙" },
            { id: 'self_heal', text: "拥抱内心的刺", helper: "别太责备自己了，找个安静的角落舔舐伤口重新出发" },
            { id: 'explore', text: "寻找温和的解法", helper: "不妨看看别人是如何化解这种沉重尴尬的" }
        ],
        templates: [
            { id: 'oriental_poetry_and_painting_love_letter', name: '古韵诗画', icon: 'brush', desc: '静谧的笔墨，最适合传递和解的心意。', color: 'tertiary' },
            { id: 'daily_encouragement', name: '每日打气筒', icon: 'lightbulb', desc: '与其深陷自责，不如尝试一点点改变。', color: 'secondary' }
        ]
    },
    sadness: {
        title: "有些故事结束了，但记忆永远鲜活",
        subtitle: "在这里生一团小火，温暖那些泛黄的往事。",
        categoryLabel: "往事拾遗",
        icon: "auto_stories",
        options: [
            { id: 'send_to_them', text: "最后的郑重道别", helper: "如果不适合再说再见，那就留下一段未完待续的休止符" },
            { id: 'self_record', text: "珍藏那些碎影", helper: "把破碎剥离的美好单独捡起来，放入时间缝隙里" },
            { id: 'self_heal', text: "任情绪倾盆而下", helper: "在这里，你可以彻底卸下伪装，大哭一场也没关系" },
            { id: 'share', text: "祭奠一段往昔", helper: "为已经消散的那些光阴，举行一场属于文字和光影的哀悼" },
            { id: 'explore', text: "在空白里找出口", helper: "漫无目的地走走，或许慢节奏的治愈系能抚平一些折痕" }
        ],
        templates: [
            { id: 'film_memory_wallv', name: '复古影音墙', icon: 'movie', desc: '泛黄的胶片，记录隽永的记忆。', color: 'primary' },
            { id: 'emotion_tree_hole', name: '情绪树洞', icon: 'nature', desc: '有些不能说的秘密，就让它在这里生根发芽。', color: 'primary' }
        ]
    },
    stress: {
        title: "累了就来这里歇会儿，没关系的",
        subtitle: "把烦恼都倒进树洞，然后轻装上阵。",
        categoryLabel: "压力树洞",
        icon: "nest_eco_leaf",
        options: [
            { id: 'self_heal', text: "一场心灵的深呼吸", helper: "把紧绷的神经解开，跟着缓慢的节拍让情绪像云一样散开" },
            { id: 'self_record', text: "把烦恼通通关起来", helper: "把焦虑倒出来敲击进网页里，然后利落地点击关闭" },
            { id: 'share', text: "你在听，对吗？", helper: "向外输出压力，或许能在平行时空遇见那个懂你的同频人" },
            { id: 'explore', text: "什么都不想干", helper: "太累了，先不思考，在这片没有压力的海域里随便飘一会儿吧" }
        ],
        templates: [
            { id: 'self_care_room', name: '自愈小站', icon: 'self_care', desc: '伴随节拍，让情绪彻底放松。', color: 'primary' },
            { id: 'emotion_tree_hole', name: '情绪树洞', icon: 'nature', desc: '在极简的空白中，给紧绷的神经透透气。', color: 'primary' }
        ]
    },
    calm: {
        title: "生活在按自己的节奏，安静地流淌",
        subtitle: "泡一杯茶的功夫，你想留住什么瞬间？",
        categoryLabel: "岁月静好",
        icon: "spa",
        options: [
            { id: 'send_to_them', text: "顺水推舟的感激", helper: "向那个曾在黑暗中帮你掌灯的人，道一声久违的谢谢" },
            { id: 'self_record', text: "素描寻常日子", helper: "记下厨房里的烟火或落叶的微风，它们才是生活的底色" },
            { id: 'celebrate', text: "一杯茶的仪式感", helper: "没有什么大起大落，平平淡淡本来就值得神圣纪念" },
            { id: 'share', text: "传递这阵宁静的风", helper: "不需要激昂，把这份闲适安逸的温度分享给懂生活的人" },
            { id: 'explore', text: "寻找更极简的白", helper: "去看看还有哪些通透干净的版式，能衬得上这份无欲无求" }
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
        title: "漫无目的，也是一种最好的方向",
        subtitle: "没什么特别安排？那就四处走走看看吧。",
        categoryLabel: "随便逛逛",
        icon: "explore",
        options: [
            { id: 'explore', text: "随便走走停停", helper: "不预设情感流派，哪一张封面图顺眼，故事就从哪儿开始" }
        ],
        templates: []
    }
};
