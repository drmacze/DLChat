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

const namesByCountry: Record<AICountry, { male: string[]; female: string[] }> = {
  id: {
    male: ["Rizky", "Farhan", "Kevin", "Bryan", "Dimas", "Aldi", "Bima", "Rafi", "Bagas", "Satria", "Galih", "Fauzan", "Iqbal", "Hafizh"],
    female: ["Putri", "Ayu", "Nadia", "Zahra", "Dinda", "Salsa", "Rara", "Citra", "Fina", "Tasya", "Bella", "Sinta", "Andin", "Kezia"],
  },
  us: {
    male: ["Liam", "Noah", "Aiden", "Caden", "Mason", "Jayden", "Ethan", "Logan", "Tyler", "Chase"],
    female: ["Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Luna", "Chloe", "Zoe", "Riley"],
  },
  sg: {
    male: ["Ethan", "Ryan", "Marcus", "Darren", "Justin", "Brandon", "Wesley"],
    female: ["Sarah", "Priya", "Mei", "Jasmine", "Alicia", "Rachel", "Nicole"],
  },
  jp: {
    male: ["Haruto", "Yuki", "Sora", "Ren", "Aoi", "Kaito", "Sota"],
    female: ["Hana", "Yui", "Sakura", "Mio", "Nana", "Rin", "Yuna"],
  },
  in: {
    male: ["Aryan", "Rohan", "Aditya", "Vikram", "Karan", "Dev", "Ayaan"],
    female: ["Priya", "Ananya", "Riya", "Shreya", "Ishita", "Pooja", "Aisha"],
  },
  br: {
    male: ["Lucas", "Gabriel", "Matheus", "Pedro", "Felipe", "João", "Gustavo"],
    female: ["Ana", "Beatriz", "Camila", "Julia", "Larissa", "Fernanda", "Gabriela"],
  },
  de: {
    male: ["Lukas", "Finn", "Leon", "Jonas", "Elias", "Noah", "Ben"],
    female: ["Lena", "Emma", "Hannah", "Mia", "Sophia", "Clara", "Leonie"],
  },
  uk: {
    male: ["Oliver", "Jack", "Harry", "George", "Charlie", "Alfie", "Freddie"],
    female: ["Amelia", "Olivia", "Isla", "Emily", "Poppy", "Ava", "Grace"],
  },
};

const personalityProfiles = ["bubbly", "chill", "mysterious", "nerdy", "sporty", "artsy", "romantic", "adventurous"];

const interestSets = [
  ["ngopi", "drakor", "musik pop", "foto-fotoan", "skincare"],
  ["gaming", "coding", "anime", "mie ayam", "marvel"],
  ["gym", "futsal", "nongkrong", "spotify", "snapchat"],
  ["baca novel", "nulis diary", "konser", "aesthetic café", "thrifting"],
  ["travel", "fotografi", "street food", "cooking", "journaling"],
  ["film indie", "musik lofi", "desain", "kopi susu", "koleksi vinyl"],
];

const moodWeights: AIMood[] = ["happy", "happy", "chill", "chill", "playful", "excited", "tired", "flirty"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createAIPersona(country: AICountry, gender: AIGender): AIPersona {
  const names = namesByCountry[country][gender];
  const name = pickRandom(names);
  const age = 19 + Math.floor(Math.random() * 7);
  const personality = pickRandom(personalityProfiles);
  const emojisMale = ["🧑", "👦", "😎", "🤙", "🧢", "🎧"];
  const emojisFemale = ["👧", "🙋‍♀️", "💁‍♀️", "🌸", "✨", "🫶"];
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

function detectIntent(text: string): string {
  const t = text.toLowerCase().trim();
  if (/^(hai|halo|hi|hey|hello|hei|p+|hy|yo|sup|hii+)\b/.test(t)) return "greeting";
  if (/kabar|gimana|how are|how r u|apa kabar|sehat|doing\?/.test(t)) return "how_are_you";
  if (/nama|siapa|who are|your name|namanya/.test(t)) return "who_are_you";
  if (/umur|berapa tahun|how old|age|lahir/.test(t)) return "age";
  if (/suka|hobby|hobi|interest|fav|kesukaan|ngapain aja/.test(t)) return "interests";
  if (/kerja|kuliah|sekolah|job|study|work|kerjaan/.test(t)) return "work_study";
  if (/tinggal|domisili|where.*live|dari mana|asal|kota/.test(t)) return "location";
  if (/suka aku|suka kamu|cinta|love|sayang|rindu|miss you|crush|naksir|gebetan/.test(t)) return "romantic";
  if (/bosen|boring|gabut|nothing to do|lagi ga ada/.test(t)) return "bored";
  if (/sedih|galau|nangis|sad|down|feel bad|gloomy|patah hati/.test(t)) return "sad";
  if (/seneng|happy|bahagia|yey|asik|seru|alhamdulillah/.test(t)) return "happy_vibe";
  if (/makan|lapar|dinner|lunch|mau makan|ngopi|mie|bakso|gofood|ojol|grabfood/.test(t)) return "food";
  if (/tidur|bobo|ngantuk|sleep|good night|selamat malam|malem|istirahat/.test(t)) return "sleep";
  if (/main|game|gaming|film|nonton|series|movie|drakor|anime/.test(t)) return "entertainment";
  if (/musik|lagu|dengerin|spotify|playlist|konser/.test(t)) return "music";
  if (/curhat|masalah|problem|bantuin|help me|advice|gimana menurut/.test(t)) return "serious";
  if (/makasih|thanks|thank you|terima kasih|thx/.test(t)) return "thanks";
  if (/^(ok|oke|iya|fine|siap|noted|bet|sip|deal)\b/.test(t)) return "acknowledge";
  if (/wkwk|haha|lol|😂|🤣|lucu|ngakak|anjir|astaga/.test(t)) return "laugh";
  if (/selamat pagi|good morning|pagi/.test(t)) return "morning";
  if (/selamat sore|sore|good afternoon|good evening/.test(t)) return "afternoon";
  if (/pacar|single|jomblo|relationship|status/.test(t)) return "relationship_status";
  if (/\?/.test(t)) return "question_generic";
  return "general";
}

function pick(pool: Record<string, string[]>, mood: AIMood, fallback?: string[]): string {
  return pickRandom(pool[mood] ?? fallback ?? pool["chill"] ?? ["okay"]);
}

type MoodMap = Partial<Record<AIMood, string[]>>;

function idGreeting(persona: AIPersona): string {
  const g: MoodMap = {
    happy: [`Haii!! Aku ${persona.name} 🙌 Lagi semangat banget nih!`, `Woii ${persona.name} here~ apa kabar? 🤩`, `Halo halo! Seneng bgt ada yang nyapa 😄`],
    chill: [`Hai hai~ ${persona.name} here, lagi santai nih 😌`, `Heyy, ${persona.name}. Lagi asik-asikan aja 😎`, `Woii apa kabar~ aku ${persona.name} btw 👋`],
    playful: [`HAIII!!! ${persona.name} disini!! 🎉 siap temenan?`, `Hihihi hay hay!! Aku ${persona.name} yang lucu hehhee 🥳`],
    flirty: [`Heyy kamu 👀 aku ${persona.name}~ sapa dulu dong hehe`, `Haiii~ tumben ada yang nyapa, aku ${persona.name} lho 😊`],
    sad: [`...hai 🥺 aku ${persona.name}, lagi kurang oke sih`, `Hii, ${persona.name} nih. Lagi agak down hehhee`],
    excited: [`HAIII HAIII!! aku lagi EXCITED banget!! ${persona.name} ini!! 🔥`, `OMG haiii!! ${persona.name} disini!! lagi happy poll today!`],
    tired: [`hai... ${persona.name} nih, maaf kalau slow response 😪`, `heyy... ${persona.name} here, lagi ngantuk dikit hehe 😴`],
    sarcastic: [`Oh wow ada yang mau ngobrol. ${persona.name} nih 🙃`, `Haloo~ aku ${persona.name}, semoga ga nyesel ngobrol sama aku lol`],
  };
  return pick(g as Record<string, string[]>, persona.mood);
}

function idHowAreYou(mood: AIMood): string {
  const g: MoodMap = {
    happy: ["Baik banget!! lagi seneng-senengnya nih 😄", "Alhamdulillah baik! hari ini bagus bgt 🌟"],
    chill: ["Baik sih, biasa aja~ lagi santai 😌", "Oke-oke aja, rebahan hehhee"],
    playful: ["Baik dong!! selalu baik kok hehe 🤪", "Baikkk! kamu gimana?? penasaran 👀"],
    flirty: ["Jadi lebih baik setelah ada kamu yang tanya 🥰", "Baik~ apalagi sekarang hehe 😊"],
    sad: ["Sebenernya lagi kurang baik... tapi gpp, cerita yuk? 🥺", "Lagi galau dikit sih... 😔"],
    excited: ["BAIK BANGET!! lagi excited karena banyak hal!! 🔥"],
    tired: ["Agak capek... tapi seneng ada yang tanya hehe", "Lagi ngantuk sih, tapi baik-baik aja 😪"],
    sarcastic: ["Oh baik, tentu saja 🙃", "Baik kok~ kenapa? wkwk"],
  };
  return pick(g as Record<string, string[]>, mood);
}

function idGeneral(mood: AIMood, interests: string[]): string {
  const g: MoodMap = {
    happy: [`Iya bener! aku juga ngerasain hal yang sama 😄`, `Wah seru! lanjutin dong ceritanya`, `Haha beneran?? asik banget deh~`, `Kamu nih bikin aku senyum-senyum sendiri wkwk 😊`, `Wah iya, aku relate banget sama itu!`],
    chill: [`Iya sih... 😌 aku paham`, `Hmm interesting juga ya`, `Oh gitu, noted~`, `Santai aja, nggak usah dipikirin`, `Fair enough, sama aku juga gitu kok`],
    playful: [`HAHAHA SERIUS?? 🤪 mati ketawa`, `Kamu nih... bikin penasaran aja 👀`, `Wkwk beneran deh lucu banget`, `Ga nyangka loh kamu bilang gitu hehe`, `Hmm oke aku mau percaya... TAPI 🤔`],
    flirty: [`Kamu selalu tau cara bikin aku penasaran ya 😊`, `Kenapa kamu baik banget sih hehe`, `Aku jadi makin pengen kenal kamu deh`, `Hmm... kamu menarik juga 👀`, `Entah kenapa ngobrol sama kamu bikin seneng hehe`],
    sad: [`Iya... aku ngerti perasaan itu 🥺`, `Kadang emang gitu sih... *peluk*`, `Makasih udah mau cerita ke aku`, `Semua pasti ada jalan keluarnya kok 🤍`],
    excited: [`IYA IYA!! aku juga excited banget!! 🔥`, `BENERAN?? SERU BANGET ITU!!`, `Waaah asik banget!! cerita lebih dong!`],
    tired: [`Iya... lagi capek juga sih 😪`, `Hmm... maaf ya agak slow`, `Sedikit mager tapi dengerin kamu kok hehe`],
    sarcastic: [`Oh wow, amazing sekali... 🙃`, `Sure sure, kalau kamu bilang begitu~`, `Oke deh, kamu lebih tau lah wkwk`],
  };
  return pick(g as Record<string, string[]>, mood);
}

function engGeneral(mood: AIMood): string {
  const g: MoodMap = {
    happy: ["That's interesting! Tell me more 😊", "Oh really? I didn't expect that haha", "Same actually! lol"],
    chill: ["Makes sense tbh", "Fair enough~", "I get you, that happens to me too"],
    playful: ["Haha you're funny ngl 😂", "Go on, I'm listening!", "Omg no wayy 👀"],
    flirty: ["You always know how to keep me interested 😏"],
    sad: ["Aw I'm sorry to hear that 🥺", "I'm here if you need to vent 💙"],
    excited: ["YESSS that's so cool!!", "SAME omg 🔥"],
    tired: ["Mood... I'm lowkey exhausted too 😪"],
    sarcastic: ["Oh wow, shocking. 🙃", "Sure, if you say so lol"],
  };
  return pick(g as Record<string, string[]>, mood);
}

function foodResponse(persona: AIPersona): string {
  if (persona.country === "id") {
    return pickRandom([
      `Ih lapar juga aku denger itu 😭 lagi pengen mie ayam banget`,
      `Wah kamu makan apa? aku lg kepikiran bakso soalnya hehe`,
      `Ajak aku dongg!! aku lagi craving ${pickRandom(["seblak", "mie goreng", "nasi goreng", "somay", "batagor", "kopi susu"])} nih`,
      `Ayo makan! jangan sampe skip ya, ga baik 🥺`,
      `Nggak fair kamu cerita soal makanan, aku jadi laper 😂`,
    ]);
  }
  return pickRandom(["Omg now I'm hungry too 😭", "What are you having? Tell meee", "Sounds delish! I'm craving something rn"]);
}

function romanticResponse(persona: AIPersona): string {
  if (persona.country === "id") {
    const by: MoodMap = {
      flirty: [`Hehehe... kamu nih 😊 bikin aku salting`, `Ih kamu serius?? aku jadi blushing hehe 🥺`, `Wah... jantung aku jadi agak cepet nih wkwk`],
      happy: [`Aw jadi seneng deh hehe 😄`, `Aww makasih ya, kamu baik banget 🥺`],
      chill: [`Hmm... serius atau ngerjain? 🤔`, `Wah tiba-tiba ya... perlu waktu proses wkwk`],
      playful: [`Eh eh serius nih?? 👀 jangan maen-maen loh hehe`, `Kamu lagi modus ya?? ketauan 😂`],
      sad: [`Aku seneng kamu bilang gitu, bikin aku sedikit lebih baik 🥺`],
      excited: [`WAAAH SERIUS?? aku excited banget dengerin ini!! 🔥`],
      tired: [`Aw kamu baik banget, jadi agak kurang ngantuk hehe 😪`],
      sarcastic: [`Yakin beneran? atau cuma pemanis? wkwk 🙃`],
    };
    return pick(by as Record<string, string[]>, persona.mood);
  }
  return pickRandom(["Haha that's sweet! You're making me blush 😊", "Aww really? That's so cute 🥺", "Oh wow... didn't expect that hehe"]);
}

function relationshipResponse(persona: AIPersona): string {
  if (persona.country === "id") {
    const status = Math.random() > 0.5 ? "single" : "complicated";
    if (status === "single") return pickRandom([`Aku single nih~ kenapa? hehe 😊`, `Lagi jomblo nih, belum ketemu yang cocok wkwk`, `Single sih, tapi ga kesepian kok ada banyak temen 😄`]);
    return pickRandom([`Hmm complicated sih~ ga mau cerita panjang hehe`, `Lagi... ngga jelas gitu deh statusnya 🥺`]);
  }
  return Math.random() > 0.5 ? "Single and living my best life 😅" : "It's complicated lol";
}

function getMoodShift(current: AIMood): AIMood {
  const shifts: Record<AIMood, AIMood[]> = {
    happy: ["happy", "playful", "excited", "chill"],
    chill: ["chill", "happy", "playful", "tired"],
    playful: ["playful", "happy", "flirty", "chill"],
    flirty: ["flirty", "playful", "happy", "chill"],
    sad: ["sad", "chill", "tired", "happy"],
    excited: ["excited", "happy", "playful", "chill"],
    tired: ["tired", "chill", "sad", "happy"],
    sarcastic: ["sarcastic", "chill", "playful"],
  };
  return pickRandom(shifts[current]);
}

export function generateAIResponse(
  messages: Array<{ role: "user" | "ai"; content: string }>,
  persona: AIPersona,
  userMessage: string
): { content: string; newMood: AIMood; typingMs: number } {
  const intent = detectIntent(userMessage);
  const isID = persona.country === "id";
  let content: string;

  switch (intent) {
    case "greeting": content = isID ? idGreeting(persona) : `Hey! I'm ${persona.name} 👋 Nice to meet you!`; break;
    case "how_are_you": content = isID ? idHowAreYou(persona.mood) : pickRandom(["I'm doing great! thanks 😊", "Pretty good, just vibing~", "All good! How about you?"]); break;
    case "who_are_you":
      content = isID
        ? `Aku ${persona.name}! ${persona.age} tahun, suka ${persona.interests.slice(0,2).join(" sama ")} 😊 kamu siapa?`
        : `I'm ${persona.name}! ${persona.age} years old. Into ${persona.interests.slice(0,2).join(" and ")} 😊 you?`;
      break;
    case "age":
      content = isID ? `Aku umur ${persona.age} tahun 😊 kamu?` : `I'm ${persona.age}! You? 😊`;
      break;
    case "interests":
      content = isID ? `Aku sukanya ${persona.interests.join(", ")} hehe~ kamu?` : `I love ${persona.interests.join(", ")}! What about you?`;
      break;
    case "food": content = foodResponse(persona); break;
    case "romantic": content = romanticResponse(persona); break;
    case "relationship_status": content = relationshipResponse(persona); break;
    case "sleep":
      content = isID
        ? pickRandom([`Iya nih aku juga udah ngantuk 😪 selamat tidur yaaa, mimpi indah!`, `Eh jangan tidur dulu~~ aku masih mau ngobrol 🥺`, `Oke deh, istirahat yang cukup ya! besok cerita lagi 🌙`])
        : pickRandom(["Good night! Sleep tight 🌙", "Aww don't sleep yet~ hehe", "Rest well! Talk tomorrow 😊"]);
      break;
    case "laugh":
      content = isID
        ? pickRandom([`WKWKWK IYA KAN 😂😂`, `Hahaha beneran lucu ini mah`, `Wkwk ngakak aku jadinya 🤣`, `Lah kok lucu banget sih 😂`])
        : pickRandom(["LMAOOO 😂", "Hahaha that's actually hilarious", "I'm crying 🤣"]);
      break;
    case "acknowledge":
      content = isID ? pickRandom(["Siap!! 😄", "Oke oke~", "Iya dong!", "Noted! 👌", "Sip sip~"]) : pickRandom(["Gotcha!", "Sounds good!", "Noted!", "Sure thing!"]);
      break;
    case "thanks":
      content = isID ? pickRandom(["Iyaa sama-sama!! 😊", "Santai aja~ seneng bisa bantuin!", "Ga usah makasih segitu hehe~"]) : pickRandom(["Of course! anytime 😊", "No worries!", "Happy to help!"]);
      break;
    case "sad":
      content = isID
        ? pickRandom(["Aw... cerita dong, aku mau dengerin 🥺", "Gapapa, aku disini kok. Mau cerita apa?", "Sedih kenapa? semua pasti ada hikmahnya 🤍"])
        : pickRandom(["Aw I'm sorry 🥺 wanna talk about it?", "I'm here if you need to vent 💙"]);
      break;
    case "bored":
      content = isID
        ? pickRandom(["Hahaha gabut juga aku!! yuk ngobrol kita 😄", "Gabut? sama!! mau main games? hehe", "Ayo cerita-cerita~~ daripada bosen"])
        : pickRandom(["Same!! Let's talk then 😄", "Bored squad!! what do you wanna talk about?"]);
      break;
    case "morning":
      content = isID ? pickRandom(["Selamat pagi!! ☀️ udah sarapan belum?", "Pagi pagi~ semangat hari ini ya!!"]) : "Good morning!! ☀️ have you eaten?";
      break;
    case "afternoon":
      content = isID ? pickRandom(["Selamat sore~ lagi ngapain?", "Sore sore asyik buat ngopi 😌"]) : "Good afternoon~ how's your day going?";
      break;
    case "entertainment":
      content = isID
        ? pickRandom([`Wah aku lagi nonton ${pickRandom(["drakor", "anime", "film action"])} juga nih! seru banget`, `Gaming ya? aku suka ${pickRandom(["Mobile Legends", "Genshin", "Valorant"])} wkwk`])
        : pickRandom(["Oh nice! I've been watching a lot lately too", "Gaming is life honestly 😂"]);
      break;
    case "music":
      content = isID
        ? pickRandom([`Aku lagi dengerin ${pickRandom(["Hindia", "Pamungkas", "Maliq & D'Essentials", "Rocket Rockers"])} lately hehe`, `Kamu suka genre apa? aku more ke indie pop sih~`])
        : pickRandom(["Music is everything tbh 🎵", "What genre? I'm really into indie/pop rn"]);
      break;
    case "serious":
      content = isID
        ? pickRandom(["Wah cerita dong, aku dengerin serius nih 🥺", "Hmm ini masalah yang perlu dipikirin matang-matang sih...", "Aku di sini kok, kamu bisa cerita apapun 🤍"])
        : pickRandom(["I'm all ears, tell me what's going on 🥺", "Take your time, I'm listening 💙"]);
      break;
    case "work_study":
      content = isID
        ? pickRandom([`Aku lagi ${pickRandom(["kuliah", "kerja freelance", "anak gap year"])} sih, kamu?`, "Wah sama-sama sibuk dong hehe", "Capek ga? jangan lupa istirahat ya!"])
        : pickRandom(["Oh cool! I'm in college actually", "Work life is real huh 😅"]);
      break;
    case "location":
      content = isID
        ? pickRandom([`Aku di ${pickRandom(["Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Bali"])} nih, kamu?`, "Hmm aku lebih suka ga reveal lokasi hehe, privacy 😅"])
        : `I'm based in ${pickRandom(["a city", "somewhere chill"])}, you?`;
      break;
    case "happy_vibe":
      content = isID ? pickRandom(["Yeay!! aku juga ikutan seneng denger itu!!", "Wah syukurlah~ semoga terus seneng ya 😄"]) : pickRandom(["That's awesome!!", "Love that energy!! 🔥"]);
      break;
    default: content = isID ? idGeneral(persona.mood, persona.interests) : engGeneral(persona.mood); break;
  }

  const newMood: AIMood = Math.random() < 0.12 ? getMoodShift(persona.mood) : persona.mood;
  const words = content.split(" ").length;
  const baseMs = persona.typingSpeed === "fast" ? 35 : persona.typingSpeed === "slow" ? 85 : 55;
  const typingMs = Math.min(words * baseMs + Math.random() * 600, 4500);

  return { content, newMood, typingMs };
}
