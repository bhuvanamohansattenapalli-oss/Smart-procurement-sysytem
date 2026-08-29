import type { BookingContext } from "../types/api";

export type AssistantLanguage = "EN" | "HI" | "TE";

export interface ExtendedAssistantContext extends Partial<BookingContext> {
  district?: string;
  weatherCondition?: string;
  temperature?: number;
  cropMsp?: number;
}

/** Comprehensive, context-aware agricultural assistant in English, Telugu, and Hindi */
export function createMockAssistantReply(
  question: string,
  context: Partial<BookingContext> = {},
  language: AssistantLanguage = "EN"
): string {
  const prompt = (question || "").trim().toLowerCase();
  const farmerName = context.farmerName || (language === "TE" ? "రైతు మిత్రమా" : language === "HI" ? "किसान साथी" : "Farmer");
  const token = context.tokenNumber || "P-042";
  const bookingCode = context.bookingCode || "BK-2026-7294";
  const centre = context.centreName || "Guntur Agricultural Market Yard";
  const peopleAhead = context.peopleAhead ?? 17;
  const waitMin = context.estimatedWaitMinutes ?? 30;
  const status = (context.procurementStatus || "BOOKED").replaceAll("_", " ");
  const slotDate = context.slotDate || "Wednesday, 18 March 2026";
  const slotTime = context.slotTime || "10:30 – 11:00 AM";

  // =========================================================================
  // 1. TELUGU (తెలుగు) RESPONSES
  // =========================================================================
  if (language === "TE") {
    // 1.1 Customer care & Helplines
    if (
      prompt.includes("customer") || prompt.includes("care") || prompt.includes("helpline") ||
      prompt.includes("number") || prompt.includes("phone") || prompt.includes("call") ||
      prompt.includes("contact") || prompt.includes("toll") || prompt.includes("free") ||
      prompt.includes("కస్టమర్") || prompt.includes("కేర్") || prompt.includes("నంబర్") ||
      prompt.includes("ఫోన్") || prompt.includes("హెల్ప్‌లైన్") || prompt.includes("సంప్రదించ")
    ) {
      return `📞 అధికారిక రైతు కస్టమర్ కేర్ & హెల్ప్‌లైన్ నంబర్లు:\n` +
        `• రైతు భరోసా కేంద్రం (టోల్-ఫ్రీ): 1800-425-0002 (ఉదయం 8:00 నుండి రాత్రి 7:00 వరకు)\n` +
        `• AP పౌరసరఫరాలు & మార్కెట్ యార్డ్ ఫిర్యాదులు: 1902 (24x7 ప్రభుత్వ సేవ)\n` +
        `• కిసాన్ కాల్ సెంటర్ (కేంద్ర ప్రభుత్వం): 1800-180-1551 (అన్ని వ్యవసాయ సలహాలు)\n` +
        `• రైతు బీమా & పంట నష్టపరిహారం డెస్క్: 155251\n` +
        `మీరు యాప్‌లోని 'AI Help Centre' లోని 'Call' బటన్ ద్వారా నేరుగా కాల్ చేయవచ్చు.`;
    }

    // 1.2 Registration & Officer Approval
    if (
      prompt.includes("register") || prompt.includes("registration") || prompt.includes("signup") ||
      prompt.includes("approval") || prompt.includes("pending") || prompt.includes("officer") ||
      prompt.includes("నమోదు") || prompt.includes("రిజిస్ట్రేషన్") || prompt.includes("ఆఫీసర్") ||
      prompt.includes("ఆమోదం") || prompt.includes("లాగిన్") || prompt.includes("ఖాతా")
    ) {
      return `📝 రైతు నమోదు & ఆఫీసర్ ఆమోద విధానం:\n` +
        `1. పోర్టల్‌లో 'New Farmer Registration' ఎంచుకుని పేరు, ఫోన్ నంబర్, ఆధార్, గ్రామం, జిల్లా, పంట మరియు పాస్‌వర్డ్ నమోదు చేయండి (OTP అవసరం లేదు).\n` +
        `2. నమోదు చేసిన వెంటనే మీ వివరాలు సంబంధిత మండలాధికారి (Officer Console) పెండింగ్ జాబితాకు చేరుతాయి.\n` +
        `3. అధికారి ఆధార్ & భూమి రికార్డులను పరిశీలించి ఆమోదించిన (Approve) వెంటనే, మీరు మీ మొబైల్ నంబర్ మరియు పాస్‌వర్డ్‌తో నేరుగా లాగిన్ కావచ్చు.`;
    }

    // 1.3 Crop Prices & MSP
    if (
      prompt.includes("price") || prompt.includes("msp") || prompt.includes("rate") ||
      prompt.includes("ధర") || prompt.includes("మద్దతు") || prompt.includes("వరి") ||
      prompt.includes("పత్తి") || prompt.includes("మొక్కజొన్న") || prompt.includes("మినుములు")
    ) {
      return `🌾 ఆంధ్రప్రదేశ్ ప్రభుత్వ మద్దతు ధరలు (MSP 2025-26):\n` +
        `• గ్రేడ్-A వరి: ₹2,320 / క్వింటాల్\n` +
        `• కామన్ వరి: ₹2,300 / క్వింటాల్\n` +
        `• పత్తి (Cotton): ₹7,521 / క్వింటాల్\n` +
        `• మొక్కజొన్న (Maize): ₹2,225 / క్వింటాల్\n` +
        `• కందులు (Red Gram): ₹7,550 / క్వింటాల్\n` +
        `• వేరుశనగ (Groundnut): ₹6,783 / క్వింటాల్\n` +
        `• సోయాబీన్: ₹4,892 / క్వింటాల్\n` +
        `మరిన్ని వివరాలు మరియు ఆదాయ లెక్కల కోసం 'Govt MSP Rates' ట్యాబ్ చూడండి.`;
    }

    // 1.4 Subsidized Transportation
    if (
      prompt.includes("transport") || prompt.includes("vehicle") || prompt.includes("truck") ||
      prompt.includes("tractor") || prompt.includes("రవాణా") || prompt.includes("ట్రాక్టర్") ||
      prompt.includes("లారీ") || prompt.includes("డ్రైవర్") || prompt.includes("కిరాయి") || prompt.includes("సబ్సిడీ")
    ) {
      return `🚚 30% ప్రభుత్వ సబ్సిడీతో పంట రవాణా బుకింగ్:\n` +
        `• ట్రాక్టర్ ట్రాలీ: ₹18/కి.మీ (30–50 క్వింటాళ్లు, గ్రామ పొలాల నుండి రవాణాకు అనుకూలం)\n` +
        `• మినీ ట్రక్ (టాటా ఏస్): ₹22/కి.మీ (15–25 క్వింటాళ్లు, వేగవంతమైన రవాణా)\n` +
        `• హెవీ లారీ: ₹35/కి.మీ (100–160 క్వింటాళ్లు, బల్క్ లోడ్)\n` +
        `ప్రభుత్వం 30% కిరాయి సబ్సిడీ నేరుగా తగ్గిస్తుంది. బుక్ చేసిన వెంటనే డ్రైవర్ పేరు, వాహనం నంబర్ మరియు ఫోన్ నంబర్ లభిస్తాయి. 'Transportation' ట్యాబ్‌లో బుక్ చేసుకోండి.`;
    }

    // 1.5 Weather & Harvesting Advisory
    if (
      prompt.includes("weather") || prompt.includes("rain") || prompt.includes("forecast") ||
      prompt.includes("temperature") || prompt.includes("వాతావరణం") || prompt.includes("వర్షం") ||
      prompt.includes("ఎండ") || prompt.includes("తేమ") || prompt.includes("కోత")
    ) {
      return `☀️ ఆంధ్రప్రదేశ్ వ్యవసాయ వాతావరణం & పంట కోత నివేదిక:\n` +
        `• ప్రస్తుత వాతావరణం: ఎండగా, పొడిగా సగటున 31°C - 33°C వద్ద ఉంది.\n` +
        `• వాతావరణ తేమ: 60% - 62% (వరి కోత మరియు నూర్పిడికి అనుకూలం).\n` +
        `• సురక్షిత కోత సూచిక: OPTIMAL (అత్యంత అనుకూలం).\n` +
        `• తేమ శాతం సలహా: మార్కెట్ యార్డ్‌లో గరిష్ట ధర కోసం ధాన్యంలో తేమ 17% లోపు ఉండేలా చూసుకోండి. పూర్తి 3 రోజుల సూచన కోసం 'Live Weather' ట్యాబ్ చూడండి.`;
    }

    // 1.6 Token & Queue
    if (
      prompt.includes("token") || prompt.includes("queue") || prompt.includes("wait") ||
      prompt.includes("ahead") || prompt.includes("టోకెన్") || prompt.includes("క్యూ") ||
      prompt.includes("ఎంత మంది") || prompt.includes("సమయం") || prompt.includes("స్థానం")
    ) {
      return `🎫 మీ లైవ్ టోకెన్ & క్యూ వివరాలు:\n` +
        `• మీ టోకెన్ నంబర్: ${token}\n` +
        `• బుకింగ్ రిఫరెన్స్: ${bookingCode}\n` +
        `• కొనుగోలు కేంద్రం: ${centre}\n` +
        `• మీ ముందు ఉన్న రైతులు: ${peopleAhead} మంది\n` +
        `• అంచనా వేచి ఉండే సమయం: సుమారు ${waitMin} నిమిషాలు\n` +
        `ఈ స్క్రీన్ తెరిచి ఉన్నంత వరకు క్యూ ప్రతి 15 సెకన్లకు లైవ్‌గా అప్‌డేట్ అవుతుంది.`;
    }

    // 1.7 Payment & DBT
    if (
      prompt.includes("payment") || prompt.includes("money") || prompt.includes("bank") ||
      prompt.includes("dbt") || prompt.includes("receipt") || prompt.includes("డబ్బులు") ||
      prompt.includes("చెల్లింపు") || prompt.includes("ఖాతా") || prompt.includes("రసీదు")
    ) {
      return `💳 ప్రభుత్వ DBT చెల్లింపు విధానం:\n` +
        `• నాణ్యత తనిఖీ మరియు తూకం పూర్తయిన తర్వాత ఆఫీసర్ డిజిటల్ రసీదును జారీ చేస్తారు.\n` +
        `• మద్దతు ధర మొత్తం 24 నుండి 48 గంటల్లో మీ ఆధార్‌తో లింక్ చేయబడిన బ్యాంక్ ఖాతాలో (DBT) నేరుగా జమ అవుతుంది.\n` +
        `• మీరు 'Payments' ట్యాబ్‌లో రసీదు కాపీని చూడవచ్చు మరియు డౌన్‌లోడ్ చేసుకోవచ్చు.`;
    }

    // 1.8 Documents Checklist
    if (
      prompt.includes("document") || prompt.includes("aadhaar") || prompt.includes("passbook") ||
      prompt.includes("పత్రాలు") || prompt.includes("కాగితాలు") || prompt.includes("సర్టిఫికెట్")
    ) {
      return `📋 కొనుగోలు కేంద్రానికి తీసుకురావాల్సిన ముఖ్యమైన పత్రాలు:\n` +
        `1. రైతు ఆధార్ కార్డు అసలు కాపీ\n` +
        `2. ఆధార్-లింక్డ్ బ్యాంక్ పాస్‌బుక్ మొదటి పేజీ జిరాక్స్\n` +
        `3. ఈ-క్రాప్ (e-Crop) బుకింగ్ రసీదు / పహానీ (1B రికార్డు)\n` +
        `4. ఈ యాప్‌లో జారీ చేసిన డిజిటల్ టోకెన్ పాస్ (${token})\n` +
        `కేంద్రానికి నిర్దేశిత సమయానికి 10 నిమిషాల ముందు చేరుకోండి.`;
    }

    // 1.9 Centres & Map
    if (
      prompt.includes("centre") || prompt.includes("map") || prompt.includes("satellite") ||
      prompt.includes("కేంద్రం") || prompt.includes("మ్యాప్") || prompt.includes("ఎక్కడ") ||
      prompt.includes("గుంటూరు") || prompt.includes("విజయవాడ") || prompt.includes("కర్నూలు")
    ) {
      return `🗺️ ఆంధ్రప్రదేశ్ కొనుగోలు కేంద్రాల నెట్‌వర్క్:\n` +
        `గుంటూరు, విజయవాడ (NTR), కర్నూలు, రాజమండ్రి, విశాఖపట్నం, ఏలూరు, నెల్లూరు మరియు తిరుపతి మార్కెట్ యార్డులు క్రియాశీలకంగా పనిచేస్తున్నాయి.\n` +
        `మీరు 'AP Centres & Map' ట్యాబ్‌లో 🗺️ సాధారణ రోడ్డు మ్యాప్ మరియు 🛰️ శాటిలైట్ వ్యూ ద్వారా కేంద్రాల లైవ్ రద్దీని మరియు గూగుల్ మ్యాప్స్ దిశలను చూడవచ్చు.`;
    }

    // Fallback in Telugu
    return `నమస్కారం ${farmerName}! మీ టోకెన్ ${token}, కొనుగోలు కేంద్రం: ${centre}. క్యూలో మీ ముందు ${peopleAhead} మంది రైతులు ఉన్నారు.\n` +
      `మీరు హెల్ప్‌లైన్ నంబర్లు (1800-425-0002 / 1902), రిజిస్ట్రేషన్ విధానం, పంట మద్దతు ధరలు (MSP), 30% సబ్సిడీ రవాణా, లైవ్ వాతావరణం లేదా చెల్లింపుల గురించి ఏదైనా అడగవచ్చు!`;
  }

  // =========================================================================
  // 2. HINDI (हिन्दी) RESPONSES
  // =========================================================================
  if (language === "HI") {
    // 2.1 Customer care & Helplines
    if (
      prompt.includes("customer") || prompt.includes("care") || prompt.includes("helpline") ||
      prompt.includes("number") || prompt.includes("phone") || prompt.includes("call") ||
      prompt.includes("contact") || prompt.includes("toll") || prompt.includes("free") ||
      prompt.includes("कस्टमर") || prompt.includes("केयर") || prompt.includes("फोन") ||
      prompt.includes("नंबर") || prompt.includes("हेल्पलाइन") || prompt.includes("संपर्क")
    ) {
      return `📞 आधिकारिक किसान कस्टमर केयर एवं हेल्पलाइन नंबर:\n` +
        `• रायथू भरोसा केंद्र (टोल-फ्री): 1800-425-0002 (सोम-शनि सुबह 8:00 से शाम 7:00)\n` +
        `• एपी नागरिक आपूर्ति एवं मंडी शिकायत: 1902 (24x7 सरकारी हेल्पलाइन)\n` +
        `• किसान कॉल सेंटर (भारत सरकार): 1800-180-1551 (कृषि परामर्श)\n` +
        `• फसल बीमा एवं दावा सहायता: 155251\n` +
        `आप पोर्टल के 'AI Help Centre' में जाकर 'Call' बटन दबाकर सीधे कॉल भी कर सकते हैं।`;
    }

    // 2.2 Registration & Officer Approval
    if (
      prompt.includes("register") || prompt.includes("registration") || prompt.includes("signup") ||
      prompt.includes("approval") || prompt.includes("pending") || prompt.includes("officer") ||
      prompt.includes("पंजीकरण") || prompt.includes("रजिस्ट्रेशन") || prompt.includes("अधिकारी") ||
      prompt.includes("स्वीकृति") || prompt.includes("लॉगिन")
    ) {
      return `📝 किसान पंजीकरण एवं अधिकारी सत्यापन प्रक्रिया:\n` +
        `1. 'New Farmer Registration' पर क्लिक कर अपना नाम, मोबाइल नंबर, आधार, गाँव, ज़िला, फसल व पासवर्ड भरें (OTP की आवश्यकता नहीं है)।\n` +
        `2. सबमिट करते ही आपका विवरण नोडल अधिकारी के पास 'Pending' सूची में आ जाता है।\n` +
        `3. अधिकारी द्वारा सत्यापन (Approval) होते ही आप अपने मोबाइल नंबर और पासवर्ड से तुरंत लॉगिन कर सकते हैं।`;
    }

    // 2.3 Crop Prices & MSP
    if (
      prompt.includes("price") || prompt.includes("msp") || prompt.includes("rate") ||
      prompt.includes("दर") || prompt.includes("भाव") || prompt.includes("कीमत") ||
      prompt.includes("धान") || prompt.includes("कपास") || prompt.includes("मक्का")
    ) {
      return `🌾 सरकारी न्यूनतम समर्थन मूल्य (MSP 2025-26):\n` +
        `• धान ग्रेड-A: ₹2,320 / क्विंटल\n` +
        `• साधारण धान: ₹2,300 / क्विंटल\n` +
        `• कपास (Cotton): ₹7,521 / क्विंटल\n` +
        `• मक्का (Maize): ₹2,225 / क्विंटल\n` +
        `• अरहर / तूर दाल: ₹7,550 / क्विंटल\n` +
        `• मूँगफली (Groundnut): ₹6,783 / क्विंटल\n` +
        `• सोयाबीन: ₹4,892 / क्विंटल\n` +
        `विस्तृत विवरण एवं आय कैलकुलेटर हेतु 'Govt MSP Rates' टैब देखें।`;
    }

    // 2.4 Subsidized Transportation
    if (
      prompt.includes("transport") || prompt.includes("vehicle") || prompt.includes("truck") ||
      prompt.includes("tractor") || prompt.includes("परिवहन") || prompt.includes("ट्रैक्टर") ||
      prompt.includes("गाड़ी") || prompt.includes("ड्राइवर") || prompt.includes("सब्सिडी")
    ) {
      return `🚚 30% सरकारी सब्सिडी युक्त फसल परिवहन बुकिंग:\n` +
        `• ट्रैक्टर ट्रॉली: ₹18/किमी (30–50 क्विंटल भार, ग्रामीण खेतों के लिए सर्वोत्तम)\n` +
        `• मिनी ट्रक: ₹22/किमी (15–25 क्विंटल भार, तेज़ परिवहन)\n` +
        `• भारी लॉरी: ₹35/किमी (100–160 क्विंटल भार, बड़ी फसल)\n` +
        `सरकार 30% परिवहन किराया सीधे कम करती है। बुकिंग के साथ ही ड्राइवर का नाम और संपर्क नंबर मिल जाता है। 'Transportation' टैब में बुक करें।`;
    }

    // 2.5 Weather & Harvesting Advisory
    if (
      prompt.includes("weather") || prompt.includes("rain") || prompt.includes("forecast") ||
      prompt.includes("temperature") || prompt.includes("मौसम") || prompt.includes("बारिश") ||
      prompt.includes("तापमान") || prompt.includes("नमी") || prompt.includes("कटाई")
    ) {
      return `☀️ आंध्र प्रदेश कृषि मौसम एवं कटाई परामर्श:\n` +
        `• वर्तमान स्थिति: साफ एवं शुष्क, तापमान 31°C से 33°C।\n` +
        `• वायुमंडलीय आर्द्रता: 60% - 62%।\n` +
        `• सुरक्षित कटाई सूचकांक: OPTIMAL (उत्कृष्ट)।\n` +
        `• महत्वपूर्ण सलाह: मंडी में पूरा मूल्य प्राप्त करने के लिए धान में नमी 17% से कम रखें। विस्तृत 3 दिवसीय पूर्वानुमान के लिए 'Live Weather' टैब देखें।`;
    }

    // 2.6 Token & Queue
    if (
      prompt.includes("token") || prompt.includes("queue") || prompt.includes("wait") ||
      prompt.includes("ahead") || prompt.includes("टोकन") || prompt.includes("कतार") ||
      prompt.includes("प्रतीक्षा") || prompt.includes("स्थिति")
    ) {
      return `🎫 आपकी लाइव टोकन एवं कतार स्थिति:\n` +
        `• आपका टोकन नंबर: ${token}\n` +
        `• बुकिंग कोड: ${bookingCode}\n` +
        `• खरीद केंद्र: ${centre}\n` +
        `• आपके आगे किसान: ${peopleAhead}\n` +
        `• अनुमानित प्रतीक्षा समय: लगभग ${waitMin} मिनट\n` +
        `कतार की स्थिति हर 15 सेकंड में स्वतः अपडेट होती रहती है।`;
    }

    // 2.7 Payment & DBT
    if (
      prompt.includes("payment") || prompt.includes("money") || prompt.includes("bank") ||
      prompt.includes("dbt") || prompt.includes("receipt") || prompt.includes("भुगतान") ||
      prompt.includes("पैसे") || prompt.includes("खाता") || prompt.includes("रसीद")
    ) {
      return `💳 सरकारी DBT भुगतान प्रक्रिया:\n` +
        `• वजन और गुणवत्ता जांच के बाद खरीद पर्ची तैयार होती है।\n` +
        `• समर्थन मूल्य की कुल राशि 24 से 48 घंटे के भीतर सीधे आपके आधार-लिंक्ड बैंक खाते (DBT) में पहुँच जाती है।\n` +
        `• आप 'Payments' टैब से डिजिटल रसीद डाउनलोड कर सकते हैं।`;
    }

    // 2.8 Documents Checklist
    if (
      prompt.includes("document") || prompt.includes("aadhaar") || prompt.includes("passbook") ||
      prompt.includes("दस्तावेज़") || prompt.includes("कागज़") || prompt.includes("पहचान")
    ) {
      return `📋 खरीद केंद्र पर साथ ले जाने वाले आवश्यक दस्तावेज़:\n` +
        `1. किसान आधार कार्ड की मूल प्रति\n` +
        `2. आधार से जुड़े बैंक पासबुक के प्रथम पृष्ठ की प्रति\n` +
        `3. ई-फसल (e-Crop) पंजीकरण रसीद / 1B भूमि रिकॉर्ड\n` +
        `4. इस पोर्टल का डिजिटल टोकन पास (${token})\n` +
        `केंद्र पर निर्धारित समय से 10 मिनट पहले पहुँचना सुनिश्चित करें।`;
    }

    // 2.9 Centres & Map
    if (
      prompt.includes("centre") || prompt.includes("map") || prompt.includes("satellite") ||
      prompt.includes("केंद्र") || prompt.includes("नक्शा") || prompt.includes("कहाँ") ||
      prompt.includes("गुंटूर") || prompt.includes("विजयवाड़ा") || prompt.includes("कर्नूल")
    ) {
      return `🗺️ आंध्र प्रदेश खरीद केंद्र नेटवर्क:\n` +
        `गुंटूर, विजयवाड़ा (NTR), कर्नूल, राजामहेंद्री, विशाखापट्टनम, एलुरु, नेल्लूर एवं तिरुपति केंद्र चालू हैं।\n` +
        `'AP Centres & Map' टैब में आप 🗺️ साधारण सड़क नक्शा और 🛰️ सैटेलाइट व्यू द्वारा केंद्रों की दूरी, कतार और गूगल मैप्स दिशा-निर्देश देख सकते हैं।`;
    }

    // Fallback in Hindi
    return `नमस्ते ${farmerName}! आपका टोकन ${token} है, केंद्र: ${centre}, और आपके आगे ${peopleAhead} किसान कतार में हैं।\n` +
      `आप हेल्पलाइन नंबर (1800-425-0002 / 1902), पंजीकरण, समर्थन मूल्य (MSP), 30% सब्सिडी परिवहन, मौसम या भुगतान के बारे में कोई भी प्रश्न पूछ सकते हैं!`;
  }

  // =========================================================================
  // 3. ENGLISH RESPONSES
  // =========================================================================
  // 3.1 Customer care & Helplines
  if (
    prompt.includes("customer") || prompt.includes("care") || prompt.includes("helpline") ||
    prompt.includes("number") || prompt.includes("phone") || prompt.includes("call") ||
    prompt.includes("contact") || prompt.includes("toll") || prompt.includes("free") ||
    prompt.includes("support") || prompt.includes("help")
  ) {
    return `📞 Official Andhra Pradesh Rythu Customer Care & Helplines:\n` +
      `• Rythu Bharosa Kendra (RBK Toll-Free): 1800-425-0002 (Mon–Sat, 8:00 AM – 7:00 PM)\n` +
      `• AP Civil Supplies & Mandi Control Room: 1902 (24x7 Mandi Operations & Grievance)\n` +
      `• Kisan Call Centre (Govt of India): 1800-180-1551 (National Agriculture Expert Advisory)\n` +
      `• Rythu Bima & Insurance Claim Desk: 155251\n` +
      `• Subsidized Transport Logistics Desk: 1800-425-0002\n` +
      `You can click the 'Call' or 'Copy' buttons in the AI Help Centre panel to dial directly.`;
  }

  // 3.2 Registration & Officer Approval
  if (
    prompt.includes("register") || prompt.includes("registration") || prompt.includes("signup") ||
    prompt.includes("approval") || prompt.includes("pending") || prompt.includes("officer") ||
    prompt.includes("account") || prompt.includes("login") || prompt.includes("password")
  ) {
    return `📝 Farmer Registration & Officer Approval Workflow:\n` +
      `1. Click 'New Farmer Registration' and enter your Name, Mobile, Aadhaar, Village, District, Land size, Primary Crop, and Password (No OTP required).\n` +
      `2. Upon submitting, your registration immediately appears in the Officer Console pending queue.\n` +
      `3. Once the nodal procurement officer reviews and approves your account, you can instantly log in with your Mobile Number and Password.`;
  }

  // 3.3 Crop Prices & MSP Rates
  if (
    prompt.includes("price") || prompt.includes("msp") || prompt.includes("rate") ||
    prompt.includes("paddy") || prompt.includes("cotton") || prompt.includes("maize") ||
    prompt.includes("quintal") || prompt.includes("cost")
  ) {
    return `🌾 Government Minimum Support Prices (MSP 2025-26 Season):\n` +
      `• Paddy (Grade A): ₹2,320 / quintal\n` +
      `• Common Paddy: ₹2,300 / quintal\n` +
      `• Cotton (Medium/Long Staple): ₹7,521 / quintal\n` +
      `• Maize: ₹2,225 / quintal\n` +
      `• Red Gram (Tur/Arhar): ₹7,550 / quintal\n` +
      `• Groundnut: ₹6,783 / quintal\n` +
      `• Soyabean: ₹4,892 / quintal\n` +
      `• Wheat: ₹2,425 / quintal\n` +
      `Check the 'Govt MSP Rates' tab to calculate your estimated harvest valuation.`;
  }

  // 3.4 Subsidized Transportation
  if (
    prompt.includes("transport") || prompt.includes("vehicle") || prompt.includes("truck") ||
    prompt.includes("tractor") || prompt.includes("logistics") || prompt.includes("fare") ||
    prompt.includes("subsidy") || prompt.includes("driver")
  ) {
    return `🚚 30% Govt Subsidized Farm Logistics Booking:\n` +
      `• Tractor Trolley: ₹18/km (30–50 Quintals capacity, ideal for farm/village roads)\n` +
      `• Mini Truck (Tata Ace): ₹22/km (15–25 Quintals capacity, fast direct transit)\n` +
      `• Heavy Lorry: ₹35/km (100–160 Quintals capacity, bulk movement)\n` +
      `The government 30% transport subsidy is automatically deducted from your net payable fare. Driver name, vehicle number, and phone number are assigned instantly. Book from the 'Transportation' tab.`;
  }

  // 3.5 Weather & Harvesting Advisory
  if (
    prompt.includes("weather") || prompt.includes("rain") || prompt.includes("forecast") ||
    prompt.includes("temperature") || prompt.includes("humidity") || prompt.includes("harvest") ||
    prompt.includes("moisture") || prompt.includes("drying")
  ) {
    return `☀️ Andhra Pradesh Agricultural Meteorology & Safe Harvesting:\n` +
      `• Current Conditions: Favorable sunny & clear conditions, 31°C – 33°C across AP districts.\n` +
      `• Humidity: 60% - 62% (optimal drying window).\n` +
      `• Safe Harvesting Index: OPTIMAL (Safe for harvest, open-air drying, and transit).\n` +
      `• Moisture Guideline: Ensure paddy moisture is below 17% for Grade A classification at the procurement yard. Check the 'Live Weather' tab for full 3-day district forecasts.`;
  }

  // 3.6 Token & Queue Position
  if (
    prompt.includes("token") || prompt.includes("queue") || prompt.includes("wait") ||
    prompt.includes("ahead") || prompt.includes("position") || prompt.includes("delay")
  ) {
    return `🎫 Live Token & Queue Status:\n` +
      `• Your Token Number: ${token}\n` +
      `• Booking Reference: ${bookingCode}\n` +
      `• Procurement Centre: ${centre}\n` +
      `• Farmers Ahead in Queue: ${peopleAhead} ${peopleAhead === 1 ? 'farmer' : 'farmers'}\n` +
      `• Estimated Waiting Time: ~${waitMin} minutes\n` +
      `The queue dynamically refreshes every 15 seconds from the central AP database.`;
  }

  // 3.7 DBT Payments & Settlement
  if (
    prompt.includes("payment") || prompt.includes("money") || prompt.includes("bank") ||
    prompt.includes("dbt") || prompt.includes("receipt") || prompt.includes("settlement") ||
    prompt.includes("account")
  ) {
    return `💳 Direct Benefit Transfer (DBT) Payment Settlement:\n` +
      `• After quality assessment and digital weighing at the mandi, the procurement record is finalized.\n` +
      `• The full MSP procurement amount is transferred directly via DBT into your Aadhaar-linked bank account within 24 to 48 hours.\n` +
      `• Digital receipts and payment logs are saved in the 'Payments' tab for record-keeping.`;
  }

  // 3.8 Mandatory Documents Checklist
  if (
    prompt.includes("document") || prompt.includes("required") || prompt.includes("aadhaar") ||
    prompt.includes("passbook") || prompt.includes("checklist") || prompt.includes("carry")
  ) {
    return `📋 Mandatory Mandi Verification Documents:\n` +
      `1. Farmer Aadhaar Card (Original)\n` +
      `2. Aadhaar-linked Bank Passbook first page copy (for DBT verification)\n` +
      `3. e-Crop 1B Land Record / Pahani harvest receipt\n` +
      `4. Digital Token Pass from this portal (${token})\n` +
      `Please arrive 10 minutes prior to your scheduled slot (${slotDate} · ${slotTime}).`;
  }

  // 3.9 Centres & Interactive Map
  if (
    prompt.includes("centre") || prompt.includes("map") || prompt.includes("satellite") ||
    prompt.includes("location") || prompt.includes("guntur") || prompt.includes("vijayawada") ||
    prompt.includes("kurnool") || prompt.includes("directions")
  ) {
    return `🗺️ Andhra Pradesh Procurement Centres & Live Map:\n` +
      `All 8 AP mandi hubs (Guntur, Vijayawada, Kurnool, Rajahmundry, Visakhapatnam, Eluru, Nellore, and Tirupati) are active.\n` +
      `Visit the 'AP Centres & Map' tab to switch between 🗺️ Normal Street Map and 🛰️ High-Resolution Satellite Map to explore yards, check live capacity, and get direct driving directions.`;
  }

  // Fallback in English
  return `Namaste ${farmerName}! Your token is ${token} at ${centre} with ${peopleAhead} farmers ahead in queue. Current status: ${status}.\n` +
    `I can answer anything regarding: Official Helplines (1800-425-0002 / 1902), Farmer Registration, Crop MSP Prices, 30% Subsidized Transport, Live Weather, Token & Queue, or DBT Payments. What would you like to know?`;
}
