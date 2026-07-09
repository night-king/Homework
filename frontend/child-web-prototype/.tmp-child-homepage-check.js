    const weekData = [
      {
        key: "mon",
        label: "一",
        fullLabel: "周一",
        date: "07/07",
        restDay: false,
        tasks: [
          { id: "m1", subject: "math", subjectLabel: "数学", title: "口算 20 分钟", time: "20 分钟", reward: "能量果实", copy: "快速热身，先把今天的大脑点亮。", done: true },
          { id: "m2", subject: "chinese", subjectLabel: "语文", title: "背古诗 1 首", time: "15 分钟", reward: "勇气麦片", copy: "读顺、背顺，挑战一气呵成。", done: false },
          { id: "m3", subject: "english", subjectLabel: "英语", title: "英语听读", time: "18 分钟", reward: "闪光浆果", copy: "边听边读，清楚地说出来。", done: false }
        ]
      },
      {
        key: "tue",
        label: "二",
        fullLabel: "周二",
        date: "07/08",
        restDay: false,
        tasks: [
          { id: "t1", subject: "chinese", subjectLabel: "语文", title: "写生字 2 行", time: "15 分钟", reward: "字形糖块", copy: "动作稳一点，字也会更漂亮。", done: true },
          { id: "t2", subject: "math", subjectLabel: "数学", title: "应用题 3 道", time: "25 分钟", reward: "解题矿石", copy: "先读题，再动笔，一题一题拿下。", done: true },
          { id: "t3", subject: "reading", subjectLabel: "阅读", title: "自由阅读", time: "20 分钟", reward: "故事饼干", copy: "这是今天的放松委托，也算成长值。", done: false }
        ]
      },
      {
        key: "wed",
        label: "三",
        fullLabel: "周三",
        date: "07/09",
        restDay: false,
        tasks: [
          { id: "w1", subject: "math", subjectLabel: "数学", title: "数学作业本", time: "25 分钟", reward: "冲锋饭团", copy: "今天的主任务，先做也行，后做也行。", done: false },
          { id: "w2", subject: "english", subjectLabel: "英语", title: "单词 10 个", time: "15 分钟", reward: "音节晶体", copy: "读、拼、再回忆一遍。", done: false },
          { id: "w3", subject: "reading", subjectLabel: "阅读", title: "课外书 20 分钟", time: "20 分钟", reward: "星火书签", copy: "给今天的冒险收个温柔尾。", done: false },
          { id: "w4", subject: "chinese", subjectLabel: "语文", title: "朗读课文", time: "12 分钟", reward: "共鸣号角", copy: "声音响亮，就是今天的勇气证明。", done: false }
        ]
      },
      {
        key: "thu",
        label: "四",
        fullLabel: "周四",
        date: "07/10",
        restDay: false,
        tasks: [
          { id: "h1", subject: "chinese", subjectLabel: "语文", title: "作文草稿", time: "30 分钟", reward: "灵感羽毛", copy: "先写出来，再慢慢改。", done: false },
          { id: "h2", subject: "math", subjectLabel: "数学", title: "口算复盘", time: "15 分钟", reward: "速算金币", copy: "今天的短平快冲刺。", done: false },
          { id: "h3", subject: "english", subjectLabel: "英语", title: "跟读一段对话", time: "15 分钟", reward: "回声果冻", copy: "像冒险者练口令一样练一遍。", done: false }
        ]
      },
      {
        key: "fri",
        label: "五",
        fullLabel: "周五",
        date: "07/11",
        restDay: false,
        tasks: [
          { id: "f1", subject: "math", subjectLabel: "数学", title: "周测订正", time: "20 分钟", reward: "修复扳手", copy: "把错误修好，也是一种升级。", done: false },
          { id: "f2", subject: "reading", subjectLabel: "阅读", title: "阅读打卡", time: "20 分钟", reward: "故事糖星", copy: "周五的轻任务，适合先开局。", done: false }
        ]
      },
      {
        key: "sat",
        label: "六",
        fullLabel: "周六",
        date: "07/12",
        restDay: false,
        tasks: [
          { id: "s1", subject: "reading", subjectLabel: "阅读", title: "亲子阅读", time: "20 分钟", reward: "合作点心", copy: "这是和家长一起完成的合作委托。", done: false },
          { id: "s2", subject: "english", subjectLabel: "英语", title: "听力打卡", time: "15 分钟", reward: "风速晶球", copy: "轻量挑战，适合周末节奏。", done: false }
        ]
      },
      {
        key: "sun",
        label: "日",
        fullLabel: "周日",
        date: "07/13",
        restDay: true,
        tasks: []
      }
    ];

    weekData.forEach((day) => {
      day.crystalAwarded = day.restDay || (day.tasks.length > 0 && day.tasks.every((task) => task.done));
    });

    const petStages = [
      {
        level: 1,
        name: "焰团幼龙",
        description: "火团一样圆滚滚的启程伙伴",
        unlockElement: "fire",
        nextGrowth: 36,
        nextCrystals: 1
      },
      {
        level: 2,
        name: "迅爪少龙",
        description: "拉长身形、随时准备冲刺",
        unlockElement: "water",
        nextGrowth: 68,
        nextCrystals: 2
      },
      {
        level: 3,
        name: "展翼飞龙",
        description: "第一次真正张开双翼升空",
        unlockElement: "wood",
        nextGrowth: 84,
        nextCrystals: 3
      },
      {
        level: 4,
        name: "重甲守护龙",
        description: "胸甲与护臂都进入守护形态",
        unlockElement: "earth",
        nextGrowth: 100,
        nextCrystals: 4
      },
      {
        level: 5,
        name: "圣冠龙王",
        description: "加冕后的终局守护圣龙",
        unlockElement: "metal",
        nextGrowth: null,
        nextCrystals: null
      }
    ];

    const elementOrder = ["fire", "water", "wood", "earth", "metal"];

    const elementMeta = {
      fire: {
        key: "fire",
        name: "火系",
        coreLabel: "火系核心",
        activeCue: "火系激活",
        unlockStage: 1
      },
      water: {
        key: "water",
        name: "水系",
        coreLabel: "水系核心",
        activeCue: "水系激活",
        unlockStage: 2
      },
      wood: {
        key: "wood",
        name: "木系",
        coreLabel: "木系核心",
        activeCue: "木系激活",
        unlockStage: 3
      },
      earth: {
        key: "earth",
        name: "土系",
        coreLabel: "土系核心",
        activeCue: "土系激活",
        unlockStage: 4
      },
      metal: {
        key: "metal",
        name: "金系",
        coreLabel: "金系核心",
        activeCue: "金系激活",
        unlockStage: 5
      }
    };

    const state = {
      selectedIndex: 2,
      rewardQueue: ["\u7559\u5B58\u679C\u5B9E"],
      growth: 58,
      level: 2,
      activeElement: "fire",
      unlockedElements: ["fire", "water"],
      streak: 4,
      crystals: 1,
      lastReward: "\u6628\u5929\u7559\u4E0B\u4E00\u4EFD\u8865\u7ED9",
      lastFeed: "",
      petMode: "idle"
    };

    const todayIndex = 2;

    const dayStrip = document.getElementById("dayStrip");
    const selectedDayLabel = document.getElementById("selectedDayLabel");
    const profileSubtitle = document.getElementById("profileSubtitle");
    const petMoodTag = document.getElementById("petMoodTag");
    const petWrap = document.querySelector(".pet-wrap");
    const petCore = document.getElementById("petCore");
    const pet3dStage = document.getElementById("pet3dStage");
    const pet3dCanvas = document.getElementById("pet3dCanvas");
    const petSpeechBubble = document.getElementById("petSpeechBubble");
    const petSpeechText = document.getElementById("petSpeechText");
    const petHeroLevel = document.getElementById("petHeroLevel");
    const petHeroStageName = document.getElementById("petHeroStageName");
    const petDragHint = document.getElementById("petDragHint");
    const elementSwitcher = document.getElementById("elementSwitcher");
    const elementCoreButton = document.getElementById("elementCoreButton");
    const elementCoreLabel = document.getElementById("elementCoreLabel");
    const elementOrbit = document.getElementById("elementOrbit");
    const petFeedback = document.getElementById("petFeedback");
    const petTalkButton = document.getElementById("petTalkButton");
    const petNapButton = document.getElementById("petNapButton");
    const petEvolutionShell = document.getElementById("petEvolutionShell");
    const petEvolutionTrigger = document.getElementById("petEvolutionTrigger");
    const petStageName = document.getElementById("petStageName");
    const petEvolutionHint = document.getElementById("petEvolutionHint");
    const crystalRow = document.getElementById("crystalRow");
    const evolveButton = document.getElementById("evolveButton");
    const openEvolutionGalleryButton = document.getElementById("openEvolutionGalleryButton");
    const petFeedShortcut = document.getElementById("petFeedShortcut");
    const evolutionModal = document.getElementById("evolutionModal");
    const closeEvolutionModalButton = document.getElementById("closeEvolutionModalButton");
    const evolutionRail = document.getElementById("evolutionRail");
    const evolutionSummaryTitle = document.getElementById("evolutionSummaryTitle");
    const evolutionSummaryCopy = document.getElementById("evolutionSummaryCopy");
    const evolutionGoalTitle = document.getElementById("evolutionGoalTitle");
    const evolutionGoalCopy = document.getElementById("evolutionGoalCopy");
    const taskList = document.getElementById("taskList");
    const rewardBanner = document.getElementById("rewardBanner");
    const rewardIcons = document.getElementById("rewardIcons");
    const rewardOverflow = document.getElementById("rewardOverflow");
    const rewardCopy = document.getElementById("rewardCopy");
    const feedButton = document.getElementById("feedButton");
    const growthFill = document.getElementById("growthFill");
    const growthPercent = document.getElementById("growthPercent");
    const growthPoints = document.getElementById("growthPoints");
    const growthHint = document.getElementById("growthHint");
    const badgeLevel = document.getElementById("badgeLevel");
    const badgeCrystal = document.getElementById("badgeCrystal");
    const starsValue = document.getElementById("starsValue");
    const streakValue = document.getElementById("streakValue");
    const progressValue = document.getElementById("progressValue");
    let petFeedbackTimer = 0;
    let evolutionCueTimer = 0;
    let elementShiftTimer = 0;

    const dragonMoodPose = {
      rest: { bobAmp: 3.8, bobSpeed: 1.14, headPitch: -0.12, tailAmp: 0.11, tailSpeed: 1.25, wingAmp: 0.05, wingSpeed: 1.12, bodyPitch: -0.02, stepAmp: 0.02, stepSpeed: 1.08 },
      idle: { bobAmp: 5.2, bobSpeed: 1.44, headPitch: 0.02, tailAmp: 0.18, tailSpeed: 1.7, wingAmp: 0.09, wingSpeed: 1.44, bodyPitch: 0, stepAmp: 0.04, stepSpeed: 1.5 },
      ready: { bobAmp: 6.4, bobSpeed: 1.78, headPitch: 0.08, tailAmp: 0.24, tailSpeed: 2.08, wingAmp: 0.14, wingSpeed: 1.84, bodyPitch: 0.03, stepAmp: 0.08, stepSpeed: 1.92 },
      hungry: { bobAmp: 7.2, bobSpeed: 2.08, headPitch: -0.02, tailAmp: 0.32, tailSpeed: 2.46, wingAmp: 0.18, wingSpeed: 2.1, bodyPitch: -0.03, stepAmp: 0.12, stepSpeed: 2.18 },
      complete: { bobAmp: 6.8, bobSpeed: 1.88, headPitch: 0.1, tailAmp: 0.27, tailSpeed: 2.08, wingAmp: 0.18, wingSpeed: 1.96, bodyPitch: 0.05, stepAmp: 0.07, stepSpeed: 1.88 },
      evolve: { bobAmp: 8.8, bobSpeed: 2.32, headPitch: 0.18, tailAmp: 0.4, tailSpeed: 2.68, wingAmp: 0.28, wingSpeed: 2.34, bodyPitch: 0.12, stepAmp: 0.1, stepSpeed: 2.22 }
    };

    const dragonElementThemes = {
      fire: { accent: "#ffbf52", accentDeep: "#ff6e2e", glow: "rgba(255, 183, 78, 0.62)" },
      water: { accent: "#7fd8ff", accentDeep: "#2f8fff", glow: "rgba(117, 212, 255, 0.58)" },
      wood: { accent: "#9dea75", accentDeep: "#38b66d", glow: "rgba(143, 233, 108, 0.56)" },
      earth: { accent: "#efd16a", accentDeep: "#ab7332", glow: "rgba(235, 194, 97, 0.54)" },
      metal: { accent: "#ffe6a1", accentDeep: "#8ea1c7", glow: "rgba(255, 229, 150, 0.58)" }
    };

    const dragonVoiceBank = {
      idle: ["先拿下一项委托吧！", "我已经热身好了！", "今天也一起把任务打通关。"],
      ready: ["继续推进，我跟得上！", "下一项也能拿下！", "冲呀，我已经热起来了！"],
      hungry: ["补给闻起来香香的！", "先喂我，我马上更有劲！", "我已经盯上那份补给了！"],
      complete: ["今天全清，太漂亮了！", "我们又是一整天满状态！", "训练营今天在发光！"],
      evolve: ["我感觉圣焰在涨！", "快点我一下，我要进化了！", "这次真的要变强啦！"],
      rest: ["修整一下，明天继续飞！", "今天是轻松巡逻日。", "我在晒太阳补能量呢。"],
      feed: ["好香！我开动啦！", "圣焰补满啦！", "这一口直接长大一点！"],
      nap: ["呼……我眯一会儿。", "Zzz……梦里也在升级。", "让我把翅膀收好睡一下。"],
      pet: ["嘿嘿，再摸一下嘛！", "我有在认真陪你长大哦。", "有你在，今天就能打赢。"],
      reward: ["补给到啦！", "我看到奖励了！", "新补给闻起来不错！"],
      evolveBurst: ["看好了，我要蜕变啦！", "圣焰，起飞！", "这次是大进化！"]
    };

    const dragonForms = {
      1: {
        scale: 0.92,
        body: { length: 150, height: 94, depth: 116, tilt: 0.02, y: -8 },
        neck: { length: 28, rise: 14, thickness: 26 },
        head: { length: 114, height: 84, depth: 92, tilt: 0.16 },
        snout: { length: 52, height: 28, depth: 40 },
        legs: { front: 54, rear: 48, thickness: 22, spread: 32, frontX: 38, rearX: -34 },
        tail: { lengths: [54, 42, 34], thickness: [24, 18, 14], baseAngle: -0.16, flame: 34 },
        wings: null,
        horns: null,
        spines: { count: 0, size: 0, gap: 0, startX: 0 },
        armor: null,
        crown: null,
        eyes: { size: 13, spacing: 18 },
        chestCore: 0,
        phase: 0.2
      },
      2: {
        scale: 1.02,
        body: { length: 186, height: 82, depth: 94, tilt: -0.12, y: -20 },
        neck: { length: 44, rise: 18, thickness: 24 },
        head: { length: 98, height: 68, depth: 74, tilt: 0.04 },
        snout: { length: 48, height: 24, depth: 30 },
        legs: { front: 72, rear: 64, thickness: 18, spread: 28, frontX: 54, rearX: -48 },
        tail: { lengths: [64, 52, 42], thickness: [20, 16, 12], baseAngle: -0.1, flame: 28 },
        wings: null,
        horns: { length: 28, base: 14, spread: 18, lean: 0.24 },
        spines: { count: 4, size: 16, gap: 24, startX: -24 },
        armor: null,
        crown: null,
        eyes: { size: 10, spacing: 15 },
        chestCore: 0,
        phase: 1.2
      },
      3: {
        scale: 1.1,
        body: { length: 178, height: 96, depth: 104, tilt: 0.04, y: -4 },
        neck: { length: 60, rise: 32, thickness: 24 },
        head: { length: 100, height: 70, depth: 78, tilt: 0.18 },
        snout: { length: 50, height: 24, depth: 32 },
        legs: { front: 74, rear: 66, thickness: 19, spread: 30, frontX: 44, rearX: -40 },
        tail: { lengths: [66, 54, 44], thickness: [22, 17, 12], baseAngle: -0.02, flame: 30 },
        wings: { span: 156, height: 130, thickness: 12, rootLift: 44, rootX: -2, trail: 0.68, double: false },
        horns: { length: 32, base: 12, spread: 16, lean: 0.18 },
        spines: { count: 5, size: 15, gap: 24, startX: -34 },
        armor: { chest: 0.26 },
        crown: null,
        eyes: { size: 10, spacing: 15 },
        chestCore: 16,
        phase: 2.2
      },
      4: {
        scale: 1.22,
        body: { length: 198, height: 112, depth: 132, tilt: 0.02, y: -10 },
        neck: { length: 54, rise: 24, thickness: 30 },
        head: { length: 112, height: 78, depth: 88, tilt: 0.1 },
        snout: { length: 54, height: 28, depth: 36 },
        legs: { front: 80, rear: 72, thickness: 26, spread: 38, frontX: 46, rearX: -44 },
        tail: { lengths: [68, 56, 44], thickness: [22, 18, 13], baseAngle: -0.05, flame: 32 },
        wings: { span: 136, height: 108, thickness: 14, rootLift: 38, rootX: -10, trail: 0.62, double: false },
        horns: { length: 34, base: 14, spread: 18, lean: 0.12 },
        spines: { count: 5, size: 18, gap: 24, startX: -30 },
        armor: { chest: 1, shoulder: 1, forearm: 1 },
        crown: { buds: 1, length: 16 },
        eyes: { size: 11, spacing: 17 },
        chestCore: 18,
        phase: 3.5
      },
      5: {
        scale: 1.34,
        body: { length: 196, height: 104, depth: 118, tilt: 0.12, y: 10 },
        neck: { length: 74, rise: 48, thickness: 26 },
        head: { length: 116, height: 80, depth: 84, tilt: 0.26 },
        snout: { length: 58, height: 26, depth: 34 },
        legs: { front: 84, rear: 78, thickness: 22, spread: 34, frontX: 50, rearX: -40 },
        tail: { lengths: [72, 60, 48], thickness: [20, 15, 10], baseAngle: 0.08, flame: 36 },
        wings: { span: 212, height: 170, thickness: 14, rootLift: 58, rootX: 2, trail: 0.72, double: true },
        horns: { length: 42, base: 14, spread: 22, lean: 0.16 },
        spines: { count: 6, size: 16, gap: 22, startX: -24 },
        armor: { chest: 1.3, shoulder: 1.1, forearm: 1.1, halo: 1 },
        crown: { buds: 3, length: 28 },
        eyes: { size: 12, spacing: 18 },
        chestCore: 24,
        phase: 5.1
      }
    };

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function lerp(start, end, amount) {
      return start + (end - start) * amount;
    }

    function easeInOutSine(value) {
      return -(Math.cos(Math.PI * value) - 1) / 2;
    }

    function hexToRgb(hex) {
      const normalized = hex.replace("#", "");
      const source = normalized.length === 3
        ? normalized.split("").map((part) => part + part).join("")
        : normalized;
      const intValue = Number.parseInt(source, 16);
      return {
        r: (intValue >> 16) & 255,
        g: (intValue >> 8) & 255,
        b: intValue & 255
      };
    }

    function rgbToHex(rgb) {
      const toHex = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
      return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }

    function mixHex(source, target, weight = 0.5) {
      const a = hexToRgb(source);
      const b = hexToRgb(target);
      return rgbToHex({
        r: a.r + (b.r - a.r) * weight,
        g: a.g + (b.g - a.g) * weight,
        b: a.b + (b.b - a.b) * weight
      });
    }

    function shadeHex(hex, factor = 1) {
      const rgb = hexToRgb(hex);
      return rgbToHex({
        r: rgb.r * factor,
        g: rgb.g * factor,
        b: rgb.b * factor
      });
    }

    function rgba(hex, alpha = 1) {
      const rgb = hexToRgb(hex);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    function normalize(vector) {
      const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
      return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length
      };
    }

    function add3(a, b) {
      return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
    }

    function sub3(a, b) {
      return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    }

    function scale3(point, amount) {
      if (typeof amount === "number") {
        return { x: point.x * amount, y: point.y * amount, z: point.z * amount };
      }
      return {
        x: point.x * amount.x,
        y: point.y * amount.y,
        z: point.z * amount.z
      };
    }

    function cross(a, b) {
      return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      };
    }

    function dot(a, b) {
      return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    function averagePoints(points) {
      const sum = points.reduce((memo, point) => add3(memo, point), { x: 0, y: 0, z: 0 });
      return scale3(sum, 1 / points.length);
    }

    function rotateX(point, angle) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return {
        x: point.x,
        y: point.y * cosine - point.z * sine,
        z: point.y * sine + point.z * cosine
      };
    }

    function rotateY(point, angle) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return {
        x: point.x * cosine + point.z * sine,
        y: point.y,
        z: -point.x * sine + point.z * cosine
      };
    }

    function rotateZ(point, angle) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return {
        x: point.x * cosine - point.y * sine,
        y: point.x * sine + point.y * cosine,
        z: point.z
      };
    }

    function rotatePoint(point, rotation = {}) {
      let next = { ...point };
      if (rotation.x) next = rotateX(next, rotation.x);
      if (rotation.y) next = rotateY(next, rotation.y);
      if (rotation.z) next = rotateZ(next, rotation.z);
      return next;
    }

    function transformChain(point, transforms = []) {
      let next = { ...point };
      transforms.forEach((transform) => {
        if (transform.scale) {
          next = scale3(next, transform.scale);
        }
        if (transform.rotation) {
          next = rotatePoint(next, transform.rotation);
        }
        if (transform.position) {
          next = add3(next, transform.position);
        }
      });
      return next;
    }

    function offset2D(origin, dx, dy, angle = 0) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return {
        x: origin.x + dx * cosine - dy * sine,
        y: origin.y + dx * sine + dy * cosine,
        z: origin.z
      };
    }

    function pick(list) {
      return list[Math.floor(Math.random() * list.length)] ?? "";
    }

    function createDragonPalette(elementKey) {
      const theme = dragonElementThemes[elementKey] ?? dragonElementThemes.fire;
      return {
        body: mixHex("#f38646", theme.accent, 0.14),
        bodyDeep: mixHex("#d95523", theme.accentDeep, 0.1),
        belly: mixHex("#ffe4b1", theme.accent, 0.08),
        armor: mixHex("#fff2cb", theme.accent, 0.2),
        armorDeep: mixHex("#e9b04e", theme.accentDeep, 0.18),
        wing: mixHex("#ffd79e", theme.accent, 0.38),
        wingDeep: mixHex("#f18d3f", theme.accentDeep, 0.22),
        horn: mixHex("#fff1c6", theme.accent, 0.18),
        spike: mixHex("#ffc66e", theme.accent, 0.18),
        eye: mixHex("#fff9e9", theme.accent, 0.24),
        accent: theme.accent,
        accentDeep: theme.accentDeep,
        accentSoft: mixHex(theme.accent, "#ffffff", 0.56),
        glow: theme.glow,
        line: mixHex("#713713", theme.accentDeep, 0.08)
      };
    }

    class DragonStage {
      constructor(options) {
        this.stageEl = options.stageEl;
        this.canvas = options.canvas;
        this.ctx = this.canvas.getContext("2d");
        this.bubble = options.bubble;
        this.bubbleText = options.bubbleText;
        this.getContext = options.getContext;
        this.level = 2;
        this.element = "fire";
        this.mode = "idle";
        this.queueCount = 0;
        this.stageName = "迅爪少龙";
        this.restYaw = -0.58;
        this.restPitch = -0.08;
        this.currentYaw = this.restYaw;
        this.targetYaw = this.restYaw;
        this.currentPitch = this.restPitch;
        this.targetPitch = this.restPitch;
        this.minYaw = -1.1;
        this.maxYaw = 0.42;
        this.minPitch = -0.22;
        this.maxPitch = 0.18;
        this.dragState = null;
        this.didDrag = false;
        this.action = null;
        this.bubbleTimer = 0;
        this.nextBlinkAt = performance.now() + 1200;
        this.blinkStart = 0;
        this.blinkDuration = 160;
        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.focalLength = 0;
        this.cameraDistance = 860;
        this.lightDirection = normalize({ x: 0.32, y: 0.82, z: 0.54 });
        this.boundResize = () => this.resizeCanvas();
        this.frame = this.frame.bind(this);
        this.attachEvents();
        if (window.ResizeObserver) {
          this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
          this.resizeObserver.observe(this.stageEl);
        } else {
          window.addEventListener("resize", this.boundResize);
        }
        this.resizeCanvas();
        requestAnimationFrame(this.frame);
      }

      attachEvents() {
        this.stageEl.addEventListener("pointerdown", (event) => {
          this.dragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            yaw: this.targetYaw,
            pitch: this.targetPitch
          };
          this.didDrag = false;
          this.stageEl.classList.add("is-dragging");
          if (this.stageEl.setPointerCapture) {
            this.stageEl.setPointerCapture(event.pointerId);
          }
        });

        this.stageEl.addEventListener("pointermove", (event) => {
          if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
            return;
          }
          const deltaX = event.clientX - this.dragState.startX;
          const deltaY = event.clientY - this.dragState.startY;
          if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
            this.didDrag = true;
          }
          this.targetYaw = clamp(this.dragState.yaw + deltaX * 0.012, this.minYaw, this.maxYaw);
          this.targetPitch = clamp(this.dragState.pitch - deltaY * 0.0052, this.minPitch, this.maxPitch);
        });

        const releasePointer = (event) => {
          if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
            return;
          }
          if (this.stageEl.releasePointerCapture) {
            try {
              this.stageEl.releasePointerCapture(event.pointerId);
            } catch (error) {
              // ignore release failure in prototype browsers
            }
          }
          const shouldPet = !this.didDrag;
          this.dragState = null;
          this.stageEl.classList.remove("is-dragging");
          if (shouldPet) {
            this.reactToTap();
          }
        };

        this.stageEl.addEventListener("pointerup", releasePointer);
        this.stageEl.addEventListener("pointercancel", releasePointer);
      }

      resizeCanvas() {
        const rect = this.stageEl.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }
        const ratio = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = Math.round(rect.width * ratio);
        this.canvas.height = Math.round(rect.height * ratio);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.centerX = rect.width * 0.5;
        this.centerY = rect.height * 0.66;
        this.focalLength = Math.min(rect.width, rect.height) * 1.08;
      }

      setState(nextState) {
        this.level = nextState.level;
        this.element = nextState.element;
        this.mode = nextState.mode;
        this.queueCount = nextState.queueCount;
        this.stageName = nextState.stageName;
      }

      setHint(message) {
        if (petDragHint) {
          petDragHint.textContent = message;
        }
      }

      speak(message, tone = "talk", duration = 2200) {
        window.clearTimeout(this.bubbleTimer);
        this.bubble.dataset.tone = tone;
        this.bubbleText.textContent = message;
        this.bubble.setAttribute("aria-hidden", "false");
        this.bubble.classList.remove("is-visible");
        void this.bubble.offsetWidth;
        this.bubble.classList.add("is-visible");
        this.bubbleTimer = window.setTimeout(() => {
          this.bubble.classList.remove("is-visible");
          this.bubble.setAttribute("aria-hidden", "true");
        }, duration);
      }

      trigger(actionName, options = {}) {
        const durationMap = {
          feed: 960,
          talk: 1180,
          nap: 2600,
          pet: 960,
          reward: 1040,
          evolveBurst: 1520
        };
        this.action = {
          name: actionName,
          start: performance.now(),
          duration: options.duration ?? durationMap[actionName] ?? 1000
        };
        if (options.message) {
          this.speak(options.message, options.tone ?? (actionName === "feed" ? "feed" : actionName === "nap" ? "nap" : actionName === "evolveBurst" ? "evolve" : actionName), options.bubbleDuration ?? Math.max(1800, this.action.duration));
        }
      }

      reactToTap() {
        const context = this.getContext ? this.getContext() : { mode: this.mode, queueCount: this.queueCount };
        const bankKey = context.queueCount > 0 ? "hungry" : context.mode === "complete" ? "complete" : context.mode === "evolve" ? "evolve" : context.mode === "rest" ? "rest" : "pet";
        this.trigger("pet", {
          message: pick(dragonVoiceBank[bankKey] ?? dragonVoiceBank.pet),
          tone: "pet"
        });
      }

      talkFromContext(forceKey) {
        const context = this.getContext ? this.getContext() : { mode: this.mode, queueCount: this.queueCount };
        const bankKey = forceKey ?? (context.queueCount > 0 ? "hungry" : context.mode === "complete" ? "complete" : context.mode === "evolve" ? "evolve" : context.mode === "rest" ? "rest" : context.mode === "ready" ? "ready" : "idle");
        this.trigger(forceKey === "nap" ? "nap" : "talk", {
          message: pick(dragonVoiceBank[bankKey] ?? dragonVoiceBank.idle),
          tone: forceKey === "nap" ? "nap" : "talk",
          duration: forceKey === "nap" ? 2600 : 1180,
          bubbleDuration: forceKey === "nap" ? 2500 : 2200
        });
      }

      getActiveAction(ts) {
        if (!this.action) {
          return null;
        }
        const progress = clamp((ts - this.action.start) / this.action.duration, 0, 1);
        if (progress >= 1) {
          this.action = null;
          return null;
        }
        return { ...this.action, progress };
      }

      updateBlink(ts) {
        if (ts >= this.nextBlinkAt) {
          this.blinkStart = ts;
          this.nextBlinkAt = ts + 2000 + Math.random() * 2400;
        }
        const elapsed = ts - this.blinkStart;
        if (elapsed < 0 || elapsed > this.blinkDuration) {
          return 0;
        }
        return Math.sin((elapsed / this.blinkDuration) * Math.PI);
      }

      getPose(ts, form) {
        const mood = dragonMoodPose[this.mode] ?? dragonMoodPose.idle;
        const time = ts * 0.001;
        const action = this.getActiveAction(ts);
        let feedPulse = 0;
        let talkPulse = 0;
        let napBlend = 0;
        let petPulse = 0;
        let rewardPulse = 0;
        let evolvePulse = 0;

        if (action) {
          const pulse = Math.sin(action.progress * Math.PI);
          if (action.name === "feed") feedPulse = pulse;
          if (action.name === "talk") talkPulse = pulse;
          if (action.name === "pet") petPulse = pulse;
          if (action.name === "reward") rewardPulse = pulse;
          if (action.name === "evolveBurst") evolvePulse = pulse;
          if (action.name === "nap") {
            if (action.progress < 0.18) {
              napBlend = easeInOutSine(action.progress / 0.18);
            } else if (action.progress > 0.82) {
              napBlend = easeInOutSine((1 - action.progress) / 0.18);
            } else {
              napBlend = 1;
            }
          }
        }

        const breathWave = 0.5 + Math.sin(time * 2.5 + form.phase) * 0.5;
        const bob = Math.sin(time * mood.bobSpeed + form.phase) * mood.bobAmp;
        const blink = Math.max(this.updateBlink(ts), napBlend * 0.98);
        const completeBoost = this.mode === "complete" ? 0.1 : 0;
        const evolveReadyBoost = this.mode === "evolve" ? 0.16 : 0;

        return {
          blink,
          breathScale: 0.96 + breathWave * 0.08,
          bodyLift: bob + (this.mode === "complete" ? 3 : 0) + evolvePulse * 8 - napBlend * 8,
          bodyPitch: mood.bodyPitch + feedPulse * 0.06 + rewardPulse * 0.04 + evolvePulse * 0.12 - napBlend * 0.06,
          headPitch: mood.headPitch + talkPulse * 0.16 + petPulse * 0.12 + feedPulse * 0.14 + rewardPulse * 0.09 + evolvePulse * 0.22 - napBlend * 0.28,
          headLift: Math.sin(time * 1.9 + form.phase) * 2 + talkPulse * 5 + evolvePulse * 10 - napBlend * 10,
          mouthOpen: clamp(feedPulse * 0.44 + talkPulse * 0.34 + rewardPulse * 0.16 + (this.mode === "hungry" ? 0.08 : 0), 0, 0.7),
          tailWave: time * mood.tailSpeed + form.phase,
          tailSwing: mood.tailAmp + feedPulse * 0.12 + petPulse * 0.08 + rewardPulse * 0.08 + evolvePulse * 0.18,
          wingFlap: Math.sin(time * mood.wingSpeed + form.phase) * (mood.wingAmp + completeBoost + evolveReadyBoost) + feedPulse * 0.12 + evolvePulse * 0.25 - napBlend * 0.2,
          glowPulse: 0.55 + 0.45 * Math.sin(time * 3.4 + form.phase) + feedPulse * 0.18 + evolvePulse * 0.34,
          step: Math.sin(time * mood.stepSpeed + form.phase) * mood.stepAmp + rewardPulse * 0.08,
          napBlend,
          sparkle: Math.max(this.mode === "complete" ? 0.7 : 0.16, evolvePulse + (this.mode === "evolve" ? 0.42 : 0)),
          aura: completeBoost + evolveReadyBoost + feedPulse * 0.08,
          heroScale: 1 + (this.mode === "complete" ? 0.01 : 0) + evolvePulse * 0.03
        };
      }

      createFacePalette(baseColor, topBoost = 1.12) {
        return {
          front: shadeHex(baseColor, 1.05),
          back: shadeHex(baseColor, 0.76),
          left: shadeHex(baseColor, 0.88),
          right: shadeHex(baseColor, 1),
          top: shadeHex(baseColor, topBoost),
          bottom: shadeHex(baseColor, 0.66)
        };
      }

      appendFace(scene, points, fill, line, doubleSided = false) {
        scene.faces.push({ points, fill, line, doubleSided });
      }

      addBox(scene, spec, rootTransforms) {
        const halfX = spec.size.x / 2;
        const halfY = spec.size.y / 2;
        const halfZ = spec.size.z / 2;
        const localPoints = [
          { x: -halfX, y: -halfY, z: -halfZ },
          { x: halfX, y: -halfY, z: -halfZ },
          { x: halfX, y: halfY, z: -halfZ },
          { x: -halfX, y: halfY, z: -halfZ },
          { x: -halfX, y: -halfY, z: halfZ },
          { x: halfX, y: -halfY, z: halfZ },
          { x: halfX, y: halfY, z: halfZ },
          { x: -halfX, y: halfY, z: halfZ }
        ].map((point) => transformChain(point, [
          { rotation: spec.rotation },
          { position: spec.center },
          ...rootTransforms
        ]));
        const faceMap = [
          { indices: [1, 5, 6, 2], color: spec.palette.front },
          { indices: [0, 3, 7, 4], color: spec.palette.back },
          { indices: [0, 4, 5, 1], color: spec.palette.bottom },
          { indices: [3, 2, 6, 7], color: spec.palette.top },
          { indices: [1, 2, 3, 0], color: spec.palette.left },
          { indices: [4, 7, 6, 5], color: spec.palette.right }
        ];
        faceMap.forEach((face) => {
          this.appendFace(scene, face.indices.map((index) => localPoints[index]), face.color, spec.line ?? face.color, spec.doubleSided);
        });
      }

      addPyramid(scene, spec, rootTransforms) {
        const { axis = "y" } = spec;
        let localPoints = [];
        if (axis === "x") {
          const halfX = spec.size.x / 2;
          const halfY = spec.size.y / 2;
          const halfZ = spec.size.z / 2;
          localPoints = [
            { x: -halfX, y: -halfY, z: -halfZ },
            { x: -halfX, y: halfY, z: -halfZ },
            { x: -halfX, y: halfY, z: halfZ },
            { x: -halfX, y: -halfY, z: halfZ },
            { x: halfX, y: 0, z: 0 }
          ];
        } else {
          const halfX = spec.size.x / 2;
          const halfY = spec.size.y / 2;
          const halfZ = spec.size.z / 2;
          localPoints = [
            { x: -halfX, y: -halfY, z: -halfZ },
            { x: halfX, y: -halfY, z: -halfZ },
            { x: halfX, y: -halfY, z: halfZ },
            { x: -halfX, y: -halfY, z: halfZ },
            { x: 0, y: halfY, z: 0 }
          ];
        }
        const points = localPoints.map((point) => transformChain(point, [
          { rotation: spec.rotation },
          { position: spec.center },
          ...rootTransforms
        ]));
        const base = [0, 1, 2, 3].map((index) => points[index]);
        this.appendFace(scene, base, spec.palette.bottom, spec.line ?? spec.palette.bottom, spec.doubleSided);
        this.appendFace(scene, [points[0], points[1], points[4]], spec.palette.left, spec.line ?? spec.palette.left, spec.doubleSided);
        this.appendFace(scene, [points[1], points[2], points[4]], spec.palette.front, spec.line ?? spec.palette.front, spec.doubleSided);
        this.appendFace(scene, [points[2], points[3], points[4]], spec.palette.right, spec.line ?? spec.palette.right, spec.doubleSided);
        this.appendFace(scene, [points[3], points[0], points[4]], spec.palette.back, spec.line ?? spec.palette.back, spec.doubleSided);
      }

      addTriPrism(scene, spec, rootTransforms) {
        const half = spec.thickness / 2;
        const localPoints = [
          { x: spec.a.x - half, y: spec.a.y, z: spec.a.z },
          { x: spec.b.x - half, y: spec.b.y, z: spec.b.z },
          { x: spec.c.x - half, y: spec.c.y, z: spec.c.z },
          { x: spec.a.x + half, y: spec.a.y, z: spec.a.z },
          { x: spec.b.x + half, y: spec.b.y, z: spec.b.z },
          { x: spec.c.x + half, y: spec.c.y, z: spec.c.z }
        ].map((point) => transformChain(point, rootTransforms));
        this.appendFace(scene, [localPoints[0], localPoints[1], localPoints[2]], spec.palette.back, spec.line ?? spec.palette.back, true);
        this.appendFace(scene, [localPoints[3], localPoints[5], localPoints[4]], spec.palette.front, spec.line ?? spec.palette.front, true);
        this.appendFace(scene, [localPoints[0], localPoints[3], localPoints[4], localPoints[1]], spec.palette.top, spec.line ?? spec.palette.top, true);
        this.appendFace(scene, [localPoints[1], localPoints[4], localPoints[5], localPoints[2]], spec.palette.left, spec.line ?? spec.palette.left, true);
        this.appendFace(scene, [localPoints[2], localPoints[5], localPoints[3], localPoints[0]], spec.palette.right, spec.line ?? spec.palette.right, true);
      }

      addDiamond(scene, spec, rootTransforms) {
        const points = [
          { x: spec.size, y: 0, z: 0 },
          { x: -spec.size, y: 0, z: 0 },
          { x: 0, y: spec.size, z: 0 },
          { x: 0, y: -spec.size, z: 0 },
          { x: 0, y: 0, z: spec.size * 0.76 },
          { x: 0, y: 0, z: -spec.size * 0.76 }
        ].map((point) => transformChain(point, [
          { rotation: spec.rotation },
          { position: spec.center },
          ...rootTransforms
        ]));
        const faces = [
          [points[0], points[2], points[4]],
          [points[2], points[1], points[4]],
          [points[1], points[3], points[4]],
          [points[3], points[0], points[4]],
          [points[2], points[0], points[5]],
          [points[1], points[2], points[5]],
          [points[3], points[1], points[5]],
          [points[0], points[3], points[5]]
        ];
        faces.forEach((face, index) => {
          const fill = index < 4 ? spec.palette.top : spec.palette.bottom;
          this.appendFace(scene, face, fill, spec.line ?? fill, spec.doubleSided);
        });
      }

      addLeg(scene, spec, rootTransforms, palette, armorPalette) {
        const knee = {
          x: spec.anchor.x + spec.length * 0.08,
          y: spec.anchor.y - spec.length * 0.46 + spec.lift * 0.38,
          z: spec.anchor.z
        };
        const foot = {
          x: spec.anchor.x + spec.length * 0.16,
          y: spec.anchor.y - spec.length + spec.lift,
          z: spec.anchor.z
        };
        const upperLength = Math.hypot(knee.x - spec.anchor.x, knee.y - spec.anchor.y);
        const lowerLength = Math.hypot(foot.x - knee.x, foot.y - knee.y);
        const upperCenter = { x: (spec.anchor.x + knee.x) / 2, y: (spec.anchor.y + knee.y) / 2, z: spec.anchor.z };
        const lowerCenter = { x: (knee.x + foot.x) / 2, y: (knee.y + foot.y) / 2, z: spec.anchor.z };
        const upperAngle = Math.atan2(knee.y - spec.anchor.y, knee.x - spec.anchor.x);
        const lowerAngle = Math.atan2(foot.y - knee.y, foot.x - knee.x);
        this.addBox(scene, {
          center: upperCenter,
          size: { x: upperLength, y: spec.thickness, z: spec.thickness },
          rotation: { z: upperAngle },
          palette,
          line: shadeHex(palette.front, 0.72)
        }, rootTransforms);
        this.addBox(scene, {
          center: lowerCenter,
          size: { x: lowerLength, y: spec.thickness * 0.82, z: spec.thickness * 0.86 },
          rotation: { z: lowerAngle },
          palette,
          line: shadeHex(palette.front, 0.72)
        }, rootTransforms);
        this.addBox(scene, {
          center: { x: foot.x + spec.thickness * 0.14, y: foot.y - spec.thickness * 0.16, z: foot.z },
          size: { x: spec.thickness * 1.1, y: spec.thickness * 0.62, z: spec.thickness * 1.26 },
          rotation: { z: 0.06 },
          palette: this.createFacePalette(shadeHex(palette.front, 0.92), 1.1),
          line: shadeHex(palette.front, 0.64)
        }, rootTransforms);
        if (spec.guard) {
          this.addBox(scene, {
            center: { x: lowerCenter.x + spec.thickness * 0.16, y: lowerCenter.y + spec.thickness * 0.06, z: lowerCenter.z },
            size: { x: lowerLength * 0.44, y: spec.thickness * 0.74, z: spec.thickness * 1.12 },
            rotation: { z: lowerAngle },
            palette: armorPalette,
            line: shadeHex(armorPalette.front, 0.72)
          }, rootTransforms);
        }
      }

      project(point) {
        const depth = this.cameraDistance - point.z;
        const scale = this.focalLength / Math.max(depth, 120);
        return {
          x: this.centerX + point.x * scale,
          y: this.centerY - point.y * scale,
          scale,
          depth: point.z
        };
      }

      drawGlow(position, radius, color, alpha = 0.6) {
        const projected = this.project(position);
        const renderRadius = Math.max(radius * projected.scale, 8);
        const gradient = this.ctx.createRadialGradient(projected.x, projected.y, renderRadius * 0.08, projected.x, projected.y, renderRadius);
        gradient.addColorStop(0, rgba(color, alpha));
        gradient.addColorStop(0.45, rgba(color, alpha * 0.44));
        gradient.addColorStop(1, rgba(color, 0));
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, renderRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      drawFlame(effect) {
        const projected = this.project(effect.position);
        const size = Math.max(effect.size * projected.scale, 10);
        this.drawGlow(effect.position, effect.size * 1.55, effect.color, 0.44 + effect.pulse * 0.18);
        this.ctx.save();
        this.ctx.translate(projected.x, projected.y);
        this.ctx.rotate(-0.36 + effect.pulse * 0.1);
        this.ctx.fillStyle = rgba(effect.color, 0.96);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * 0.92);
        this.ctx.bezierCurveTo(size * 0.46, -size * 0.4, size * 0.56, size * 0.2, 0, size * 0.88);
        this.ctx.bezierCurveTo(-size * 0.58, size * 0.22, -size * 0.44, -size * 0.38, 0, -size * 0.92);
        this.ctx.fill();
        this.ctx.fillStyle = rgba(effect.core, 0.92);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size * 0.52);
        this.ctx.bezierCurveTo(size * 0.22, -size * 0.2, size * 0.24, size * 0.08, 0, size * 0.46);
        this.ctx.bezierCurveTo(-size * 0.22, size * 0.08, -size * 0.2, -size * 0.18, 0, -size * 0.52);
        this.ctx.fill();
        this.ctx.restore();
      }

      drawCore(effect) {
        const projected = this.project(effect.position);
        const size = Math.max(effect.size * projected.scale, 8);
        this.drawGlow(effect.position, effect.size * 1.9, effect.color, 0.3 + effect.pulse * 0.16);
        this.ctx.save();
        this.ctx.translate(projected.x, projected.y);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillStyle = rgba(effect.color, 0.94);
        this.ctx.fillRect(-size * 0.52, -size * 0.52, size * 1.04, size * 1.04);
        this.ctx.fillStyle = rgba(effect.core, 0.92);
        this.ctx.fillRect(-size * 0.26, -size * 0.26, size * 0.52, size * 0.52);
        this.ctx.restore();
      }

      drawEye(effect) {
        const projected = this.project(effect.position);
        const width = Math.max(effect.size * projected.scale, 4);
        const height = Math.max(width * 0.44 * (1 - effect.blink * 0.92), 1.6);
        this.drawGlow(effect.position, effect.size * 1.2, effect.tint, 0.16);
        this.ctx.save();
        this.ctx.translate(projected.x, projected.y);
        this.ctx.rotate(effect.rotate ?? 0);
        this.ctx.fillStyle = rgba(effect.color, 0.98);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, width * 0.56, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      drawMouth(effect) {
        const start = this.project(effect.start);
        const end = this.project(effect.end);
        const controlY = (start.y + end.y) / 2 + effect.open * 10;
        this.ctx.save();
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
        this.ctx.strokeStyle = rgba(effect.color, 0.92);
        this.ctx.lineWidth = Math.max(1.6, start.scale * 3.4);
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo((start.x + end.x) / 2, controlY, end.x, end.y);
        this.ctx.stroke();
        this.ctx.restore();
      }

      drawSpark(effect) {
        const projected = this.project(effect.position);
        const size = Math.max(effect.size * projected.scale, 3);
        this.ctx.save();
        this.ctx.translate(projected.x, projected.y);
        this.ctx.rotate(effect.angle);
        this.ctx.strokeStyle = rgba(effect.color, 0.85);
        this.ctx.lineWidth = Math.max(1.2, projected.scale * 1.8);
        this.ctx.beginPath();
        this.ctx.moveTo(-size, 0);
        this.ctx.lineTo(size, 0);
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(0, size);
        this.ctx.stroke();
        this.ctx.restore();
      }

      buildDragon(scene, form, pose, palette) {
        const rootTransforms = [
          { scale: form.scale * pose.heroScale },
          { rotation: { x: this.currentPitch, y: this.currentYaw } },
          { position: { x: 0, y: pose.bodyLift, z: 0 } }
        ];
        const bodyCenter = { x: 0, y: form.body.y, z: 0 };
        const bodyAngle = form.body.tilt + pose.bodyPitch;
        const bodyPalette = this.createFacePalette(palette.body);
        const bellyPalette = this.createFacePalette(palette.belly, 1.18);
        const armorPalette = this.createFacePalette(palette.armor, 1.18);
        const wingPalette = this.createFacePalette(palette.wing, 1.16);
        const hornPalette = this.createFacePalette(palette.horn, 1.18);
        const spikePalette = this.createFacePalette(palette.spike, 1.12);
        const bodySize = {
          x: form.body.length,
          y: form.body.height * pose.breathScale,
          z: form.body.depth
        };
        const chestAnchor = offset2D(bodyCenter, form.body.length * 0.22, form.body.height * 0.08, bodyAngle);
        const tailAnchor = offset2D(bodyCenter, -form.body.length * 0.46, -form.body.height * 0.03, bodyAngle);
        const frontHip = offset2D(bodyCenter, form.legs.frontX, -form.body.height * 0.18, bodyAngle);
        const rearHip = offset2D(bodyCenter, form.legs.rearX, -form.body.height * 0.22, bodyAngle);
        const neckBase = offset2D(bodyCenter, form.body.length * 0.34, form.body.height * 0.15, bodyAngle);
        let tailJoint = { ...tailAnchor };
        let tailAngle = form.tail.baseAngle + bodyAngle * 0.42;

        form.tail.lengths.forEach((length, index) => {
          tailAngle += Math.sin(pose.tailWave + index * 0.72) * pose.tailSwing * (1 - index * 0.18);
          const center = offset2D(tailJoint, -length * 0.48, 0, tailAngle);
          this.addBox(scene, {
            center,
            size: { x: length, y: form.tail.thickness[index], z: form.tail.thickness[index] * 0.88 },
            rotation: { z: tailAngle },
            palette: this.createFacePalette(index === 0 ? palette.bodyDeep : palette.body, 1.08),
            line: shadeHex(palette.line, 0.92)
          }, rootTransforms);
          tailJoint = offset2D(tailJoint, -length, 0, tailAngle);
        });

        this.addBox(scene, {
          center: bodyCenter,
          size: bodySize,
          rotation: { z: bodyAngle },
          palette: bodyPalette,
          line: palette.line
        }, rootTransforms);

        this.addBox(scene, {
          center: offset2D(bodyCenter, form.body.length * 0.08, -form.body.height * 0.04, bodyAngle),
          size: { x: form.body.length * 0.52, y: form.body.height * 0.54, z: form.body.depth * 0.5 },
          rotation: { z: bodyAngle },
          palette: bellyPalette,
          line: shadeHex(palette.belly, 0.72)
        }, rootTransforms);

        if (form.armor?.chest) {
          this.addBox(scene, {
            center: offset2D(chestAnchor, 0, 0, bodyAngle),
            size: { x: 44 + 12 * form.armor.chest, y: 42 + 12 * form.armor.chest, z: form.body.depth * 0.54 },
            rotation: { z: bodyAngle },
            palette: armorPalette,
            line: shadeHex(palette.armorDeep, 0.78)
          }, rootTransforms);
        }

        if (form.armor?.shoulder) {
          [-1, 1].forEach((side) => {
            this.addBox(scene, {
              center: { x: frontHip.x + 10, y: frontHip.y + 8, z: side * (form.legs.spread + 6) },
              size: { x: 36 + 10 * form.armor.shoulder, y: 18 + 4 * form.armor.shoulder, z: 30 + 8 * form.armor.shoulder },
              rotation: { z: 0.08 },
              palette: armorPalette,
              line: shadeHex(palette.armorDeep, 0.78)
            }, rootTransforms);
          });
        }

        [-1, 1].forEach((side) => {
          const frontLift = side === -1 ? pose.step * 14 : -pose.step * 10;
          const rearLift = side === -1 ? -pose.step * 10 : pose.step * 12;
          this.addLeg(scene, {
            anchor: { x: frontHip.x, y: frontHip.y, z: side * form.legs.spread },
            length: form.legs.front,
            thickness: form.legs.thickness,
            lift: frontLift,
            guard: Boolean(form.armor?.forearm)
          }, rootTransforms, this.createFacePalette(palette.bodyDeep, 1.08), armorPalette);
          this.addLeg(scene, {
            anchor: { x: rearHip.x, y: rearHip.y, z: side * (form.legs.spread - 4) },
            length: form.legs.rear,
            thickness: form.legs.thickness * 0.92,
            lift: rearLift,
            guard: false
          }, rootTransforms, this.createFacePalette(shadeHex(palette.bodyDeep, 0.94), 1.04), armorPalette);
        });

        if (form.spines.count > 0) {
          for (let index = 0; index < form.spines.count; index += 1) {
            const ratio = form.spines.count === 1 ? 0.5 : index / (form.spines.count - 1);
            const spikeCenter = offset2D(bodyCenter, form.spines.startX + form.spines.gap * index, form.body.height * 0.44 - ratio * 6, bodyAngle);
            this.addPyramid(scene, {
              axis: "y",
              center: { x: spikeCenter.x, y: spikeCenter.y, z: 0 },
              size: { x: 16 - ratio * 3, y: form.spines.size - ratio * 2, z: 16 - ratio * 3 },
              rotation: { z: bodyAngle * 0.35 },
              palette: spikePalette,
              line: shadeHex(palette.spike, 0.72)
            }, rootTransforms);
          }
        }

        const headAngle = form.head.tilt + pose.headPitch;
        const neckCenter = offset2D(neckBase, form.neck.length * 0.46, form.neck.rise * 0.48, headAngle);
        const headCenter = offset2D(neckBase, form.neck.length + form.head.length * 0.32, form.neck.rise + form.head.height * 0.06 + pose.headLift, headAngle);
        const snoutCenter = offset2D(headCenter, form.head.length * 0.32 + form.snout.length * 0.36, -form.head.height * 0.04 - pose.mouthOpen * 2, headAngle);

        this.addBox(scene, {
          center: neckCenter,
          size: { x: form.neck.length, y: form.neck.thickness, z: form.neck.thickness * 0.88 },
          rotation: { z: headAngle },
          palette: this.createFacePalette(palette.bodyDeep, 1.06),
          line: palette.line
        }, rootTransforms);

        this.addBox(scene, {
          center: headCenter,
          size: { x: form.head.length, y: form.head.height, z: form.head.depth },
          rotation: { z: headAngle },
          palette: this.createFacePalette(mixHex(palette.body, palette.accentSoft, 0.08), 1.14),
          line: palette.line
        }, rootTransforms);

        this.addBox(scene, {
          center: snoutCenter,
          size: { x: form.snout.length, y: form.snout.height, z: form.snout.depth },
          rotation: { z: headAngle },
          palette: this.createFacePalette(mixHex(palette.belly, palette.body, 0.1), 1.14),
          line: shadeHex(palette.belly, 0.64)
        }, rootTransforms);

        if (form.horns) {
          [-1, 1].forEach((side) => {
            this.addPyramid(scene, {
              axis: "x",
              center: { x: headCenter.x - form.head.length * 0.08, y: headCenter.y + form.head.height * 0.36, z: side * form.horns.spread },
              size: { x: form.horns.length, y: form.horns.base, z: form.horns.base },
              rotation: { z: headAngle + form.horns.lean, y: side * 0.24 },
              palette: hornPalette,
              line: shadeHex(palette.horn, 0.72)
            }, rootTransforms);
          });
        }

        if (form.crown) {
          const count = form.crown.buds;
          for (let index = 0; index < count; index += 1) {
            const centerOffset = count === 1 ? 0 : index - (count - 1) / 2;
            this.addPyramid(scene, {
              axis: "y",
              center: { x: headCenter.x - form.head.length * 0.1 + centerOffset * 10, y: headCenter.y + form.head.height * 0.5, z: centerOffset * 8 },
              size: { x: 12, y: form.crown.length - Math.abs(centerOffset) * 6, z: 12 },
              rotation: { z: headAngle * 0.3 },
              palette: this.createFacePalette(mixHex(palette.horn, palette.accentSoft, 0.28), 1.22),
              line: shadeHex(palette.horn, 0.7)
            }, rootTransforms);
          }
        }

        if (form.wings) {
          [-1, 1].forEach((side) => {
            const wingRoot = { x: form.wings.rootX, y: bodyCenter.y + form.wings.rootLift, z: side * (form.body.depth * 0.36) };
            const flapLift = form.wings.height * (0.18 + pose.wingFlap * 0.32);
            const wingTip = {
              x: wingRoot.x - form.wings.height * 0.12,
              y: wingRoot.y + flapLift,
              z: wingRoot.z + side * form.wings.span
            };
            const wingLower = {
              x: wingRoot.x - form.wings.height * 0.4,
              y: wingRoot.y - form.wings.height * (0.68 - pose.wingFlap * 0.12),
              z: wingRoot.z + side * form.wings.span * form.wings.trail
            };
            this.addTriPrism(scene, {
              a: wingRoot,
              b: wingTip,
              c: wingLower,
              thickness: form.wings.thickness,
              palette: wingPalette,
              line: shadeHex(palette.wingDeep, 0.82)
            }, rootTransforms);
            if (form.wings.double) {
              const innerTip = {
                x: wingRoot.x - form.wings.height * 0.04,
                y: wingRoot.y + flapLift * 0.76,
                z: wingRoot.z + side * form.wings.span * 0.62
              };
              const innerLower = {
                x: wingRoot.x - form.wings.height * 0.18,
                y: wingRoot.y - form.wings.height * 0.38,
                z: wingRoot.z + side * form.wings.span * 0.42
              };
              this.addTriPrism(scene, {
                a: { x: wingRoot.x + 8, y: wingRoot.y + 4, z: wingRoot.z },
                b: innerTip,
                c: innerLower,
                thickness: form.wings.thickness * 0.7,
                palette: this.createFacePalette(mixHex(palette.wing, palette.accentSoft, 0.18), 1.18),
                line: shadeHex(palette.wingDeep, 0.78)
              }, rootTransforms);
            }
          });
        }

        if (form.chestCore > 0) {
          this.addDiamond(scene, {
            center: { x: chestAnchor.x + 8, y: chestAnchor.y - 2, z: 0 },
            size: form.chestCore,
            rotation: { z: bodyAngle * 0.4 },
            palette: {
              top: mixHex(palette.accentSoft, "#ffffff", 0.24),
              bottom: palette.accent,
              front: palette.accent,
              back: palette.accentDeep,
              left: shadeHex(palette.accent, 0.92),
              right: shadeHex(palette.accentSoft, 0.96)
            },
            line: shadeHex(palette.accentDeep, 0.84)
          }, rootTransforms);
        }

        const eyeBaseX = form.head.length * 0.18;
        const eyeBaseY = form.head.height * 0.08;
        const eyeZ = form.eyes.spacing;
        scene.effects.push({
          kind: "eye",
          position: transformChain({ x: eyeBaseX, y: eyeBaseY, z: -eyeZ }, [{ rotation: { z: headAngle } }, { position: headCenter }, ...rootTransforms]),
          size: form.eyes.size,
          color: palette.eye,
          tint: palette.accent,
          blink: pose.blink,
          rotate: -0.08
        });
        scene.effects.push({
          kind: "eye",
          position: transformChain({ x: eyeBaseX, y: eyeBaseY, z: eyeZ }, [{ rotation: { z: headAngle } }, { position: headCenter }, ...rootTransforms]),
          size: form.eyes.size * 0.96,
          color: palette.eye,
          tint: palette.accent,
          blink: pose.blink,
          rotate: 0.08
        });
        scene.effects.push({
          kind: "mouth",
          start: transformChain({ x: form.snout.length * 0.18, y: -form.snout.height * 0.08, z: -form.snout.depth * 0.16 }, [{ rotation: { z: headAngle } }, { position: snoutCenter }, ...rootTransforms]),
          end: transformChain({ x: form.snout.length * 0.18, y: -form.snout.height * 0.08, z: form.snout.depth * 0.16 }, [{ rotation: { z: headAngle } }, { position: snoutCenter }, ...rootTransforms]),
          open: pose.mouthOpen,
          color: palette.line
        });
        scene.effects.push({
          kind: "flame",
          position: transformChain({ x: tailJoint.x, y: tailJoint.y, z: 0 }, rootTransforms),
          size: form.tail.flame * (1 + pose.aura * 0.14),
          color: palette.accent,
          core: palette.accentSoft,
          pulse: pose.glowPulse
        });
        if (form.chestCore > 0) {
          scene.effects.push({
            kind: "core",
            position: transformChain({ x: chestAnchor.x + 8, y: chestAnchor.y - 2, z: 0 }, rootTransforms),
            size: form.chestCore * (0.8 + pose.glowPulse * 0.18),
            color: palette.accent,
            core: palette.accentSoft,
            pulse: pose.glowPulse
          });
        }
        for (let index = 0; index < 3; index += 1) {
          const sparkTime = pose.tailWave + index * 1.5;
          scene.effects.push({
            kind: "spark",
            position: transformChain({
              x: chestAnchor.x + Math.sin(sparkTime) * 18,
              y: chestAnchor.y + 26 + Math.cos(sparkTime * 1.2) * 18,
              z: (index - 1) * 18
            }, rootTransforms),
            size: 3 + pose.sparkle * 5,
            color: palette.accentSoft,
            angle: sparkTime
          });
        }
      }

      drawScene(scene, pose) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.save();
        this.ctx.translate(this.centerX, this.centerY + this.height * 0.2);
        this.ctx.scale(1, 0.3);
        const shadowRadius = this.width * 0.22 * pose.heroScale;
        const shadow = this.ctx.createRadialGradient(0, 0, shadowRadius * 0.18, 0, 0, shadowRadius);
        shadow.addColorStop(0, "rgba(88, 47, 17, 0.28)");
        shadow.addColorStop(1, "rgba(88, 47, 17, 0)");
        this.ctx.fillStyle = shadow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        const faces = [];
        scene.faces.forEach((face) => {
          const edgeA = sub3(face.points[1], face.points[0]);
          const edgeB = sub3(face.points[face.points.length - 1], face.points[0]);
          const normal = normalize(cross(edgeA, edgeB));
          const center = averagePoints(face.points);
          const view = normalize({ x: -center.x, y: -center.y, z: this.cameraDistance - center.z });
          if (!face.doubleSided && dot(normal, view) <= 0) {
            return;
          }
          const lightAmount = clamp(0.48 + dot(normal, this.lightDirection) * 0.42, 0.24, 1.2);
          faces.push({
            projected: face.points.map((point) => this.project(point)),
            depth: center.z,
            fill: shadeHex(face.fill, lightAmount),
            line: rgba(shadeHex(face.line, lightAmount * 0.86), 0.92)
          });
        });

        faces.sort((left, right) => left.depth - right.depth);
        faces.forEach((face) => {
          this.ctx.beginPath();
          this.ctx.moveTo(face.projected[0].x, face.projected[0].y);
          for (let index = 1; index < face.projected.length; index += 1) {
            this.ctx.lineTo(face.projected[index].x, face.projected[index].y);
          }
          this.ctx.closePath();
          this.ctx.fillStyle = face.fill;
          this.ctx.fill();
          this.ctx.strokeStyle = face.line;
          this.ctx.lineWidth = 1.1;
          this.ctx.stroke();
        });

        this.ctx.save();
        this.ctx.globalCompositeOperation = "lighter";
        scene.effects
          .slice()
          .sort((left, right) => left.position.z - right.position.z)
          .forEach((effect) => {
            if (effect.kind === "flame") {
              this.drawFlame(effect);
            }
            if (effect.kind === "core") {
              this.drawCore(effect);
            }
            if (effect.kind === "spark") {
              this.drawSpark(effect);
            }
          });
        this.ctx.restore();

        scene.effects.forEach((effect) => {
          if (effect.kind === "eye") {
            this.drawEye(effect);
          }
          if (effect.kind === "mouth") {
            this.drawMouth(effect);
          }
        });
      }

      frame(ts) {
        if (!this.dragState) {
          this.targetYaw = lerp(this.targetYaw, this.restYaw, 0.06);
          this.targetPitch = lerp(this.targetPitch, this.restPitch, 0.08);
        }
        this.currentYaw = lerp(this.currentYaw, this.targetYaw, 0.18);
        this.currentPitch = lerp(this.currentPitch, this.targetPitch, 0.18);
        const form = dragonForms[this.level] ?? dragonForms[1];
        const palette = createDragonPalette(this.element);
        const pose = this.getPose(ts, form);
        const scene = { faces: [], effects: [] };
        this.buildDragon(scene, form, pose, palette);
        this.drawScene(scene, pose);
        requestAnimationFrame(this.frame);
      }
    }

    const dragonStage = new DragonStage({
      stageEl: pet3dStage,
      canvas: pet3dCanvas,
      bubble: petSpeechBubble,
      bubbleText: petSpeechText,
      getContext: () => ({
        mode: state.petMode,
        queueCount: state.rewardQueue.length,
        level: state.level,
        stageName: getStageMeta().name
      })
    });

    function setElementSwitcherOpen(isOpen) {
      elementSwitcher.classList.toggle("is-open", isOpen);
      elementCoreButton.setAttribute("aria-expanded", String(isOpen));
    }

    function setEvolutionOpen(isOpen) {
      petEvolutionShell.classList.toggle("is-open", isOpen);
      petEvolutionTrigger.setAttribute("aria-expanded", String(isOpen));
    }

    function setEvolutionModalOpen(isOpen) {
      evolutionModal.classList.toggle("is-open", isOpen);
      evolutionModal.setAttribute("aria-hidden", String(!isOpen));
    }

    function getStageMeta(level = state.level) {
      return petStages.find((stage) => stage.level === level) ?? petStages[0];
    }

    function getNextStageMeta(level = state.level) {
      return petStages.find((stage) => stage.level === level + 1) ?? null;
    }

    function getElementMeta(elementKey = state.activeElement) {
      return elementMeta[elementKey] ?? elementMeta.fire;
    }

    function getUnlockedElements(level = state.level) {
      return elementOrder.filter((elementKey) => elementMeta[elementKey].unlockStage <= level);
    }

    function syncUnlockedElements() {
      state.unlockedElements = getUnlockedElements();
      if (!state.unlockedElements.includes(state.activeElement)) {
        state.activeElement = state.unlockedElements[0];
      }
    }

    function canEvolve() {
      const currentStage = getStageMeta();
      return (
        currentStage.nextGrowth !== null &&
        state.growth >= currentStage.nextGrowth &&
        state.crystals >= currentStage.nextCrystals
      );
    }

    function renderCrystalRow(requiredCrystals) {
      crystalRow.innerHTML = "";
      const slots = requiredCrystals ?? 4;
      const litCount = requiredCrystals === null ? 4 : Math.min(state.crystals, requiredCrystals);

      for (let index = 0; index < slots; index += 1) {
        const crystal = document.createElement("span");
        crystal.className = "crystal-dot";
        if (index < litCount) {
          crystal.classList.add("is-lit");
        }
        crystalRow.appendChild(crystal);
      }
    }

    function getRewardGlyph(rewardName = "") {
      if (/[\u6676\u77FF\u77F3\u91D1\u5E01]/.test(rewardName)) return "\uD83D\uDC8E";
      if (/[\u4E66\u7B7E\u7FBD\u53F7]/.test(rewardName)) return "\u2726";
      if (/[\u7CD6\u997C\u70B9\u5FC3\u9EA6\u996D\u56E2]/.test(rewardName)) return "\uD83C\uDF6A";
      if (/\u6273\u624B/.test(rewardName)) return "\u2692\uFE0F";
      if (/[\u679C\u8393\u6843\u51BB]/.test(rewardName)) return "\uD83C\uDF4E";
      return "\uD83C\uDF56";
    }

    function showPetFeedback(message, tone = "growth") {
      const duration = tone === "element" ? 920 : tone === "warn" ? 1080 : 1450;
      window.clearTimeout(petFeedbackTimer);
      petFeedback.textContent = message;
      petFeedback.dataset.tone = tone;
      petFeedback.classList.remove("is-visible");
      void petFeedback.offsetWidth;
      petFeedback.classList.add("is-visible");
      petFeedbackTimer = window.setTimeout(() => {
        petFeedback.classList.remove("is-visible");
      }, duration);
    }

    function scheduleEvolutionCue() {
      window.clearTimeout(evolutionCueTimer);
      evolutionCueTimer = window.setTimeout(() => {
        showPetFeedback("\u53EF\u8FDB\u5316", "evolve");
      }, 760);
    }

    function triggerElementShift() {
      window.clearTimeout(elementShiftTimer);
      petWrap.classList.remove("is-element-shifting");
      petCore.classList.remove("is-element-shifting");
      void petCore.offsetWidth;
      petWrap.classList.add("is-element-shifting");
      petCore.classList.add("is-element-shifting");
      elementShiftTimer = window.setTimeout(() => {
        petWrap.classList.remove("is-element-shifting");
        petCore.classList.remove("is-element-shifting");
      }, 920);
    }

    function pulseGrowthRail() {
      growthFill.classList.remove("is-pulsing");
      void growthFill.offsetWidth;
      growthFill.classList.add("is-pulsing");
      window.setTimeout(() => {
        growthFill.classList.remove("is-pulsing");
      }, 580);
    }

    function launchFeedProjectile(rewardName) {
      const source = rewardIcons.querySelector(".reward-drop:not(.is-empty)") ?? rewardBanner;
      if (!source) return;

      const sourceRect = source.getBoundingClientRect();
      const targetRect = petCore.getBoundingClientRect();
      const flyingDrop = document.createElement("div");
      flyingDrop.className = "flying-drop";
      flyingDrop.textContent = getRewardGlyph(rewardName);
      flyingDrop.style.left = `${sourceRect.left + sourceRect.width / 2}px`;
      flyingDrop.style.top = `${sourceRect.top + sourceRect.height / 2}px`;
      flyingDrop.style.setProperty("--fly-x", `${targetRect.left + targetRect.width * 0.56 - (sourceRect.left + sourceRect.width / 2)}px`);
      flyingDrop.style.setProperty("--fly-y", `${targetRect.top + targetRect.height * 0.34 - (sourceRect.top + sourceRect.height / 2)}px`);
      document.body.appendChild(flyingDrop);
      rewardBanner.classList.add("is-feeding");

      requestAnimationFrame(() => {
        flyingDrop.classList.add("is-flying");
      });

      window.setTimeout(() => {
        rewardBanner.classList.remove("is-feeding");
        flyingDrop.remove();
      }, 780);
    }

    function renderRewardQueue() {
      rewardIcons.innerHTML = "";
      const visibleRewards = state.rewardQueue.slice(0, 3);
      const overflow = Math.max(state.rewardQueue.length - visibleRewards.length, 0);

      rewardBanner.classList.toggle("is-empty", state.rewardQueue.length === 0);
      rewardIcons.classList.toggle("is-empty", state.rewardQueue.length === 0);
      rewardOverflow.hidden = overflow === 0;
      rewardOverflow.textContent = `+${overflow}`;

      if (visibleRewards.length === 0) {
        const emptyDrop = document.createElement("span");
        emptyDrop.className = "reward-drop is-empty";
        emptyDrop.textContent = "\u5F85\u8865\u7ED9";
        rewardIcons.appendChild(emptyDrop);
        return;
      }

      visibleRewards.forEach((rewardName) => {
        const rewardDrop = document.createElement("span");
        rewardDrop.className = "reward-drop";

        const icon = document.createElement("span");
        icon.className = "reward-drop-icon";
        icon.textContent = getRewardGlyph(rewardName);

        const copy = document.createElement("span");
        copy.className = "reward-drop-copy";
        const overline = document.createElement("small");
        overline.textContent = "supply";
        const label = document.createElement("span");
        label.textContent = rewardName;

        copy.append(overline, label);
        rewardDrop.append(icon, copy);
        rewardIcons.appendChild(rewardDrop);
      });
    }

    function createUnlockedEvolutionAvatar(stageLevel) {
      const avatar = document.createElement("div");
      avatar.className = `evolution-avatar stage-${stageLevel}`;
      const wings = document.createElement("div");
      wings.className = "evolution-wings";
      const neck = document.createElement("div");
      neck.className = "evolution-neck";
      const spines = document.createElement("div");
      spines.className = "evolution-spines";
      for (let index = 0; index < 4; index += 1) {
        spines.appendChild(document.createElement("span"));
      }
      const chestCore = document.createElement("div");
      chestCore.className = "evolution-chest-core";
      const guardLeft = document.createElement("div");
      guardLeft.className = "evolution-guard evolution-guard-left";
      const guardRight = document.createElement("div");
      guardRight.className = "evolution-guard evolution-guard-right";
      const face = document.createElement("div");
      face.className = "evolution-face";
      const eyes = document.createElement("div");
      eyes.className = "evo-eye-core";
      const crown = document.createElement("div");
      crown.className = "evolution-crown";
      crown.appendChild(document.createElement("span"));
      face.appendChild(eyes);
      avatar.append(wings, neck, spines, chestCore, guardLeft, guardRight, face, crown);
      return avatar;
    }

    function createLockedDexAvatar(isNext) {
      const lock = document.createElement("div");
      lock.className = "evolution-lock is-mini";
      lock.textContent = isNext ? "?" : "???";
      return lock;
    }

    function createElementBadge(elementKey, isUnlocked, isActive = false) {
      const meta = elementMeta[elementKey];
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.dataset.element = elementKey;
      if (!isUnlocked) {
        badge.classList.add("is-locked");
      }
      if (isActive) {
        badge.classList.add("is-active");
      }

      const icon = document.createElement("span");
      icon.className = "element-badge-icon";
      const label = document.createElement("span");
      label.textContent = isUnlocked ? meta.name : "???";

      badge.append(icon, label);
      return badge;
    }

    function renderElementSwitcher() {
      syncUnlockedElements();
      const activeMeta = getElementMeta();
      elementCoreLabel.textContent = activeMeta.coreLabel;
      elementCoreButton.dataset.element = state.activeElement;
      elementCoreButton.setAttribute("aria-label", `切换属性，当前${activeMeta.name}`);

      elementOrbit.querySelectorAll(".element-chip").forEach((chip) => {
        const elementKey = chip.dataset.element;
        const meta = elementMeta[elementKey];
        const unlocked = state.unlockedElements.includes(elementKey);
        const active = state.activeElement === elementKey;
        const label = chip.querySelector(".element-chip-label");
        const note = chip.querySelector(".element-lock-note");

        chip.dataset.state = active ? "active" : unlocked ? "unlocked" : "locked";
        chip.classList.toggle("is-active", active);
        chip.classList.toggle("is-locked", !unlocked);
        chip.setAttribute("aria-pressed", String(active));
        chip.setAttribute("aria-disabled", String(!unlocked));

        if (label) {
          label.textContent = unlocked ? meta.name : "???";
        }

        if (note) {
          note.textContent = active ? "激活" : unlocked ? "可切" : `${meta.unlockStage}阶`;
        }
      });
    }

    function activateElement(elementKey) {
      const meta = elementMeta[elementKey];
      if (!meta) return;

      if (!state.unlockedElements.includes(elementKey)) {
        showPetFeedback(`${meta.unlockStage}阶解锁`, "warn");
        setElementSwitcherOpen(false);
        return;
      }

      const changed = state.activeElement !== elementKey;
      state.activeElement = elementKey;
      setElementSwitcherOpen(false);
      renderStage(false);

      if (changed) {
        triggerElementShift();
        showPetFeedback(meta.activeCue, "element");
      }
    }

    function renderEvolutionGallery() {
      evolutionRail.innerHTML = "";

      const currentStage = getStageMeta();
      const nextStage = getNextStageMeta();

      petStages.forEach((stage) => {
        const card = document.createElement("article");
        card.className = "evolution-card";
        const stateTag = document.createElement("div");
        stateTag.className = "evolution-state";
        const title = document.createElement("h4");
        const copy = document.createElement("p");

        if (stage.level < state.level) {
          card.classList.add("is-unlocked");
          stateTag.textContent = "已解锁";
          title.textContent = stage.name;
          copy.textContent = stage.description;
          card.appendChild(stateTag);
          card.appendChild(createUnlockedEvolutionAvatar(stage.level));
        } else if (stage.level === state.level) {
          card.classList.add("is-current");
          stateTag.textContent = "当前阶段";
          title.textContent = stage.name;
          copy.textContent = "当前伙伴";
          card.appendChild(stateTag);
          card.appendChild(createUnlockedEvolutionAvatar(stage.level));
        } else if (nextStage && stage.level === nextStage.level) {
          card.classList.add("is-locked", "is-next");
          stateTag.textContent = "即将揭晓";
          title.textContent = "???";
          copy.textContent = "下一阶解锁";
          const lock = document.createElement("div");
          lock.className = "evolution-lock";
          lock.textContent = "?";
          card.appendChild(stateTag);
          card.appendChild(lock);
        } else {
          card.classList.add("is-locked");
          stateTag.textContent = "封印中";
          title.textContent = "???";
          copy.textContent = "神秘形态";
          const lock = document.createElement("div");
          lock.className = "evolution-lock";
          lock.textContent = "???";
          card.appendChild(stateTag);
          card.appendChild(lock);
        }

        const unlockRow = document.createElement("div");
        unlockRow.className = "element-unlock-row";
        const unlockTitle = document.createElement("div");
        unlockTitle.className = "element-unlock-title";
        unlockTitle.textContent = "本阶新增";
        unlockRow.appendChild(unlockTitle);
        unlockRow.appendChild(
          createElementBadge(
            stage.unlockElement,
            stage.level <= state.level,
            state.activeElement === stage.unlockElement && stage.level <= state.level
          )
        );

        card.appendChild(title);
        card.appendChild(copy);
        card.appendChild(unlockRow);
        evolutionRail.appendChild(card);
      });

      evolutionSummaryTitle.textContent = `当前：${currentStage.name}`;
      evolutionSummaryCopy.textContent = `已解锁 ${state.level} 阶 / ${state.unlockedElements.length} 元素`;

      if (!nextStage) {
        evolutionGoalTitle.textContent = "已满级";
        evolutionGoalCopy.textContent = `当前属性：${getElementMeta().name}`;
      } else {
        const growthLeft = Math.max(currentStage.nextGrowth - state.growth, 0);
        const crystalLeft = Math.max(currentStage.nextCrystals - state.crystals, 0);
        evolutionGoalTitle.textContent = `下一阶：${nextStage.name}`;
        evolutionGoalCopy.textContent = `差 ${growthLeft} 成长 / ${crystalLeft} 晶核 · 解锁${elementMeta[nextStage.unlockElement].name}`;
      }
    }

    function getDayStatusMeta(day, index) {
      if (day.restDay) return { label: "休息", tone: "rest" };
      const doneCount = day.tasks.filter((task) => task.done).length;
      if (index === todayIndex) {
        if (doneCount === day.tasks.length && day.tasks.length > 0) {
          return { label: "已完成", tone: "complete" };
        }
        return doneCount > 0
          ? { label: "进行中", tone: "active" }
          : { label: "待开始", tone: "pending" };
      }
      if (doneCount === 0) {
        return index < todayIndex
          ? { label: "未开", tone: "locked" }
          : { label: "待战", tone: "future" };
      }
      if (doneCount === day.tasks.length) return { label: "已攻克", tone: "complete" };
      return { label: "进行中", tone: "active" };
    }

    function getStars(doneCount, totalCount, isRestDay) {
      if (isRestDay || totalCount === 0) return 0;
      return Math.ceil((doneCount / totalCount) * 5);
    }

    function renderDayStrip() {
      dayStrip.innerHTML = "";

      weekData.forEach((day, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "day-chip";

        if (index === state.selectedIndex) {
          button.classList.add("is-selected");
        }

        if (index === todayIndex) {
          button.classList.add("is-today");
        }

        const status = getDayStatusMeta(day, index);
        button.dataset.status = status.tone;
        button.innerHTML = `
          <div class="day-top-slot">${index === todayIndex ? '<span class="day-today-tag">TODAY</span>' : ""}</div>
          <div class="day-name">周${day.label}</div>
          <div class="day-date">${day.date}</div>
          <div class="day-state is-${status.tone}">${status.label}</div>
        `;

        button.addEventListener("click", () => {
          state.selectedIndex = index;
          render();
        });

        dayStrip.appendChild(button);
      });
    }

    function renderTasks(selectedDay) {
      taskList.innerHTML = "";

      if (selectedDay.restDay) {
        const restCard = document.createElement("article");
        restCard.className = "task-card is-done";
        restCard.innerHTML = `
          <div class="task-meta">
            <span class="subject-badge reading">修整日</span>
            <span class="task-time">无固定时长</span>
          </div>
          <h4 class="task-title">今天自由修整</h4>
          <p class="task-copy">伙伴会在营地巡逻、晒太阳、补充体力。你也可以自由阅读或放松一下。</p>
          <div class="task-foot">
            <span class="task-reward">休息不断连</span>
            <button class="task-button" type="button" disabled>修整日</button>
          </div>
        `;
        taskList.appendChild(restCard);
        return;
      }

      selectedDay.tasks.forEach((task) => {
        const card = document.createElement("article");
        card.className = "task-card";
        if (task.done) {
          card.classList.add("is-done");
        }

        const buttonLabel = task.done ? "已攻克" : "去完成";
        const buttonDisabled = task.done ? "disabled" : "";

        card.innerHTML = `
          <div class="task-meta">
            <span class="subject-badge ${task.subject}">${task.subjectLabel}</span>
            <span class="task-time">${task.time}</span>
          </div>
          <h4 class="task-title">${task.title}</h4>
          <p class="task-copy">${task.copy}</p>
          <div class="task-foot">
            <span class="task-reward">奖励 ${task.reward}</span>
            <button class="task-button" type="button" data-task-id="${task.id}" ${buttonDisabled}>${buttonLabel}</button>
          </div>
        `;

        const button = card.querySelector(".task-button");
        button.addEventListener("click", () => {
          completeTask(selectedDay.key, task.id, task.reward);
        });

        taskList.appendChild(card);
      });
    }

    function completeTask(dayKey, taskId, rewardName) {
      const day = weekData.find((entry) => entry.key === dayKey);
      const task = day.tasks.find((entry) => entry.id === taskId);

      if (!task || task.done) {
        return;
      }

      task.done = true;
      state.rewardQueue.push(rewardName);
      state.lastFeed = "";
      const summaryParts = [`${rewardName} +1`];
      let dragonCopy = "补给到手！";

      if (day.tasks.every((entry) => entry.done) && !day.crystalAwarded) {
        day.crystalAwarded = true;
        state.crystals += 1;
        summaryParts.push("\u6676\u6838+1");
        showPetFeedback("\u6676\u6838+1", "crystal");
        dragonCopy = "晶核到手，离进化更近了！";

        if (canEvolve()) {
          state.lastFeed = "\u5DF2\u6EE1\u8DB3\u8FDB\u5316";
          scheduleEvolutionCue();
          dragonCopy = "补给和晶核都齐了！";
        }
      }

      state.lastReward = summaryParts.join(" / ");
      dragonStage.trigger("reward", { message: dragonCopy, tone: "talk" });
      render();
    }

    function feedPet() {
      if (state.rewardQueue.length === 0) {
        state.lastFeed = "\u53BB\u62FF\u8865\u7ED9";
        dragonStage.trigger("talk", { message: "先完成委托，我再吃补给！", tone: "talk" });
        render();
        return;
      }

      const rewardName = state.rewardQueue.shift();
      state.lastReward = "";
      state.growth = Math.min(100, state.growth + 12);
      state.lastFeed = "\u6210\u957F+12";
      launchFeedProjectile(rewardName);
      pulseGrowthRail();
      showPetFeedback("\u6210\u957F+12", "growth");
      dragonStage.trigger("feed", { message: `${rewardName} 真香！`, tone: "feed" });

      if (canEvolve()) {
        state.lastFeed = "\u5DF2\u6EE1\u8DB3\u8FDB\u5316";
        scheduleEvolutionCue();
      }

      render(true);
    }

    function evolvePet() {
      if (!canEvolve()) {
        state.lastFeed = "\u8FD8\u5DEE\u4E00\u70B9";
        dragonStage.trigger("talk", { message: "再喂我一点点，我们就能进化！", tone: "talk" });
        render();
        return;
      }

      const currentStage = getStageMeta();
      const nextStage = getNextStageMeta();
      const previousUnlockCount = state.unlockedElements.length;

      state.crystals -= currentStage.nextCrystals;
      state.growth = 18;
      state.level += 1;
      syncUnlockedElements();
      state.lastReward = "";
      state.lastFeed = `${currentStage.name} -> ${nextStage.name}`;
      pulseGrowthRail();
      showPetFeedback("\u8FDB\u5316\uFF01", "evolve");
      dragonStage.trigger("evolveBurst", { message: `${nextStage.name}，登场！`, tone: "evolve" });

      if (state.unlockedElements.length > previousUnlockCount) {
        const unlockedMeta = elementMeta[nextStage.unlockElement];
        state.lastFeed = `${currentStage.name} -> ${nextStage.name} / 解锁${unlockedMeta.name}`;
        window.setTimeout(() => {
          showPetFeedback(`${unlockedMeta.name}解锁`, "element");
        }, 520);
      }

      petCore.classList.add("is-evolving");
      window.setTimeout(() => {
        petCore.classList.remove("is-evolving");
      }, 1400);

      render(true);
    }

    function getSelectedDay() {
      return weekData[state.selectedIndex];
    }

    function renderStage(animateHappy) {
      syncUnlockedElements();
      const selectedDay = getSelectedDay();
      const doneCount = selectedDay.tasks.filter((task) => task.done).length;
      const totalCount = selectedDay.tasks.length;
      const isRestDay = selectedDay.restDay;
      const stars = getStars(doneCount, totalCount, isRestDay);
      const queueCount = state.rewardQueue.length;
      const hasQueue = queueCount > 0;
      const currentStage = getStageMeta();
      const nextStage = getNextStageMeta();
      const evolutionReady = canEvolve();
      const currentStageName = currentStage.name;
      let petMode = "idle";

      selectedDayLabel.textContent = `${selectedDay.fullLabel} / ${selectedDay.date}`;
      progressValue.textContent = isRestDay ? "\u4F11\u606F\u65E5" : `${doneCount}/${totalCount}`;
      starsValue.textContent = `${stars}`;
      streakValue.textContent = `${state.streak}\u5929`;
      badgeLevel.textContent = `${state.level}`;
      badgeCrystal.textContent = currentStage.nextCrystals === null ? "MAX" : `${state.crystals}`;
      growthFill.style.width = `${state.growth}%`;
      growthPercent.textContent = `${state.growth}%`;
      growthPoints.textContent = `\u6210\u957F\u503C ${state.growth} / 100`;
      petWrap.dataset.element = state.activeElement;
      petCore.dataset.stage = String(state.level);
      petCore.dataset.element = state.activeElement;
      petStageName.textContent = currentStageName;
      petHeroLevel.textContent = `Lv ${state.level}`;
      petHeroStageName.textContent = currentStageName;
      profileSubtitle.textContent = `今天继续带着${currentStageName}完成委托。`;

      if (currentStage.level === 5) {
        petEvolutionHint.textContent = "\u6700\u7EC8\u5F62\u6001";
        petEvolutionTrigger.textContent = "\u5DF2\u6EE1\u7EA7";
        growthHint.textContent = "\u5DF2\u6EE1\u7EA7";
        renderCrystalRow(null);
        evolveButton.hidden = true;
      } else if (evolutionReady) {
        petEvolutionHint.textContent = `\u70B9\u6B64\u8FDB\u5316\u4E3A ${nextStage.name}`;
        petEvolutionTrigger.textContent = "\u53EF\u8FDB\u5316";
        growthHint.textContent = "\u70B9\u51FB\u8FDB\u5316";
        renderCrystalRow(currentStage.nextCrystals);
        evolveButton.hidden = false;
        evolveButton.textContent = `\u8FDB\u5316\u6210 ${nextStage.name}`;
      } else {
        const growthLeft = Math.max(currentStage.nextGrowth - state.growth, 0);
        const crystalLeft = Math.max(currentStage.nextCrystals - state.crystals, 0);
        petEvolutionHint.textContent = `\u5DEE ${growthLeft} \u6210\u957F / ${crystalLeft} \u6676\u6838`;
        petEvolutionTrigger.textContent = "\u8FDB\u5316";
        growthHint.textContent = "\u6BCF\u6B21\u6295\u5582 +12";
        renderCrystalRow(currentStage.nextCrystals);
        evolveButton.hidden = true;
      }

      renderEvolutionGallery();
      renderElementSwitcher();
      petCore.classList.toggle("is-happy", Boolean(animateHappy || hasQueue));

      if (isRestDay) {
        petMode = "rest";
        petMoodTag.textContent = "\u4FEE\u6574";
      } else if (evolutionReady) {
        petMode = "evolve";
        petMoodTag.textContent = "\u53EF\u8FDB\u5316";
      } else if (doneCount === 0) {
        petMode = "idle";
        petMoodTag.textContent = "\u5F85\u547D";
      } else if (doneCount < totalCount) {
        petMode = hasQueue ? "hungry" : "ready";
        petMoodTag.textContent = hasQueue ? "\u5F85\u5582" : "\u8FDB\u884C\u4E2D";
      } else {
        petMode = "complete";
        petMoodTag.textContent = hasQueue ? "\u5F85\u5582" : "\u6EE1\u72B6\u6001";
      }

      state.petMode = petMode;
      petWrap.dataset.mode = petMode;
      petCore.dataset.mode = petMode;
      petDragHint.textContent = evolutionReady
        ? "拖动旋转 · 现在可进化"
        : hasQueue
          ? "拖动旋转 · 记得喂食"
          : petMode === "rest"
            ? "拖动旋转 · 今天轻松巡逻"
            : "拖动旋转 · 点一点会回应";
      dragonStage.setState({
        level: state.level,
        element: state.activeElement,
        mode: petMode,
        queueCount,
        stageName: currentStageName
      });
      renderRewardQueue();

      if (state.lastFeed) {
        rewardCopy.textContent = state.lastFeed;
      } else if (state.lastReward) {
        rewardCopy.textContent = state.lastReward;
      } else if (hasQueue) {
        rewardCopy.textContent = `\u5F85\u6295\u5582 ${queueCount} \u4EFD`;
      } else {
        rewardCopy.textContent = "\u53BB\u62FF\u8865\u7ED9";
      }

      feedButton.textContent = queueCount > 1 ? `\u5582\u7ED9\u4F19\u4F34 x${queueCount}` : "\u5582\u7ED9\u4F19\u4F34";
      feedButton.disabled = queueCount === 0;
      petFeedShortcut.textContent = queueCount === 0 ? "\u5F85\u8865\u7ED9" : queueCount > 1 ? `\u5582\u98DFx${queueCount}` : "\u5582\u98DF";
      petFeedShortcut.disabled = queueCount === 0;
      petFeedShortcut.classList.toggle("is-empty", queueCount === 0);
    }

    function render(animateHappy = false) {
      renderDayStrip();
      renderTasks(getSelectedDay());
      renderStage(animateHappy);
    }

    feedButton.addEventListener("click", feedPet);
    petTalkButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setElementSwitcherOpen(false);
      setEvolutionOpen(false);
      dragonStage.talkFromContext();
    });
    petNapButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setElementSwitcherOpen(false);
      setEvolutionOpen(false);
      dragonStage.talkFromContext("nap");
    });
    petFeedShortcut.addEventListener("click", (event) => {
      event.stopPropagation();
      setEvolutionOpen(false);
      feedPet();
    });
    evolveButton.addEventListener("click", evolvePet);
    elementCoreButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextOpen = !elementSwitcher.classList.contains("is-open");
      setElementSwitcherOpen(nextOpen);
    });
    elementOrbit.querySelectorAll(".element-chip").forEach((chip) => {
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        activateElement(chip.dataset.element);
      });
    });
    openEvolutionGalleryButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setElementSwitcherOpen(false);
      setEvolutionOpen(false);
      setEvolutionModalOpen(true);
    });
    closeEvolutionModalButton.addEventListener("click", () => {
      setEvolutionModalOpen(false);
    });
    petEvolutionTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextOpen = !petEvolutionShell.classList.contains("is-open");
      setEvolutionOpen(nextOpen);
    });
    petEvolutionShell.addEventListener("mouseleave", () => {
      setEvolutionOpen(false);
    });
    elementSwitcher.addEventListener("mouseleave", () => {
      setElementSwitcherOpen(false);
    });
    document.addEventListener("click", (event) => {
      if (!elementSwitcher.contains(event.target)) {
        setElementSwitcherOpen(false);
      }
      if (!petEvolutionShell.contains(event.target)) {
        setEvolutionOpen(false);
      }
      if (event.target === evolutionModal) {
        setEvolutionModalOpen(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setElementSwitcherOpen(false);
        setEvolutionOpen(false);
        setEvolutionModalOpen(false);
      }
    });
    render();
