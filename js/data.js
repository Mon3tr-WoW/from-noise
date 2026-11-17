window.DATA = {
  gallery: [
    [87483506, "matasvolkovas350", 3678], [92503923, "TurinBjorn", 3460], [96506155, "ArtistIA", 3186],
    [95334425, "Chumple", 3108], [62464358, "Meower2024", 3062], [88383742, "2018cfh", 2981],
    [67509992, "Titan_Uranus", 2929], [89964690, "Silvana_", 2898], [74972532, "WAI0731", 2780],
    [67297280, "MLGnom", 2730], [67176198, "Titan_Uranus", 2676], [98146039, "Silvana_", 2503],
    [75885517, "Yurooo", 2445], [67336637, "kastakanin", 2422], [103997139, "akizukirei608", 2405],
    [97014615, "koonbai", 2395], [97626518, "WAI0731", 2377], [37216672, "Lorim", 2218],
    [67296612, "Pinkielicious", 2139], [74972537, "WAI0731", 2090], [103497889, "Caocao777", 2087],
    [50942809, "Unstable_Specularity", 1972], [103599474, "EROOJIN", 1907], [103819574, "akizukirei608", 1874],
    [95753049, "klaabu", 1811], [98978470, "WAI0731", 1005], [46218912, "openmn793", 991],
    [68377234, "DigitalPastel", 940], [127249558, "mommymia", 930], [111398446, "Z3R0_Q80", 880],
    [107923690, "Silvana_", 778], [114195099, "Z3R0_Q80", 767], [109334091, "Oskarjasz", 752],
    [51712786, "bolero537", 718], [116949946, "Z3R0_Q80", 714], [63747707, "witcherhannibal", 652],
    [42381103, "jeromusxander", 558], [45102935, "Lithex", 545], [112120297, "Z3R0_Q80", 542],
    [112145048, "Its4me", 534], [79583479, "Deto15", 493], [145232020, "darkseadra", 469],
    [145232022, "darkseadra", 457], [109899247, "AppleBlossom88", 445]
  ].map(([id, user, hearts]) => ({ id, user, hearts, src: `assets/gallery/g${id}.jpg` })),

  themes: [
    {
      no: "01", cn: "繁樱戏春", en: "SAKURA FROLIC", season: "SPRING", layout: "split", mode: "light",
      fx: "petal", c1: "#ff8fb1", c2: "#ffe3ec", ink: "#4a1f2c", imgs: ["w01_1", "w01_2"],
      tags: ["cherry blossoms", "park path", "wind", "petals", "lens flare"],
      line: "樱花落下的速度，好像是每秒五厘米？……那我走慢一点，等等它们。",
      note: "春天的第一套时装。用大量逆光光斑与飘落花瓣营造“风”的感觉，裙摆做成层叠的红色绸带。"
    },
    {
      no: "02", cn: "夏日浪花", en: "SUMMER SPLASH", season: "SUMMER", layout: "split", mode: "light",
      fx: "bubble", c1: "#19b9e6", c2: "#e4f8ff", ink: "#08364a", imgs: ["w02_1", "w02_2"],
      tags: ["beach", "splash", "jumping", "sunlight", "blue sky"],
      line: "浪花溅到脸上了！……嘿嘿，再来一次！",
      note: "跃起的瞬间对动态要求很高：发丝、水花和身体姿态都要“同时”自然，这是 AI 出图最容易翻车的地方。"
    },
    {
      no: "03", cn: "秋枫荡漾", en: "MAPLE RIPPLE", season: "AUTUMN", layout: "split", mode: "dark",
      fx: "leaf", c1: "#ff7a2f", c2: "#2a160c", ink: "#ffe2c8", imgs: ["w03_1", "w03_2"],
      tags: ["autumn forest", "maple leaves", "pumpkins", "sweater", "harvest"],
      line: "这一篮橘子是今天的收获——要来一个吗？",
      note: "第一次尝试“日常感”——毛衣、牛仔裤和丰收的南瓜，让角色从“设定”走进生活。"
    },
    {
      no: "04", cn: "寒冬初雪", en: "FIRST SNOW", season: "WINTER", layout: "split", mode: "dark",
      fx: "snow", c1: "#9fd4ff", c2: "#0d1a2e", ink: "#e8f4ff", imgs: ["w04_1", "w04_2"],
      tags: ["snowy night", "coat", "hot cocoa", "street lamp", "breath"],
      line: "今年的第一场雪……手里的可可还是热的，分你一半。",
      note: "夜景 + 暖光是经典组合：冷色背景把角色身上的红色衬得更醒目。"
    },
    {
      no: "05", cn: "幻月狐嫁", en: "KITSUNE WEDDING", season: "LEGEND", layout: "poster", mode: "dark",
      fx: "lantern", c1: "#ff4d3d", c2: "#140a12", ink: "#ffe9c9", imgs: ["w05_1", "w05_2"],
      tags: ["fox ears", "paper lanterns", "full moon", "shrine", "fox fire"],
      line: "狐狸出嫁的夜晚，灯笼会一直亮到天明。别回头哦。",
      note: "取材自“狐の嫁入り”的民间传说。竖排文字与灯笼的暖光是这一套的灵魂。"
    },
    {
      no: "06", cn: "蔷薇信条", en: "ROSE CREED", season: "GOTHIC", layout: "poster", mode: "dark",
      fx: "rose", c1: "#c4123a", c2: "#0b0507", ink: "#f3e6e6", imgs: ["w06_1", "w06_2"],
      tags: ["gothic cathedral", "candles", "black cape", "roses", "stained glass"],
      line: "蔷薇以荆棘立誓。今夜，我是这座圣堂唯一的守夜人。",
      note: "哥特教堂 + 烛光 + 黑色披风：把角色的红色压暗，只留蔷薇作为高光。"
    },
    {
      no: "07", cn: "水晶玫瑰", en: "CRYSTAL ROSE", season: "DREAM", layout: "poster", mode: "light",
      fx: "sparkle", c1: "#c77dff", c2: "#fbf3ff", ink: "#3a1d4f", imgs: ["w07_1", "w07_2", "w07_3"],
      tags: ["crystal rose", "white frills", "sparkles", "pastel", "dreamy light"],
      line: "这朵玫瑰永远不会凋谢——因为它是用星光做的。",
      note: "全系列唯一有三张图的主题：同一套设定下，换一个随机种子就是完全不同的姿势与构图。"
    },
    {
      no: "08", cn: "赛博霓虹", en: "CYBER NEON", season: "2077", layout: "hud", mode: "dark",
      fx: "rain", c1: "#ff2bd6", c2: "#06050f", ink: "#e9fbff", c3: "#22f0ff", imgs: ["w08_1", "w08_2"],
      tags: ["neon city", "night street", "holograms", "rain", "reflections"],
      line: "> 连接建立。欢迎来到霓虹之下，旅行者。",
      note: "霓虹 + 雨夜地面反射，是赛博朋克题材最容易出效果的组合。"
    },
    {
      no: "09", cn: "星海晚宴", en: "STARSEA BANQUET", season: "COSMOS", layout: "hud", mode: "dark",
      fx: "star", c1: "#ffd36b", c2: "#050a1f", ink: "#eef2ff", c3: "#6a8bff", imgs: ["w09_1", "w09_2"],
      tags: ["galaxy", "planets", "evening dress", "starlight", "floating"],
      line: "今晚的晚宴在银河边上举行。请——你的座位在第三颗星星旁边。",
      note: "宇宙背景很容易“糊成一团”。小技巧：用负面提示词压住杂乱噪点，星球的轮廓才会清晰。"
    },
    {
      no: "10", cn: "午后红茶", en: "AFTERNOON TEA", season: "LEISURE", layout: "letter", mode: "light",
      fx: "steam", c1: "#b5523b", c2: "#f7eee2", ink: "#3b2a20", imgs: ["w10_1", "w10_2"],
      tags: ["afternoon tea", "parasol", "cake stand", "garden terrace", "lace"],
      line: "红茶要配司康饼。今天就不聊工作了，好吗？",
      note: "最后一套是“休息日”。暖色调、甜点塔和阳伞，让整个系列在安静中收尾。"
    }
  ]
};
