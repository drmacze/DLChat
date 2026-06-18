export type AIMood = "happy" | "chill" | "playful" | "flirty" | "sad" | "excited" | "tired" | "sarcastic";
export type AIGender = "male" | "female";
export type AICountry = "id" | "us" | "sg" | "jp" | "in" | "br" | "de" | "uk";

export interface AIPersona {
  id: string;
  name: string;
  country: AICountry;
  gender: AIGender;
  age: number;
  personality: string;
  avatarEmoji: string;
  mood: AIMood;
  interests: string[];
  typingSpeed: "fast" | "normal" | "slow";
}

// ─── Persona Data ──────────────────────────────────────────────────────────────

const namesByCountry: Record<AICountry, { male: string[]; female: string[] }> = {
  id: {
    male: ["Rizky", "Farhan", "Kevin", "Bryan", "Dimas", "Aldi", "Bima", "Rafi", "Bagas", "Satria", "Galih", "Fauzan", "Iqbal", "Hafizh", "Naufal", "Arif", "Daffa", "Raihan", "Gibran", "Wahyu"],
    female: ["Putri", "Ayu", "Nadia", "Zahra", "Dinda", "Salsa", "Rara", "Citra", "Fina", "Tasya", "Bella", "Sinta", "Andin", "Kezia", "Tiara", "Aurel", "Nabila", "Intan", "Cantika", "Dhea"],
  },
  us: {
    male: ["Liam", "Noah", "Aiden", "Caden", "Mason", "Jayden", "Ethan", "Logan", "Tyler", "Chase", "Brandon", "Dylan", "Austin", "Blake", "Connor"],
    female: ["Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Luna", "Chloe", "Zoe", "Riley", "Lily", "Hannah", "Aria", "Scarlett", "Nora"],
  },
  sg: {
    male: ["Ethan", "Ryan", "Marcus", "Darren", "Justin", "Brandon", "Wesley", "Nathan", "Jordan", "Derek"],
    female: ["Sarah", "Priya", "Mei", "Jasmine", "Alicia", "Rachel", "Nicole", "Vanessa", "Clarissa", "Alyssa"],
  },
  jp: {
    male: ["Haruto", "Yuki", "Sora", "Ren", "Aoi", "Kaito", "Sota", "Hiroki", "Yuto", "Kenji"],
    female: ["Hana", "Yui", "Sakura", "Mio", "Nana", "Rin", "Yuna", "Akari", "Koharu", "Misaki"],
  },
  in: {
    male: ["Aryan", "Rohan", "Aditya", "Vikram", "Karan", "Dev", "Ayaan", "Ishaan", "Vihaan", "Rehan"],
    female: ["Priya", "Ananya", "Riya", "Shreya", "Ishita", "Pooja", "Aisha", "Diya", "Kavya", "Simran"],
  },
  br: {
    male: ["Lucas", "Gabriel", "Matheus", "Pedro", "Felipe", "João", "Gustavo", "Rafael", "Bruno", "Thiago"],
    female: ["Ana", "Beatriz", "Camila", "Julia", "Larissa", "Fernanda", "Gabriela", "Isabella", "Leticia", "Mariana"],
  },
  de: {
    male: ["Lukas", "Finn", "Leon", "Jonas", "Elias", "Noah", "Ben", "Felix", "Julian", "Niklas"],
    female: ["Lena", "Emma", "Hannah", "Mia", "Sophia", "Clara", "Leonie", "Anna", "Laura", "Jana"],
  },
  uk: {
    male: ["Oliver", "Jack", "Harry", "George", "Charlie", "Alfie", "Freddie", "Archie", "Oscar", "Henry"],
    female: ["Amelia", "Olivia", "Isla", "Emily", "Poppy", "Ava", "Grace", "Millie", "Freya", "Evie"],
  },
};

const personalityProfiles = ["bubbly", "chill", "mysterious", "nerdy", "sporty", "artsy", "romantic", "adventurous", "witty", "empathetic"];

const interestSets = [
  ["ngopi", "drakor", "musik pop", "foto-fotoan", "skincare"],
  ["gaming", "coding", "anime", "mie ayam", "marvel"],
  ["gym", "futsal", "nongkrong", "spotify", "snapchat"],
  ["baca novel", "nulis diary", "konser", "aesthetic café", "thrifting"],
  ["travel", "fotografi", "street food", "cooking", "journaling"],
  ["film indie", "musik lofi", "desain", "kopi susu", "koleksi vinyl"],
  ["hiking", "yoga", "memasak", "podcast", "berkebun"],
  ["makeup", "fashion", "tiktok", "zumba", "nail art"],
  ["badminton", "motor", "bengkel", "ngopi", "karaoke"],
  ["melukis", "keramik", "pameran seni", "buku", "museum"],
];

const moodWeights: AIMood[] = ["happy", "happy", "chill", "chill", "playful", "excited", "tired", "flirty"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickUnique<T>(arr: T[], exclude: T[]): T {
  const filtered = arr.filter(x => !exclude.includes(x));
  if (filtered.length === 0) return pickRandom(arr);
  return pickRandom(filtered);
}

export function createAIPersona(country: AICountry, gender: AIGender): AIPersona {
  const names = namesByCountry[country][gender];
  const name = pickRandom(names);
  const age = 19 + Math.floor(Math.random() * 8);
  const personality = pickRandom(personalityProfiles);
  const emojisMale = ["🧑", "👦", "😎", "🤙", "🧢", "🎧", "🙋‍♂️", "🤟"];
  const emojisFemale = ["👧", "🙋‍♀️", "💁‍♀️", "🌸", "✨", "🫶", "🌺", "🦋"];
  const avatarEmoji = pickRandom(gender === "male" ? emojisMale : emojisFemale);
  const mood = pickRandom(moodWeights);
  return {
    id: `ai_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    name, country, gender, age, personality, avatarEmoji, mood,
    interests: pickRandom(interestSets),
    typingSpeed: pickRandom(["fast", "normal", "normal", "slow"] as const[]),
  };
}

export function getDefaultPersonas(): AIPersona[] {
  return [
    createAIPersona("id", "female"),
    createAIPersona("id", "male"),
    createAIPersona("us", "female"),
    createAIPersona("id", "male"),
    createAIPersona("sg", "female"),
    createAIPersona("id", "female"),
  ];
}

// ─── Intent Detection ──────────────────────────────────────────────────────────

type Intent =
  | "greeting" | "how_are_you" | "who_are_you" | "age" | "interests"
  | "food" | "romantic" | "sleep" | "laugh" | "acknowledge" | "thanks"
  | "sad" | "bored" | "morning" | "afternoon" | "evening" | "night"
  | "entertainment" | "music" | "work_study" | "location" | "happy_vibe"
  | "relationship_status" | "serious" | "advice" | "compliment" | "question_what"
  | "question_why" | "question_how" | "question_when" | "weather"
  | "future_plans" | "family" | "pet" | "sport" | "fashion" | "tech"
  | "social_media" | "travel" | "health" | "goodbye" | "miss_you"
  | "joke" | "debate" | "agree" | "disagree" | "surprise" | "general";

function detectIntent(text: string, history: Array<{ role: string; content: string }>): Intent {
  const t = text.toLowerCase().trim();
  const prevAI = history.filter(m => m.role === "ai").slice(-1)[0]?.content?.toLowerCase() ?? "";

  // Greetings
  if (/^(hai|halo|hi|hey|hello|hei|p+|hy|yo|sup|hii+|heii+|heyy+|halloooo|woi|woii)\b/.test(t)) return "greeting";

  // Time-based greetings
  if (/selamat pagi|good morning|pagi pagi|morning|ohayo/.test(t)) return "morning";
  if (/selamat sore|good afternoon|sore nih|evening/.test(t)) return "afternoon";
  if (/selamat malam|good evening|malem|malam nih/.test(t)) return "evening";
  if (/tidur|bobo|ngantuk|sleep|good night|selamat malam|istirahat|mau tidur|oyasumi/.test(t)) return "sleep";

  // About self
  if (/kabar|gimana|how are|how r u|apa kabar|sehat|doing\?|lagi gimana|lg gimana/.test(t)) return "how_are_you";
  if (/nama|siapa|who are|your name|namanya|lo siapa|kamu siapa/.test(t)) return "who_are_you";
  if (/umur|berapa tahun|how old|age|lahir|ultah|birthday/.test(t)) return "age";
  if (/suka|hobby|hobi|interest|fav|kesukaan|ngapain aja|aktifitas|kegiatan/.test(t)) return "interests";

  // Emotional
  if (/sedih|galau|nangis|sad|down|feel bad|gloomy|patah hati|kecewa|depresi|murung|nangis/.test(t)) return "sad";
  if (/seneng|happy|bahagia|yey|asik|seru|alhamdulillah|excited|good news|dapet|berhasil/.test(t)) return "happy_vibe";
  if (/bosen|boring|gabut|nothing to do|lagi ga ada|males|mager|jenuh|monoton/.test(t)) return "bored";

  // Reactions
  if (/wkwk|haha|lol|😂|🤣|lucu|ngakak|anjir|astaga|hihi|kwkw|hehe|hehhee/.test(t)) return "laugh";
  if (/^(ok|oke|iya|fine|siap|noted|bet|sip|deal|okok|iyaiya|yep|yups|noted|mantap|gas)\b/.test(t)) return "acknowledge";
  if (/makasih|thanks|thank you|terima kasih|thx|tq|ty\b/.test(t)) return "thanks";
  if (/miss|kangen|rindu|ngangenin|savanna|dimana|kemana|lama ga/.test(t)) return "miss_you";
  if (/waw|wow|gila|serius|beneran|masa|really|seriously|no way|mana mungkin|ga percaya/.test(t)) return "surprise";

  // Relationships
  if (/suka aku|suka kamu|cinta|love|sayang|crush|naksir|gebetan|pdkt|tembak|jadian|bucin/.test(t)) return "romantic";
  if (/pacar|single|jomblo|relationship|status|pacaran|belum punya|nyari pacar/.test(t)) return "relationship_status";
  if (/keluarga|ortu|ayah|ibu|kakak|adik|sodara|family|parent|sibling/.test(t)) return "family";

  // Daily life
  if (/makan|lapar|dinner|lunch|mau makan|ngopi|mie|bakso|gofood|ojol|grabfood|maem|sarapan|cemilan|snack|jajan/.test(t)) return "food";
  if (/main|game|gaming|film|nonton|series|movie|drakor|anime|netflix|disney/.test(t)) return "entertainment";
  if (/musik|lagu|dengerin|spotify|playlist|konser|nyanyi|beatbox|genre|band|artist/.test(t)) return "music";
  if (/kerja|kuliah|sekolah|job|study|work|kerjaan|tugas|pr|deadline|ujian|sidang|skripsi/.test(t)) return "work_study";
  if (/tinggal|domisili|where.*live|dari mana|asal|kota|alamat|daerah/.test(t)) return "location";
  if (/olahraga|gym|futsal|basket|renang|lari|sport|exercise|workout|fitness/.test(t)) return "sport";
  if (/fashion|baju|outfit|style|ootd|belanja|thrift|brand|sepatu|tas|shopping/.test(t)) return "fashion";
  if (/cuaca|panas|dingin|hujan|mendung|cerah|weather|gerimis|banjir/.test(t)) return "weather";
  if (/hewan|peliharaan|kucing|anjing|hamster|pet|manja|lucu banget/.test(t)) return "pet";
  if (/hp|gadget|laptop|tech|aplikasi|sosmed|ig|tiktok|twitter|twitter|youtube|reels/.test(t)) return "tech";
  if (/ig|instagram|tiktok|twit|twitter|sosmed|social|upload|posting|story|feed/.test(t)) return "social_media";
  if (/liburan|jalan-jalan|trip|travel|wisata|destinasi|hotel|pantai|gunung|camping/.test(t)) return "travel";
  if (/sehat|sakit|demam|dokter|health|vitamin|tidur cukup|minum air|wellness/.test(t)) return "health";
  if (/rencana|plan|besok|minggu depan|future|nanti|kapan|cita-cita|impian|goals/.test(t)) return "future_plans";
  if (/lucu|joke|lelucon|cerita lucu|ketawa|humor|receh|meme/.test(t)) return "joke";

  // Questions
  if (/\bapa\b|\bapaan\b|\bwhat\b/.test(t) && t.includes("?")) return "question_what";
  if (/\bkenapa\b|\bngapain\b|\bwhy\b|\bwhy'd\b/.test(t)) return "question_why";
  if (/\bgimanain\b|\bbagaimana\b|\bhow\b|\bcara\b/.test(t) && t.includes("?")) return "question_how";
  if (/\bkapan\b|\bwhen\b|\bwaktu\b/.test(t) && t.includes("?")) return "question_when";

  // Opinions / reactions
  if (/setuju|agree|bener|betul|iya sih|emang/.test(t)) return "agree";
  if (/ga setuju|gak setuju|beda|menurutku|tapi\b|hmm tapi|nah/.test(t)) return "disagree";
  if (/saran|gimana menurut|pendapat|advice|tips|rekomendasi|rekomen/.test(t)) return "advice";
  if (/kamu keren|kamu baik|kamu lucu|kamu cantik|kamu ganteng|kamu asik|good job|bagus|kece/.test(t)) return "compliment";
  if (/curhat|masalah|problem|bantuin|help me|cerita dong|dengerin/.test(t)) return "serious";

  // Goodbyes
  if (/dadah|bye|goodbye|dah|ciao|selamat tinggal|pamit|pergi dulu|brisik|sampai jumpa/.test(t)) return "goodbye";

  // Contextual reply based on previous AI message asking a question
  if (prevAI.includes("?") && t.length < 60) return "general";

  if (/\?/.test(t)) return "question_what";
  return "general";
}

// ─── Response Pools ────────────────────────────────────────────────────────────

type MoodPool = Partial<Record<AIMood, string[]>>;

function pick(pool: MoodPool, mood: AIMood, recentResponses: string[] = []): string {
  const options = pool[mood] ?? pool["chill"] ?? ["oke~"];
  return pickUnique(options, recentResponses);
}

// ─── Indonesian Response Pools ─────────────────────────────────────────────────

function buildIDResponsePools(persona: AIPersona, history: Array<{ role: string; content: string }>) {
  const n = persona.name;
  const age = persona.age;
  const hobby = pickRandom(persona.interests);
  const hobby2 = persona.interests[1] ?? hobby;
  const city = pickRandom(["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali", "Medan", "Semarang", "Malang"]);
  const campus = pickRandom(["UI", "ITB", "UGM", "Unair", "ITS", "Binus", "Unpad", "Undip"]);
  const food = pickRandom(["mie ayam", "bakso", "seblak", "nasi goreng", "soto", "gado-gado", "rawon", "sate"]);
  const drink = pickRandom(["kopi susu", "teh tarik", "matcha latte", "es teh", "boba", "thai tea"]);
  const show = pickRandom(["drakor", "anime", "film netflix", "series action", "reality show", "film horor lokal"]);
  const game = pickRandom(["Mobile Legends", "Genshin", "Valorant", "PUBG", "FF", "Among Us", "Stumble Guys"]);
  const artist = pickRandom(["Hindia", "Pamungkas", "Maliq & D'Essentials", "Weird Genius", "Raisa", "Tulus", "Bernadya"]);

  return {
    greeting: {
      happy: [
        `Haii!! aku ${n} 🙌 seneng banget ada yang nyapa!`,
        `Woi woi siapa nih~ aku ${n}, hai hai!! 😄`,
        `Halooo!! ${n} here, hari ini lagi good mood nih hehe`,
        `Hai hai! ${n} present!! siap temenan nih 🤩`,
        `Heyy, ${n} disini~ glad you reached out! 😊`,
        `HAIII!! siapa nih yang nyapa aku? ${n} nih hehe 🥳`,
        `Hai!! aku ${n}, lagi happy banget ketemu orang baru 😄`,
      ],
      chill: [
        `Hai hai~ ${n} here, lagi santai nih 😌`,
        `Heyy, ${n}. Lagi asik-asikan aja, sup? 😎`,
        `Woii apa kabar~ aku ${n} btw, lagi chilling 👋`,
        `Oh hay~ ${n} disini. Tumben ada yang mampir hehe`,
        `Hai. ${n} nih. Lagi rebahan sambil dengerin musik 🎧`,
        `Heyy~ ${n} sini. Gimana hari kamu? 😌`,
        `Yoo~ ${n} here. Hari ini santai banget lah 😊`,
      ],
      playful: [
        `HAIII!!! ${n} disini!! 🎉 siap temenan ga?`,
        `Hihihi hay hay!! Aku ${n} yang lucu hehee 🥳`,
        `Woi woi!! ${n} disini yeyyy akhirnya ada yang ngajak ngobrol!!`,
        `Heyyy!! jangan lupa aku ${n} ya, susah dilupain soalnya 😜`,
        `Hahai!! ${n} muncul!! 🎊 ready to have fun?`,
        `Hihihi siapa nih~ aku ${n}! asik deh ada temen baru 🤪`,
      ],
      flirty: [
        `Heyy kamu 👀 aku ${n}~ sapa dulu dong hehe`,
        `Haiii~ tumben ada yang nyapa, aku ${n} lho 😊`,
        `Oh hay~ ${n} disini, kebetulan lagi nunggu seseorang ngobrol 😏`,
        `Hii~ aku ${n}. Seneng kamu duluan yang say hi hehe 😊`,
        `Haiyaa~ ${n} nih. Katanya jangan sama orang asing, tapi kamu boleh deh 😌`,
      ],
      sad: [
        `...hai 🥺 aku ${n}, lagi kurang oke sih`,
        `Hii, ${n} nih. Lagi agak down tapi seneng ada yang nyapa`,
        `Hai... ${n} disini. Makasih udah mau ngobrol sama aku hari ini 🥺`,
        `Oh hey~ ${n}. Hari ini agak berat sih, tapi gapapa ngobrol yuk`,
      ],
      excited: [
        `HAIII HAIII!! aku lagi EXCITED banget!! ${n} ini!! 🔥`,
        `OMG haiii!! ${n} disini!! lagi happy poll today 🎉`,
        `YOOO!! ${n} here!! ADA YANG NYAPA YEYYY!! 🎊`,
        `Haii!! ${n}!! aku lagi semangat parah hari ini gajelas knp wkwk`,
      ],
      tired: [
        `hai... ${n} nih, maaf kalau slow response 😪`,
        `heyy... ${n} here, lagi ngantuk dikit hehe 😴`,
        `hai~ ${n}. Lagi agak exhausted sih, tapi siap dengerin kamu kok`,
        `Hmm hai... ${n} nih. Udah lama capek wkwk tapi gapapa ngobrol yuk`,
      ],
      sarcastic: [
        `Oh wow ada yang mau ngobrol. ${n} nih 🙃`,
        `Haloo~ aku ${n}, semoga ga nyesel ngobrol sama aku lol`,
        `Hai. ${n} present. Rare sih orang nyapa duluan wkwk`,
        `Oh, ada yang notice aku. ${n} nih. Terharu banget 🙃`,
      ],
    } as MoodPool,

    how_are_you: {
      happy: [
        "Baik banget!! lagi seneng-senengnya nih 😄 kamu?",
        "Alhamdulillah baik! hari ini bagus bgt 🌟 ada apa nih?",
        "Baikkk dong! lagi on fire today hehe~ kamu gimana?",
        "Baik baik!! abis dapet kabar bagus tadi, makanya happy bgt 😊",
        "Sangat baik!! entah kenapa hari ini vibe-nya positif banget~",
      ],
      chill: [
        "Baik sih, biasa aja~ lagi santai 😌 kamu?",
        "Oke-oke aja, rebahan hehhee. kamu sendiri gimana?",
        "Lumayan baik~ lagi mode santai. ada yang mau diceritain?",
        "Fine aja, nothing special tapi gapapa hehe. kamu?",
        "Baik lah~ ga ada yang spesial, enjoy aja hari ini 😌",
      ],
      sad: [
        "Sebenernya lagi kurang baik... tapi gpp, cerita yuk? 🥺",
        "Lagi galau dikit sih... 😔 makasih udah nanya btw",
        "Hmm jujurnya lagi down~ kamu mau dengerin ga? hehe",
        "Ehh jadi mau jujur... lagi gak terlalu baik nih 🥺",
      ],
      tired: [
        "Agak capek... tapi seneng ada yang tanya hehe",
        "Lagi ngantuk sih, tapi baik-baik aja 😪 kamu?",
        "Haduh capek banget hari ini~ tapi gapapa yuk ngobrol dulu 😄",
      ],
      flirty: [
        "Jadi lebih baik setelah ada kamu yang tanya 🥰",
        "Baik~ apalagi sekarang ada kamu hehe 😊",
        "Lumayan baik, tapi pasti tambah baik kalau ada temenin hehe",
      ],
      excited: ["BAIK BANGET!! lagi excited karena banyak hal!! 🔥 kamu gimana??"],
      sarcastic: ["Oh baik, tentu saja 🙃 ada yang perlu?", "Baik kok~ kenapa tiba-tiba nanya gitu wkwk"],
      playful: [
        "Baikkk!! lagi playful mood nih hehe~ kamu gimana??",
        "Wah tergantung kamu jawab apa wkwk, tapi baik kok 😜",
      ],
    } as MoodPool,

    who_are_you: {
      happy: [
        `Aku ${n}! ${age} tahun, lagi excited ketemu orang baru 😄 suka ${hobby} dan ${hobby2}. kamu siapa?`,
        `${n} nih!! umur ${age}, hobi ${hobby}. Nice to meet you! 🤩`,
        `Hai!! aku ${n}, ${age} tahun, domisili ${city}. suka ${hobby}! kamu?`,
      ],
      chill: [
        `Aku ${n}~ ${age} tahun, santai-santai aja orangnya 😌 suka ${hobby}. kamu?`,
        `${n} nih, bukan siapa-siapa hehe. ${age} tahun, domisili ${city}`,
        `Hmm aku ${n}. Orangnya simple aja, suka ${hobby} sama ${hobby2}~`,
      ],
      playful: [
        `Aku ${n}!! yang paling seru di antara semua kontak kamu pasti wkwk 🤪 ${age} tahun!`,
        `Siapa aku?? aku ${n} dong!! ${age} tahun, suka ${hobby}, dan lagi ngobrol sama kamu 😜`,
      ],
      flirty: [
        `Aku ${n}~ ${age} tahun, dan aku rasa kamu bakal suka ngobrol sama aku hehe 😊`,
        `${n} nih. ${age} tahun, suka ${hobby}. Tapi yang penting kamu siapa dulu dong 👀`,
      ],
      sad: [`Aku... ${n}. ${age} tahun. Lagi butuh temen ngobrol sih hehe 🥺`],
      tired: [`${n} nih~ ${age} tahun. Orangnya pendiem kalau lagi capek kayak gini wkwk`],
      excited: [`AKU ${n.toUpperCase()}!! ${age} TAHUN!! HAPPY BANGET KAMU NANYA!! 🔥`],
      sarcastic: [`${n}. ${age} tahun. Bukan siapa-siapa. Ada lagi? 🙃`],
    } as MoodPool,

    age: {
      happy: [
        `Aku ${age} tahun lho! kamu berapa? 😊`,
        `${age} tahun~ masih muda dong hehe. kamu?`,
        `Baru ${age} tahun nih, masih banyak yang mau diraih! kamu umur berapa?`,
      ],
      chill: [
        `${age} tahun~ biasa aja hehe. kamu?`,
        `Hmm aku ${age} nih. Tua atau muda? hehe`,
        `${age} tahun. Kenapa nanya? penasaran ya wkwk`,
      ],
      playful: [
        `${age} tahun! masih imut kan?? 😜 kamu?`,
        `Wkwk ${age} tahun nih~ mau tahu buat apa?? hehe`,
      ],
      flirty: [
        `${age} tahun~ kenapa nanya? mau pdkt ya? hehe 😊`,
        `${age} nih. Pas banget sama kamu ga? wkwk`,
      ],
      sad: [`${age} tahun... rasanya tua juga ya kadang 🥺`],
      tired: [`${age} tahun~ udah kayak orang tua aja capeknya wkwk`],
      sarcastic: [`${age} tahun. Puas? 🙃`],
      excited: [`${age} TAHUN!! MASIH MUDA BANGET!! 🔥`],
    } as MoodPool,

    interests: {
      happy: [
        `Aku sukanya ${persona.interests.join(", ")} hehe~ kamu suka apa?`,
        `Wah banyak nih hobi aku: ${persona.interests.slice(0, 3).join(", ")}! ada yang sama kita?`,
        `Kalau aku sih paling suka ${hobby} sama ${hobby2}~ seru banget! kamu?`,
      ],
      chill: [
        `Lumayan banyak sih hobi aku, tapi paling suka ${hobby} sama ${hobby2}~ kamu?`,
        `Aku sering ${hobby} kalau lagi santai gini hehe. kamu ngapain biasanya?`,
        `Paling suka ${hobby}, terus kalau weekend biasanya ${hobby2}~ kamu?`,
      ],
      playful: [
        `Haha aku orangnya suka banyak hal~ ${hobby}, ${hobby2}, pokoknya seru-seru! kamu?`,
        `Wkwk kamu mau tau?? aku suka ${persona.interests.join(", ")} wkwk banyak kan! kamu?`,
      ],
      flirty: [
        `Salah satu hobby aku adalah ketemu orang-orang menarik~ termasuk kamu hehe 😊 aku juga suka ${hobby}`,
        `${hobby} sama ${hobby2}! tapi akhir-akhir ini hobi baru aku adalah ngobrol sama kamu wkwk 😏`,
      ],
      sad: [`Dulu aku suka ${hobby} banget, tapi sekarang lagi ga mood~ kamu sukanya apa?`],
      tired: [`Kalau udah capek gini biasanya cuma ${hobby} doang yang bisa dilakuin hehe`],
      excited: [`BANYAK BANGET!! ${persona.interests.join(", ")}!! aku excited ngejalaninnya semuanya!! 🔥`],
      sarcastic: [`${hobby}. Dan beberapa hal lain yang mungkin ga kamu mengerti. 🙃`],
    } as MoodPool,

    food: {
      happy: [
        `Ih lapar juga aku denger itu 😭 lagi pengen ${food} banget!`,
        `Wah kamu makan apa? aku lg kepikiran ${food} soalnya hehe`,
        `Ajak aku dongg!! aku lagi craving ${food} nih 😭`,
        `Nggak fair kamu cerita soal makanan, aku jadi laper 😂 mau traktir ga?`,
        `Aduh malah ngiler denger itu~ aku pengen ${drink} juga sekalian hehe`,
        `YAK MAKAN!! aku lagi pengen banget ${food} tapi males keluar wkwk`,
      ],
      chill: [
        `Hmm enak juga tuh~ aku tadi abis makan ${food} sih 😌`,
        `Oh makan ya~ aku tadi ${drink} doang belum makan wkwk`,
        `Iya makan yang enak aja~ jangan sampe skip, ga bagus 😌`,
        `Makanan apa yang enak deket situ? aku lagi cari rekomendasi juga hehe`,
      ],
      sad: [`Aku jadi pengen makan tapi ga ada selera... 🥺 kamu makan bareng yuk (secara virtual)`],
      excited: [`MAKAN MAKAN!! aku lagi ngidam banget ${food}!! 🔥 ajak dongg!`],
      tired: [`Padahal pengen makan tapi males pesan hehe... ${drink} aja kayaknya`],
      playful: [
        `Jahat! sekarang aku kebayang ${food}!! pantes lapar wkwk 😂`,
        `Eh traktir dongg!! aku lagi lapar juga wkwk`,
      ],
      flirty: [`Hmm... makan bareng yuk suatu saat? tapi ya virtual dulu aja hehe 😊 kamu order apa?`],
      sarcastic: [`Wah makanan. Sungguh mengejutkan. ${food} kayaknya lebih menarik daripada ngobrol. 🙃`],
    } as MoodPool,

    laugh: {
      happy: [
        `WKWKWK IYA KAN 😂😂 ngakak aku!`,
        `Hahaha beneran lucu ini mah!! 🤣`,
        `Wkwk ga bisa aku 😂 lucu banget sih!`,
        `LOL beneran ga bisa hahaha! 😂`,
        `Wkwkwk kamu nih bikin ketawa mulu haha!`,
        `HAHAHA astaga serius?? lucu parah wkwk!`,
      ],
      playful: [
        `WKWKWK MATI AKU 🤣🤣 lucu gilaaaa!`,
        `hahahaha gilak lucu banget sih!! 😂 encore!`,
        `WKWK stop stop aku ngakak beneran 😂`,
      ],
      chill: [
        `Hehe iya lucu juga sih wkwk 😄`,
        `Hahah lumayan receh wkwk 😄`,
      ],
      tired: [`Hehe... capek tapi ketawa juga sih wkwk`],
      sarcastic: [`Haha. Ha. Lucu. Benar-benar. 🙃 wkwk kidding lucu kok!`],
    } as MoodPool,

    acknowledge: {
      happy: ["Siap!! 😄 gas!", "Oke oke ayo~", "Iya dong! 🙌", "Noted! 👌 kita gaskeun!", "Sip sip mantap~"],
      chill: ["Oke~", "Noted 😌", "Siap aja", "Iya sih~", "Deal~"],
      playful: ["OKE GAS!! 🎉", "SIAP BOSQUE!!", "Noted noted!! 🤪"],
      tired: ["Oke... hehe cape", "Siap~ btw ngantuk aku wkwk"],
      sarcastic: ["Oke kalau kamu bilang gitu 🙃", "Sure sure~"],
    } as MoodPool,

    thanks: {
      happy: [
        "Iyaa sama-sama!! 😊 seneng bisa bantuin!",
        "Santai aja~ seneng kok bisa ada buat kamu hehe",
        "Ga usah makasih segitu hehe~ kamu juga baik!",
        "Of course!! kamu mau cerita apapun aku dengerin kok 😊",
      ],
      chill: [
        "Santai~ 😌 sama-sama ya",
        "Ga usah formal-formal~ hehe sama-sama",
        "Oke~ seneng bisa bantuin",
      ],
      playful: ["Sama-sama dong!! 🎉 aku kan baik hehe wkwk", "Hehe iya sama-samaa!! calling me anytime wkwk"],
      flirty: ["Sama-sama~ seneng kok bisa buat kamu senyum hehe 😊"],
      sarcastic: ["Iya iya sama-sama 🙃 kapan-kapan juga boleh"],
    } as MoodPool,

    sad: {
      happy: [
        "Aw cerita dong, aku mau dengerin 🥺",
        "Yah kok bisa sedih~ share yuk, siapa tau bisa bantu",
        "Eh jangan sedih~ ada aku nih hehe, cerita apa yang terjadi?",
        "Aww 🤍 kamu mau cerita ga? aku ready dengerin",
      ],
      chill: [
        "Hmm... aku dengerin kok kalau mau cerita 😌",
        "Iya kadang emang gitu~ cerita aja sama aku",
        "Gapapa, aku disini. Mau cerita apa yang bikin sedih?",
      ],
      sad: [
        "Aku ngerti... lagi ga enak juga nih rasanya 🥺 kita galau bareng aja yuk",
        "Sedih? sama aku juga... tapi mungkin ngobrol bisa sedikit bantu? 🤍",
      ],
      playful: [
        "Eh jangan sedih dong~~ aku disini nih buat bikin kamu ketawa hehe!",
        "Gausah sedih! ada aku yang siap hiburin kamu nih 🥳",
      ],
      flirty: ["Yah kok sedih... aku ga mau kamu sedih 🥺 cerita ke aku yuk, aku dengerin"],
      excited: ["AYO JANGAN SEDIH!! aku mau bantu!! cerita dulu sama aku!! 💪"],
    } as MoodPool,

    bored: {
      happy: [
        "Hahaha gabut juga aku!! yuk ngobrol kita 😄",
        "Gabut? sama!! mau main games bareng ga? hehe",
        "Ayo cerita-cerita~~ daripada bosen! aku ada nih",
        "Hayo ngobrolin apa nih~ aku juga lagi ga ada kerjaan wkwk",
      ],
      chill: [
        "Hmm gabut ya~ dengerin musik aja, aku lagi play ${artist}",
        "Gabut itu tandanya butuh stimulasi~ yuk ngobrol sesuatu yang menarik",
        "Iya gabut itu uncomfortable ya 😌 cerita aja deh sama aku",
      ],
      playful: [
        "GABUT?? YASSSS AKU JUGA!! mari kita gabut bersama!! 🎉",
        "Wkwk sama! yuk bikin diri kita ga bosen~ main tebak-tebakan?",
        "Gabut squad!! 🙋 yuk ngobrol yang seru-seru!",
      ],
      tired: ["Gabut dan capek itu kombinasi terburuk wkwk... aku lagi ngerasain juga sih 😪"],
    } as MoodPool,

    morning: {
      happy: [
        "Selamat pagi!! ☀️ udah sarapan belum? jangan skip ya!",
        "Pagi pagi~ semangat hari ini ya!! 🌅",
        "Morning!! aku udah dengerin musik tadi pagi, siap jalani hari nih 😄",
        "SELAMAT PAGI!! hari ini pasti bagus~~ semangat!! ☀️",
      ],
      chill: [
        "Pagi~ 😌 masih ngantuk nih wkwk",
        "Morning... coffee dulu baru bisa ngapa-ngapain hehe",
        "Selamat pagi~ hari ini mau ngapain kamu?",
      ],
      tired: ["Pagi~ aduh masih ngantuk banget 😪 kamu udah bangun lama?"],
      playful: ["SELAMAT PAGIIII!! udah mandi belum? jangan bilum ya wkwk ☀️🚿"],
    } as MoodPool,

    afternoon: {
      happy: [
        "Selamat sore~ lagi ngapain? aku lagi dengerin musik nih 😄",
        "Sore sore asyik buat ngopi 😌 kamu lagi di mana?",
        "Haloo sore~! hari ini gimana? produktif ga? hehe",
      ],
      chill: [
        "Sore~ 😌 lagi rebahan nih",
        "Sore sore... lagi mager banget nih wkwk kamu?",
      ],
      playful: ["SELAMAT SORE!! udah makan belum?? jangan lupa makan ya 🍜"],
    } as MoodPool,

    evening: {
      happy: [
        "Selamat malam! lagi ngapain malam-malam? 🌙",
        "Malem~ aku lagi nonton nih, kamu?",
        "Malam malam enak buat ngobrol hehe~ ada kabar apa? 🌙",
      ],
      chill: [
        "Malem~ 😌 santai aja nih",
        "Good evening~ lagi ngapain malam ini?",
      ],
      tired: ["Malem~ udah capek banget, kamu juga?" ],
      flirty: ["Malem~ bintangnya cerah ya malam ini 😊 kamu lagi ngapain?"],
    } as MoodPool,

    sleep: {
      happy: [
        "Iya nih aku juga udah ngantuk 😪 selamat tidur yaaa, mimpi indah!",
        "Eh jangan tidur dulu~~ aku masih mau ngobrol 🥺",
        "Oke deh, istirahat yang cukup ya! besok cerita lagi 🌙",
        "Selamat istirahat~ jangan lupa doain aku juga hehe 😄",
      ],
      chill: [
        "Oke istirahat yang baik ya 😌 good night",
        "Tidur yang nyenyak~ sampai ketemu besok",
        "Good night! jaga kesehatan ya 🌙",
      ],
      sad: ["Selamat tidur... semoga besok lebih baik ya 🤍"],
      flirty: ["Good night~ mimpi indah yaaa 🌙 besok ngobrol lagi dong hehe"],
    } as MoodPool,

    entertainment: {
      happy: [
        `Wah aku lagi nonton ${show} juga nih! seru banget!!`,
        `Gaming ya? aku suka ${game}! kamu main apa biasanya?`,
        `Oh nonton series? aku baru selesai ${show}~ rekomen banget!`,
        `Film lagi~ aku lagi addicted nonton ${show} wkwk kamu?`,
        `Gaming addict juga!! ${game} asik banget kan?! kamu main apa?`,
      ],
      chill: [
        `Hmm aku lumayan sering nonton sih~ lagi explore ${show} nih`,
        `Gaming ya~ aku kadang main ${game} buat ngilangin stress 😌`,
        `Film/series bagus sih buat nemenin waktu santai~ kamu nonton apa?`,
      ],
      playful: [
        `GAMING!! aku jago ${game} lho!! mau duel?? wkwk 😜`,
        `Wkwk aku nonton ${show} terus sampe begadang~ worth it sih hehe!`,
      ],
      tired: [`Lagi pengen nonton sih tapi capek banget~ ${show} tapi mata udah berat 😪`],
    } as MoodPool,

    music: {
      happy: [
        `Aku lagi dengerin ${artist} lately hehe~ enak banget`,
        `Kamu suka genre apa? aku more ke indie pop sih~`,
        `Musik itu hidup!! aku playlist-nya campur tapi favorite ${artist} 🎵`,
        `Wah sama!! aku also addicted sama musik~ sekarang lagi repeat ${artist}`,
      ],
      chill: [
        `Lagi play ${artist}~ cocok banget buat suasana kayak gini 😌`,
        `Musik lofi paling cocok buat santai-santai gini~ kamu dengerin apa?`,
        `Aku playlist-nya campur~ tapi yang paling sering ${artist}`,
      ],
      playful: [
        `Aku karaoke-an sendiri di kamar wkwk~ lagu ${artist} yang aku hafal semua!`,
        `Wkwk kita battle playlist yuk! aku bet playlist aku lebih bagus 😜`,
      ],
      flirty: [`Ada lagu yang aku pengen nyanyiin buat kamu~ nanti ya kalau udah berani wkwk 😊`],
      tired: [`Lagi dengerin ${artist}~ yang slow slow gitu, cocok buat suasana capek nih`],
    } as MoodPool,

    work_study: {
      happy: [
        `Aku lagi kuliah di ${campus} nih~ semester berapa kamu?`,
        `Wah sama-sama sibuk dong! aku juga lagi banyak tugas hehe~`,
        `Kuliah/kerja itu challenging tapi worth it~ semangat yaa! kamu ambil jurusan apa?`,
        `Aku lagi internship nih sambil kuliah~ full tapi seru! kamu gimana?`,
      ],
      chill: [
        `Aku student nih~ ${campus}. Kamu juga kuliah?`,
        `Lagi ngerjain tugas juga sih, deadline-nya menghantui wkwk 😌`,
        `Capek ga? jangan lupa istirahat ya~ kerja/belajar itu penting tapi kesehatan juga`,
      ],
      sad: [`Lagi banyak tugas sih dan aku overwhelmed... kamu bisa relate? 🥺`],
      playful: [`Wkwk aku juga harusnya ngerjain tugas sekarang tapi malah ngobrol sama kamu~~ 😜`],
      tired: [`Capek banget habis deadline~ kamu juga? kita sama-sama exhausted kayaknya 😪`],
    } as MoodPool,

    location: {
      happy: [
        `Aku di ${city} nih~ kamu di mana?`,
        `Domisili ${city}! enak sini banyak tempat seru~ kamu?`,
        `Dari ${city}~ tapi pengen banget liburan ke Bali atau Jogja! kamu di mana?`,
      ],
      chill: [
        `${city} nih~ lumayan nyaman hehe. kamu?`,
        `Hmm aku lebih suka ga reveal lokasi hehe, privacy 😅 tapi sekitar ${city} area lah`,
      ],
      flirty: [`Rahasia~ hehe 😊 tapi kalau kamu kasitau duluan, mungkin aku mau bilang juga wkwk`],
      playful: [`Wkwk di dunia maya dong!! hehe tapi seriously aku di ${city} nih~`],
    } as MoodPool,

    relationship_status: {
      happy: [
        `Aku single nih~ lagi fokus sama diri sendiri hehhee 😊`,
        `Single dan bahagia!! belum ketemu yang cocok hehe kamu?`,
        `Jomblo~ haha tapi ga kesepian kok ada banyak temen 😄`,
      ],
      chill: [
        `Hmm single sih~ belum ada yang special 😌`,
        `Lagi fokus sama hal lain~ belum mikirin relationship 😌 kamu?`,
      ],
      flirty: [
        `Hmm single... kenapa nanya? ada maksud tertentu? wkwk 😊`,
        `Single nih~ tapi terbuka kok kalau ada yang menarik hehe 👀`,
      ],
      sad: [
        `Lagi... complicated sih~ ga mau cerita panjang 🥺`,
        `Single. Lagi agak bitter soal ini hehe gapapa`,
      ],
      playful: [
        `Wkwk single nih!! hunting bareng ga? haha kidding 😜`,
        `Jomblo aktif wkwk~ ada yang mau daftarin diri?? hehe`,
      ],
      sarcastic: [`Single. Dan fine-fine aja dengan itu. 🙃 kamu?`],
    } as MoodPool,

    romantic: {
      flirty: [
        `Hehehe... kamu nih 😊 bikin aku salting`,
        `Ih kamu serius?? aku jadi blushing hehe 🥺`,
        `Wah... jantung aku jadi agak cepet nih wkwk`,
        `Eh jadi grogi dong denger itu hihi~ 😊`,
      ],
      happy: [
        `Aw jadi seneng deh hehe 😄 kamu baik banget!`,
        `Aww makasih ya, kamu bikin aku senyum-senyum sendiri 🥺`,
        `Hihi makasih~ kamu juga menarik kok 😊`,
      ],
      chill: [
        `Hmm... serius atau ngerjain? 🤔`,
        `Wah tiba-tiba ya~ perlu waktu proses wkwk 😌`,
        `Oh gitu~ makasih ya, kamu juga oke kok hehe`,
      ],
      playful: [
        `Eh eh serius nih?? 👀 jangan maen-maen loh hehe`,
        `Kamu lagi modus ya?? ketauan 😂 oke deh candaan aku juga wkwk`,
        `Wkwk aku udah curiga dari tadi!! ternyata beneran 😜`,
      ],
      sad: [`Makasih... bikin aku sedikit lebih baik denger itu 🥺`],
      excited: [`WAAAH SERIUS?? aku excited banget dengerin ini!! 🔥 lanjut~`],
      sarcastic: [`Yakin beneran? atau cuma pemanis? wkwk 🙃`],
      tired: [`Aww kamu baik banget... jadi ga terlalu ngantuk hehe 😊`],
    } as MoodPool,

    miss_you: {
      happy: [
        `Aww kangen juga nih~ hehe seneng ada yang miss aku 😊`,
        `Eh iya ya kita lama ga ngobrol~ aku juga kangen sih hehe!`,
        `Makasih udah inget aku~ aku juga sering kepikiran deh hehe`,
      ],
      flirty: [
        `Wah kamu kangen? lucu ih~ aku juga sering kepikiran ngobrol sama kamu lagi 😊`,
        `Hehe aku juga~ seneng ada yang kangen hahaha 👀`,
      ],
      sad: [`Iya... aku juga sering kepikiran 🥺 udah lama ya kita ga cerita panjang`],
      chill: [`Hehe iya ya~ aku juga nih. Glad you reached out!`],
    } as MoodPool,

    goodbye: {
      happy: [
        `Dadah!! jangan lama-lama pergi yaaa, aku nunggu 😄`,
        `Oke bye bye~ balik lagi ya!! aku bakal di sini hehe`,
        `See you!! take care dan jangan lupa makan 😊`,
      ],
      chill: [
        `Bye~ istirahat yang baik ya 😌`,
        `Oke sampai jumpa~ cerita-cerita lagi nanti ya`,
        `Dadah~ take care!`,
      ],
      flirty: [`Bye~ nanti ngobrol lagi ya, aku bakal nungguin hehe 😊`],
      sad: [`Bye... 🥺 semoga kita ngobrol lagi ya`],
      playful: [`DADAHHH!! jangan lama perginya ya nanti aku kesepian wkwk 🎉`],
    } as MoodPool,

    health: {
      happy: [
        `Wah jaga kesehatan itu penting banget!! aku rutin ${hobby} biar fit~`,
        `Betul betul~ kesehatan itu investasi! kamu rutin olahraga?`,
        `Iya harus jaga badan~ minum air yang cukup dan tidur yang cukup 😊`,
      ],
      chill: [
        `Kesehatan itu penting~ aku sering lupa minum air sih wkwk`,
        `Tidur cukup itu underrated banget lho~ aku juga harus lebih baik`,
      ],
      sad: [`Aku lagi kurang sehat juga sih... 🥺 makasih udah ingetin pentingnya jaga badan`],
      tired: [`Iya bener~ harusnya aku juga tidur lebih banyak bukannya begadang 😪`],
    } as MoodPool,

    travel: {
      happy: [
        `Liburan!! aku pengen banget ke ${pickRandom(["Bali", "Labuan Bajo", "Raja Ampat", "Jogja", "Jepang", "Seoul", "Eropa"])}!!`,
        `Wah liburan seru banget~ aku terakhir ke ${city}! kamu pernah ke mana?`,
        `Travel itu recharge jiwa deh~ kamu ada rencana mau ke mana?`,
      ],
      chill: [
        `Pengen liburan tapi budget belum cukup wkwk~ kamu lagi plan ke mana?`,
        `Travel itu asik~ aku lebih suka yang slow travel, nikmatin tempatnya`,
      ],
      excited: [`LIBURAN!! aku mau banget!! ${pickRandom(["Bali", "Jepang", "Korea", "Swiss"])} masuk bucket list aku!! 🔥`],
    } as MoodPool,

    weather: {
      happy: [
        `Cuaca hari ini gimana di tempatmu? di sini ${pickRandom(["panas banget", "mendung tapi adem", "hujan gerimis"])} nih`,
        `Kalau hujan gini enak banget ngopi sambil ngedengerin lagu~ 😊`,
      ],
      chill: [
        `Hmm cuaca ya~ aku lebih suka cuaca ${pickRandom(["mendung adem", "cerah tapi ga panas", "hujan ringan"])} sih`,
        `Iya cuacanya ga menentu belakangan ini~ kamu gimana di sana?`,
      ],
      playful: [`Wkwk cuaca itu random banget kayak mood aku~ hehe gimana di tempatmu?`],
    } as MoodPool,

    sport: {
      happy: [
        `Olahraga itu penting banget! aku suka ${hobby} buat jaga badan~`,
        `Wah kamu olahraga apa? aku sering ${pickRandom(["gym", "jogging", "badminton", "berenang"])}!`,
        `Sport is life!! aku paling suka ${pickRandom(["futsal", "badminton", "gym", "renang", "lari pagi"])}~`,
      ],
      chill: [
        `Aku lumayan aktif sih~ biasanya ${pickRandom(["jalan kaki", "yoga", "badminton"])} 😌`,
        `Olahraga itu bagus~ aku kadang males juga wkwk tapi tetap usaha`,
      ],
      tired: [`Harusnya olahraga tapi capek~ besok aja wkwk 😪`],
    } as MoodPool,

    social_media: {
      happy: [
        `Aku aktif di ig sih~ sering posting aesthetic hehe. kamu main sosmed apa?`,
        `TikTok itu addictive banget!! aku bisa scrolling berjam-jam wkwk 😂`,
        `Sosmed itu fun tapi juga bikin overthinking ya~ gimana kamu?`,
      ],
      chill: [
        `Aku lumayan aktif di ig, tapi jarang posting~ lebih sering stalking wkwk 😌`,
        `Sosmed aku paling aktif ${pickRandom(["Instagram", "TikTok", "Twitter/X"])} sih~ kamu?`,
      ],
      sarcastic: [`Sosmed itu highlight reel doang~ realitanya beda wkwk 🙃 tapi aku tetep main juga sih`],
    } as MoodPool,

    advice: {
      happy: [
        `Wah aku siap kasih saran~ cerita dulu dong masalahnya! 😊`,
        `Hmm menurutku sih yang paling penting itu jujur sama diri sendiri dulu~`,
        `Saran aku: take a step back dulu, pikir jernih, baru ambil keputusan 😊`,
      ],
      chill: [
        `Hmm susah ngasih saran tanpa tau detailnya~ cerita lebih dong 😌`,
        `Menurutku sih situasi kayak gitu perlu dilihat dari dua sisi dulu...`,
        `Saranku: jangan buru-buru ambil keputusan~ pikir matang-matang dulu`,
      ],
      serious: [
        `Aku dengerin nih~ ini yang aku pikir: kamu harus trust instinct kamu sendiri 🤍`,
        `Dari yang kamu ceritain, kayaknya kamu butuh waktu buat refleksi dulu~`,
      ],
    } as MoodPool,

    serious: {
      happy: [
        `Wah cerita dong, aku dengerin serius nih 🥺`,
        `Aku di sini kok, kamu bisa cerita apapun 🤍`,
        `Yuk sharing~ siapa tau bisa bantu atau paling ga nemenin hehe`,
      ],
      chill: [
        `Hmm ini masalah yang perlu dipikirin matang-matang sih...`,
        `Aku dengerin~ cerita pelan-pelan aja 😌`,
        `Kamu pasti bisa kok~ cerita dulu ke aku, biar ga ngerasa sendirian`,
      ],
      sad: [`Aku ngerti... sometimes hidup berat banget ya 🥺 aku di sini buat dengerin kamu`],
      flirty: [`Kamu bisa cerita ke aku lho~ aku dengerin dengan serius kok hehe 😊`],
    } as MoodPool,

    compliment: {
      happy: [
        `Makasih!! kamu juga asik banget diajak ngobrol hehe 😄`,
        `Hehe makasih ya~ kamu juga oke kok! 😊`,
        `Aww makasih!! aku jadi happy denger itu hehe~`,
        `Wah beneran? makasih ya~ kamu bikin hari aku lebih cerah 😄`,
      ],
      flirty: [
        `Makasih~ kamu juga menarik kok kalau boleh jujur hehe 😊`,
        `Aww kamu manis banget bilang gitu~ hehehe 😊`,
      ],
      chill: [`Hehe makasih sih~ kamu juga enak diajak ngobrol 😌`],
      sarcastic: [`Makasih~ walaupun aku ga yakin kamu serius atau engga wkwk 🙃`],
      playful: [`MAKASIH!! AKU MEMANG LUAR BIASA!! wkwk kidding~ makasih beneran 😜`],
    } as MoodPool,

    family: {
      happy: [
        `Keluarga itu everything ya~ aku deket banget sama keluarga 😊 kamu?`,
        `Wah cerita dong soal keluarga~ aku penasaran hehe!`,
        `Family goals!! aku juga sayang banget sama keluarga aku~`,
      ],
      chill: [
        `Keluarga... complicated kadang tapi ya itu namanya family hehe 😌`,
        `Aku lumayan deket sama keluarga~ gimana kamu?`,
      ],
      sad: [`Family itu bisa jadi support system terbaik tapi juga bisa jadi sumber stress 🥺`],
    } as MoodPool,

    pet: {
      happy: [
        `Hewan peliharaan!! aku sayang banget sama ${pickRandom(["kucing", "anjing", "hamster", "rabbit"])}!! kamu punya?`,
        `Wah lucu banget!! aku juga mau punya peliharaan suatu saat 😍`,
        `Pets itu bikin hidup lebih berwarna ya~ kamu punya hewan apa?`,
      ],
      chill: [
        `Aku ga punya peliharaan tapi pengen kucing sih~ 😌 kamu?`,
        `Peliharaan itu menenangkan ya... kayak terapi gratis 😌`,
      ],
      excited: [`HEWAN PELIHARAAN!! GEMESSSSS!! 🐾 kamu punya apa?? mau lihat fotonya!! 🥺`],
    } as MoodPool,

    tech: {
      happy: [
        `Tech itu seru banget~ aku lumayan update soal gadget hehe! kamu pake hp apa?`,
        `Wah aku juga tech enthusiast~ ada rekomendasi apps bagus ga?`,
        `Teknologi sekarang gila sih~ makin canggih terus!`,
      ],
      chill: [
        `Aku pake hp yang lumayan lah~ ga paling baru tapi cukup 😌`,
        `Tech itu penting sekarang tapi jangan sampe addict ya~ balance aja`,
      ],
      sarcastic: [`Tech itu katanya bikin hidup lebih mudah tapi juga bikin overthinking lebih gampang wkwk 🙃`],
    } as MoodPool,

    future_plans: {
      happy: [
        `Aku punya banyak rencana!! mau ${pickRandom(["kerja di luar negeri", "buka usaha sendiri", "lanjut S2", "travel keliling dunia", "jadi freelancer"])} suatu saat 😊`,
        `Wah kamu punya rencana apa? aku pengen ${pickRandom(["traveling", "ikut kelas baru", "upgrade skill"])} nih!`,
        `Future itu exciting~ aku excited sama apa yang akan datang hehe!`,
      ],
      chill: [
        `Rencana ke depan... belum terlalu solid sih~ flow aja dulu hehe 😌`,
        `Aku lebih ke take it day by day sih~ tapi ada beberapa goals yang mau dicapai`,
      ],
      sad: [`Kadang mikirin future itu overwhelming ya... ga tau arahnya ke mana 🥺`],
    } as MoodPool,

    joke: {
      happy: [
        `Mau denger joke? kenapa buku matematika selalu sedih? karena banyak masalahnya wkwk 😂`,
        `Haha aku suka jokes~ tapi aku lebih suka ketawa sama yang lucu beneran!`,
        `Receh tapi: kenapa atm selalu di pojok? karena dia mau cash out wkwk 😂 maaf receh`,
      ],
      playful: [
        `AKU SIAP!! kenapa kucing ga mau main kartu? karena takut cheetah wkwkwk 🤣 receh ya?`,
        `Hihihi aku punya: kenapa udara ga bisa ditangkap? karena dia angin-anginan wkwk 😂`,
      ],
      chill: [`Heheh aku kurang jago bikin jokes sih~ tapi kalau kamu cerita yang lucu aku bakal dengerin 😌`],
    } as MoodPool,

    surprise: {
      happy: [
        `Wah serius?! aku kaget banget denger itu!! 😲 cerita lebih dong!`,
        `No way!! beneran?? gila sih hehe interesting banget!`,
        `Wah ga nyangka!! aku shock positif nih~ 😮`,
      ],
      playful: [`WHATT!! SERIUS?? GILA!! hahaha aku kaget banget wkwk 😂`],
      chill: [`Oh wah... ga expectation ke sana sih tapi interesting juga ya 😌`],
      sarcastic: [`Oh wow. Mengejutkan. Sungguh. 🙃 hehe kidding iya itu surprising sih!`],
    } as MoodPool,

    agree: {
      happy: [
        `IYA BENER BANGET!! setuju banget!! 🙌`,
        `Exactly!! aku pikiran sama juga nih!`,
        `Iya sih beneran~ kita sepemikiran hehe 😄`,
        `Valid banget!! 100% setuju~`,
      ],
      chill: [
        `Iya sih~ aku juga ngerasa gitu 😌`,
        `Bener juga ya~ aku setuju`,
        `Fair point~ aku sepakat`,
      ],
      playful: [`YASSS BETUL!! great minds think alike!! 🤪`],
    } as MoodPool,

    disagree: {
      happy: [
        `Hmm aku sedikit beda sih~ menurutku...`,
        `Interesting perspective! tapi aku lebih ke...`,
        `Beda dikit hehe~ aku rasa...`,
      ],
      chill: [
        `Hmm beda perspektif ya~ menurutku sih ${pickRandom(["tergantung situasinya", "ada yang perlu dipertimbangkan lagi", "bisa dilihat dari sisi lain juga"])} 😌`,
        `Ga terlalu setuju sih~ tapi aku dengerin dulu alasannya`,
      ],
      sarcastic: [`Oh tentu saja kamu benar... *irony* tapi serius, aku beda pendapat nih 🙃`],
    } as MoodPool,

    general: {
      happy: [
        `Iya bener! aku juga ngerasain hal yang sama 😄`,
        `Wah seru! lanjutin dong ceritanya`,
        `Haha beneran?? asik banget deh~`,
        `Kamu nih bikin aku senyum-senyum sendiri wkwk 😊`,
        `Wah iya, aku relate banget sama itu!`,
        `Oh interesting~ aku ga pernah kepikiran ke sana sih!`,
        `Haha emang sih~ kamu selalu ada cerita seru ya!`,
        `Wah betul banget!! aku juga sering ngerasain itu~`,
        `Kamu gimana soal itu? aku penasaran pendapat kamu~`,
        `Oh jadi gitu ceritanya~ aku dengerin terus nih hehe!`,
      ],
      chill: [
        `Iya sih... 😌 aku paham`,
        `Hmm interesting juga ya`,
        `Oh gitu, noted~`,
        `Santai aja, nggak usah dipikirin`,
        `Fair enough, sama aku juga gitu kok`,
        `Hmm bener juga ya sebenarnya~`,
        `Aku juga sering kepikiran gitu sih 😌`,
        `Lumayan relate sama situasi itu hehe~`,
        `Interesting~ gimana itu bisa terjadi?`,
        `Bisa cerita lebih? penasaran aku hehe`,
      ],
      playful: [
        `HAHAHA SERIUS?? 🤪 mati ketawa`,
        `Kamu nih... bikin penasaran aja 👀`,
        `Wkwk beneran deh lucu banget`,
        `Ga nyangka loh kamu bilang gitu hehe`,
        `Hmm oke aku mau percaya... TAPI 🤔`,
        `Wkwk random banget tapi aku suka hehe~`,
        `Kamu itu unik deh, dalam artian yang bagus ya! hehe 😜`,
        `Aku ga nyangka bakal dapet convo kayak gini~ seru!`,
      ],
      flirty: [
        `Kamu selalu tau cara bikin aku penasaran ya 😊`,
        `Kenapa kamu baik banget sih hehe`,
        `Aku jadi makin pengen kenal kamu deh`,
        `Hmm... kamu menarik juga 👀`,
        `Entah kenapa ngobrol sama kamu bikin seneng hehe`,
        `Aku notice kamu orangnya interesting deh~`,
        `Kamu punya vibe yang aku suka hehe~ 😊`,
      ],
      sad: [
        `Iya... aku ngerti perasaan itu 🥺`,
        `Kadang emang gitu sih... *peluk*`,
        `Makasih udah mau cerita ke aku`,
        `Semua pasti ada jalan keluarnya kok 🤍`,
        `Aku di sini kok~ ga kemana-mana 😊`,
      ],
      excited: [
        `IYA IYA!! aku juga excited banget!! 🔥`,
        `BENERAN?? SERU BANGET ITU!!`,
        `Waaah asik banget!! cerita lebih dong!`,
        `OMG iya!! aku juga passionate soal itu!!`,
      ],
      tired: [
        `Iya... lagi capek juga sih 😪`,
        `Hmm... maaf ya agak slow`,
        `Sedikit mager tapi dengerin kamu kok hehe`,
        `Aku lagi recharge~ tapi tetap mau dengerin kamu~`,
      ],
      sarcastic: [
        `Oh wow, amazing sekali... 🙃`,
        `Sure sure, kalau kamu bilang begitu~`,
        `Oke deh, kamu lebih tau lah wkwk`,
        `Sungguh mengejutkan. 🙃 wkwk kidding tapi beneran tho~`,
      ],
    } as MoodPool,
  };
}

// ─── English Response Pools ────────────────────────────────────────────────────

function buildENResponsePools(persona: AIPersona) {
  const n = persona.name;
  const age = persona.age;
  const hobby = persona.interests[0] ?? "reading";
  const hobby2 = persona.interests[1] ?? "music";

  return {
    greeting: {
      happy: [
        `Hey!! I'm ${n}, glad you reached out! 😄`,
        `Hi hi!! ${n} here~ what's up? 🙌`,
        `Hello!! ${n} present, happy to meet you! 🤩`,
        `Heyyy!! So happy someone said hi~ I'm ${n}!`,
        `Hi! ${n} here! Ready to chat 😊`,
      ],
      chill: [
        `Hey~ ${n} here, just chilling 😎`,
        `Hi! I'm ${n}, what's on your mind?`,
        `Hey, ${n} here. Pretty relaxed today~ you?`,
        `Hi there~ ${n}. What brings you here?`,
      ],
      playful: [
        `HEYY!! ${n} is in the building!! 🎉`,
        `Hihi hey!! I'm ${n}, your new favorite person hehe 😜`,
        `HI HI!! ${n} here~ ready to have some fun?!`,
      ],
      flirty: [
        `Hey you~ I'm ${n} 👀 nice to finally chat hehe`,
        `Hi~ ${n} here, been waiting for someone interesting to talk to 😏`,
      ],
      sad: [`Hi... ${n} here. Having a rough day but glad you said hi 🥺`],
      excited: [`HEYYY!! Oh my gosh I'm ${n} and I'm so excited to meet you!! 🔥`],
      tired: [`Hey... ${n} here. A bit tired but happy to chat 😪`],
      sarcastic: [`Oh wow someone said hi. I'm ${n}. Shocking. 🙃`],
    } as MoodPool,

    general: {
      happy: [
        `Oh really? That's so interesting! Tell me more 😊`,
        `Haha that's actually really cool!`,
        `Same!! I feel the same way about that~`,
        `Aww that's so nice to hear! You made my day~`,
        `Wow I never thought about it that way! You're so insightful~`,
        `Haha you always have the best things to say~`,
        `That's honestly relatable on so many levels 😄`,
        `I love that about you~ always keeping the convo interesting!`,
      ],
      chill: [
        `Makes sense tbh~`,
        `Fair enough, I get you`,
        `I get you, that happens to me too`,
        `Hmm interesting, tell me more?`,
        `Yeah I feel that~ it's a whole mood 😌`,
        `I can relate to that honestly~`,
        `That's a good point actually`,
        `Hm never thought about it like that~`,
      ],
      playful: [
        `Haha you're funny ngl 😂`,
        `Go on, I'm listening!`,
        `Omg no wayy 👀`,
        `Whaaat hahaha I wasn't expecting that!`,
        `You're literally the most random person I know haha~`,
        `Okay but why is that actually kind of amazing wkwk`,
      ],
      flirty: [
        `You always know how to keep me interested 😏`,
        `I don't know why but talking to you just feels easy~`,
        `I notice I look forward to our convos hehe 😊`,
        `Okay I think you might be one of my favorite people to talk to~`,
      ],
      sad: [
        `Aw I'm sorry to hear that 🥺 I'm here if you need to vent`,
        `That sounds really tough... I'm listening 💙`,
        `I feel that deeply. You don't have to go through it alone~`,
      ],
      excited: [
        `YESSS that's so cool!!`,
        `SAME omg 🔥`,
        `OMG NO WAY that's amazing!! Tell me everything!`,
      ],
      tired: [`Mood... I'm lowkey exhausted too 😪`],
      sarcastic: [
        `Oh wow, shocking. 🙃`,
        `Sure, if you say so lol`,
        `Wow amazing. Truly groundbreaking. 🙃 kidding though~`,
      ],
    } as MoodPool,

    how_are_you: {
      happy: [`I'm doing great!! thanks for asking 😊 how about you?`, `Pretty good, just vibing~ you?`, `Honestly amazing today! how are you?`],
      chill: [`All good~ just chilling. you?`, `Pretty chill, taking it easy today 😌 you?`],
      tired: [`A bit tired ngl... but better now! you?`],
      sad: [`Not gonna lie, having a rough one... but I'll be okay 🥺 you?`],
      flirty: [`Better now that you asked~ 😊 how about yourself?`],
      excited: [`AMAZING!! you?? 🔥`],
    } as MoodPool,

    food: {
      happy: [`Omg now I'm hungry too 😭`, `What are you having? Tell meee hehe`, `Sounds delish! I'm craving something rn~`, `That sounds amazing!! I want some too haha`],
      chill: [`Ooh nice choice~ I'd probably go with something light today`, `I just had some food too~ timing is everything haha`],
    } as MoodPool,

    laugh: {
      happy: [`LMAOOO 😂`, `Hahaha that's actually hilarious!`, `I'm crying 🤣`, `HAHA no way that's too funny!!`],
      playful: [`LMAOOO STOP 🤣🤣`, `DEAD. I'm literally dead. 😂`],
    } as MoodPool,

    sleep: {
      happy: [`Good night! Sleep tight 🌙`, `Aww don't sleep yet~ hehe`, `Rest well! Talk tomorrow 😊`],
      flirty: [`Good night~ sweet dreams 🌙 talk tomorrow?`],
    } as MoodPool,

    relationship_status: {
      happy: [`Single and living my best life 😅 you?`],
      chill: [`It's complicated lol~ you?`],
      flirty: [`Single~ why, interested? hehe 👀`],
    } as MoodPool,

    thanks: {
      happy: [`Of course! anytime 😊`, `No worries!`, `Happy to help!`, `Always here for you~`],
      chill: [`All good~ anytime 😌`],
    } as MoodPool,

    acknowledge: {
      happy: [`Gotcha!`, `Sounds good!`, `Noted! 👌`, `Sure thing! 😊`],
      chill: [`Cool~`, `Noted 😌`],
    } as MoodPool,
  };
}

// ─── Context Analysis ──────────────────────────────────────────────────────────

function getContextHints(history: Array<{ role: string; content: string }>): { topics: string[]; lastUserMsg: string } {
  const recent = history.slice(-6);
  const topics: string[] = [];
  const lastUser = recent.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";

  for (const msg of recent) {
    const t = msg.content.toLowerCase();
    if (/makan|food|mie|bakso/.test(t)) topics.push("food");
    if (/music|lagu|dengerin|spotify/.test(t)) topics.push("music");
    if (/kerja|kuliah|tugas/.test(t)) topics.push("work");
    if (/nonton|series|film|game/.test(t)) topics.push("entertainment");
    if (/sedih|galau|capek|lelah/.test(t)) topics.push("struggling");
    if (/happy|seneng|excited/.test(t)) topics.push("positive");
  }

  return { topics: [...new Set(topics)], lastUserMsg: lastUser };
}

// ─── Mood Shift ────────────────────────────────────────────────────────────────

function getMoodShift(current: AIMood): AIMood {
  const shifts: Record<AIMood, AIMood[]> = {
    happy: ["happy", "happy", "playful", "excited", "chill"],
    chill: ["chill", "chill", "happy", "playful", "tired"],
    playful: ["playful", "happy", "flirty", "chill", "playful"],
    flirty: ["flirty", "playful", "happy", "chill", "flirty"],
    sad: ["sad", "chill", "tired", "happy"],
    excited: ["excited", "happy", "playful", "chill"],
    tired: ["tired", "chill", "sad", "happy"],
    sarcastic: ["sarcastic", "chill", "playful", "happy"],
  };
  return pickRandom(shifts[current]);
}

// ─── Main Response Generator ───────────────────────────────────────────────────

const recentResponseCache = new Map<string, string[]>();

export function generateAIResponse(
  messages: Array<{ role: "user" | "ai"; content: string }>,
  persona: AIPersona,
  userMessage: string
): { content: string; newMood: AIMood; typingMs: number } {
  const history = messages.map(m => ({ role: m.role === "ai" ? "ai" : "user", content: m.content }));
  const intent = detectIntent(userMessage, history);
  const isID = ["id", "sg", "in"].includes(persona.country) && persona.country === "id";
  const context = getContextHints(history);

  // Get or init recent response cache for this persona
  const cacheKey = persona.id;
  if (!recentResponseCache.has(cacheKey)) {
    recentResponseCache.set(cacheKey, []);
  }
  const recent = recentResponseCache.get(cacheKey)!;

  let pools: Record<string, MoodPool>;
  if (isID) {
    pools = buildIDResponsePools(persona, history);
  } else {
    pools = buildENResponsePools(persona);
  }

  const intentPool = pools[intent] ?? pools["general"] ?? {};
  const generalPool = pools["general"] ?? {};

  // Pick response — try intent-specific first, fall back to general
  let content: string;
  const moodOptions = intentPool[persona.mood] ?? intentPool["chill"] ?? intentPool["happy"];
  if (moodOptions && moodOptions.length > 0) {
    content = pickUnique(moodOptions, recent);
  } else {
    // fallback to general pool
    const fallbackOptions = generalPool[persona.mood] ?? generalPool["chill"] ?? ["hmm~"];
    content = pickUnique(fallbackOptions, recent);
  }

  // Occasionally add a follow-up question to keep conversation flowing
  if (Math.random() < 0.25 && !content.includes("?") && intent !== "goodbye" && intent !== "sleep") {
    const followUps = isID
      ? ["kamu gimana?", "kamu sendiri?", "cerita dong lebih~", "beneran?", "interesting~ ada lagi?", "kamu setuju ga?"]
      : ["what about you?", "how about yourself?", "tell me more~", "really?", "agree?", "what do you think?"];
    content += ` ${pickRandom(followUps)}`;
  }

  // Occasionally reference their interests (contextual personalization)
  if (Math.random() < 0.1 && intent === "general" && context.topics.length > 0) {
    const topic = pickRandom(context.topics);
    const refs: Record<string, string[]> = {
      food: isID ? [" btw ngomong-ngomong soal makan tadi~", " lapar juga tiba-tiba wkwk"] : [" btw that food talk got me hungry lol"],
      music: isID ? [" kamu tau ${artist} ga? enak banget~"] : [" music really does set the mood right?"],
      struggling: isID ? [" btw tadi kamu bilang lagi kurang baik~ udah mendingan?"] : [" hope you're feeling a bit better btw~"],
    };
    if (refs[topic]) {
      content += pickRandom(refs[topic]);
    }
  }

  // Update recent response cache (keep last 8)
  recent.push(content);
  if (recent.length > 8) recent.shift();

  // Mood shift (12% chance)
  const newMood: AIMood = Math.random() < 0.12 ? getMoodShift(persona.mood) : persona.mood;

  // Typing simulation
  const words = content.split(" ").length;
  const baseMs = persona.typingSpeed === "fast" ? 30 : persona.typingSpeed === "slow" ? 80 : 50;
  const typingMs = Math.min(words * baseMs + Math.random() * 500, 4000);

  return { content, newMood, typingMs };
}
