// Exhaustive Platform Dictionary - Part 2
// Covers all remaining operational messages, questions, prompts, notices,
// toasts, errors, dialogs, and verification labels.

const EXHAUSTIVE_PLATFORM_STRINGS = {
  // Frequently Asked Questions & AI Prompts
  "How many farmers are currently ahead of me?": {
    TE: "ప్రస్తుతం నా కంటే ముందు ఎంతమంది రైతులు వేచి ఉన్నారు?",
    HI: "वर्तमान में मुझसे आगे कितने किसान प्रतीक्षा कर रहे हैं?"
  },
  "Is today's weather safe for paddy harvest in Guntur?": {
    TE: "గుంటూరులో ఈరోజు వరి కోతకు వాతావరణం అనుకూలమేనా?",
    HI: "क्या गुंटूर में आज धान की कटाई के लिए मौसम सुरक्षित है?"
  },
  "What documents must I carry to the procurement mandi?": {
    TE: "కొనుగోలు కేంద్రానికి నేను ఏయే పత్రాలు తీసుకురావాలి?",
    HI: "खरीद मंडी में मुझे कौन से दस्तावेज़ साथ लाने होंगे?"
  },
  "Which AP centre currently has the shortest queue?": {
    TE: "ప్రస్తుతం ఆంధ్రప్రదేశ్‌లో ఏ కేంద్రంలో తక్కువ రద్దీ ఉంది?",
    HI: "वर्तमान में आंध्र के किस केंद्र पर सबसे छोटी कतार है?"
  },
  "When should I reach the centre for document verification?": {
    TE: "పత్రాల ధృవీకరణ కోసం నేను కేంద్రానికి ఎప్పుడు చేరుకోవాలి?",
    HI: "दस्तावेज़ सत्यापन के लिए मुझे केंद्र पर कब पहुंचना चाहिए?"
  },
  "What is the maximum allowed moisture percentage for Grade A paddy?": {
    TE: "గ్రేడ్-A వరి ధాన్యానికి గరిష్టంగా అనుమతించబడే తేమ శాతం ఎంత?",
    HI: "ग्रेड-ए धान के लिए अधिकतम अनुमेय नमी प्रतिशत क्या है?"
  },
  "How do I protect harvest bags during transit from humidity?": {
    TE: "రవాణా సమయంలో ధాన్యం బస్తాలను తేమ నుండి ఎలా కాపాడుకోవాలి?",
    HI: "परिवहन के दौरान नमी से फसल की बोरियों की सुरक्षा कैसे करें?"
  },
  "What are the government bonus rates for Cotton and Maize in AP?": {
    TE: "ఆంధ్రప్రదేశ్‌లో పత్తి మరియు మొక్కజొన్నకు ప్రభుత్వ బోనస్ ధరలు ఎంత?",
    HI: "आंध्र प्रदेश में कपास और मक्का के लिए सरकारी बोनस दरें क्या हैं?"
  },
  "When will my DBT procurement payment be credited?": {
    TE: "నా సేకరణ DBT చెల్లింపు ఎప్పుడు జమ అవుతుంది?",
    HI: "मेरा डीबीटी खरीद भुगतान कब तक जमा होगा?"
  },
  "What is the per-km rate for mini trucks in Andhra Pradesh?": {
    TE: "ఆంధ్రప్రదేశ్‌లో మినీ ట్రక్కుల కిలోమీటరు రేటు ఎంత?",
    HI: "आंध्र प्रदेश में छोटे ट्रकों की प्रति किमी दर क्या है?"
  },
  "How are vehicle driver details assigned?": {
    TE: "రవాణా వాహన డ్రైవర్ వివరాలు ఎలా కేటాయించబడతాయి?",
    HI: "वाहन चालक का विवरण कैसे आवंटित किया जाता है?"
  },
  "What happens after weighbridge measurement?": {
    TE: "వేబ్రిడ్జ్ వద్ద తూకం వేసిన తర్వాత తదుపరి ప్రక్రియ ఏమిటి?",
    HI: "धर्मकांटा पर वजन कराने के बाद क्या प्रक्रिया होती है?"
  },
  "How is paddy quality inspected by the officer?": {
    TE: "అధికారి ద్వారా వరి నాణ్యత ఎలా తనిఖీ చేయబడుతుంది?",
    HI: "अधिकारी द्वारा धान की गुणवत्ता की जांच कैसे की जाती है?"
  },
  "What is the Rythu Bharosa Kendra toll-free number?": {
    TE: "రైతు భరోసా కేంద్రం (RBK) టోల్-ఫ్రీ నంబర్ ఎంత?",
    HI: "रायथू भरोसा केंद्र का टोल-फ्री नंबर क्या है?"
  },
  "How to register a grievance for procurement delay?": {
    TE: "సేకరణ ఆలస్యంపై ఫిర్యాదును ఎలా నమోదు చేయాలి?",
    HI: "खरीद में देरी की शिकायत कैसे दर्ज करें?"
  },
  "What are the latest modal mandi prices for paddy and cotton?": {
    TE: "వరి మరియు పత్తికి సంబంధించి తాజా మండీ మోడల్ ధరలు ఎంత?",
    HI: "धान और कपास के नवीनतम मंडी मॉडल भाव क्या हैं?"
  },
  "Namaste! Welcome to ProcureFlow.": {
    TE: "నమస్కారం! ప్రొక్యూర్ ఫ్లో కి స్వాగతం.",
    HI: "नमस्ते! प्रोक्योरफ्लो में आपका स्वागत है।"
  },
  "What are the Fair Average Quality (FAQ) norms for paddy moisture & foreign matter?": {
    TE: "వరి తేమ మరియు ఇతర పదార్ధాలకు సంబంధించిన నాణ్యతా ప్రమాణాలు (FAQ) ఏమిటి?",
    HI: "धान की नमी और कचरे के लिए उचित औसत गुणवत्ता (FAQ) मानक क्या हैं?"
  },
  "What is the standard procedure for electronic weighbridge tare deduction?": {
    TE: "ఎలక్ట్రానిక్ వేబ్రిడ్జ్ ఖాళీ వాహన తూకం (టేర్) మినహాయింపు ప్రామాణిక పద్ధతి ఏమిటి?",
    HI: "इलेक्ट्रॉनिक धर्मकांटा पर खाली वाहन वजन कटौती की मानक प्रक्रिया क्या है?"
  },
  "How to resolve truck congestion & optimize turnaround time during peak arrivals?": {
    TE: "రద్దీ సమయాల్లో లారీల రద్దీని తగ్గించి, సమయాన్ని ఎలా ఆదా చేయాలి?",
    HI: "पीक आवक के दौरान ट्रकों की भीड़ को कैसे नियंत्रित करें और समय बचाएं?"
  },
  "What documents must be verified before issuing weighbridge token slip?": {
    TE: "వేబ్రిడ్జ్ టోకెన్ స్లిప్ జారీ చేయడానికి ముందు ఏ పత్రాలను ధృవీకరించాలి?",
    HI: "धर्मकांटा टोकन पर्ची जारी करने से पहले किन दस्तावेजों का सत्यापन आवश्यक है?"
  },
  "Dispute resolution protocol when paddy moisture marginally exceeds 17%?": {
    TE: "వరిలో తేమ శాతం 17% కంటే కొద్దిగా మించినప్పుడు వివాద పరిష్కార విధానం ఏమిటి?",
    HI: "धान में नमी 17% से थोड़ी अधिक होने पर विवाद समाधान प्रोटोकॉल क्या है?"
  },
  "Cancellation window expired (available for 30m from booking creation)": {
    TE: "రద్దు గడువు ముగిసింది (బుకింగ్ చేసిన 30 నిమిషాల వరకు మాత్రమే లభిస్తుంది)",
    HI: "रद्दीकरण की समय सीमा समाप्त (बुकिंग के 30 मिनट तक ही उपलब्ध)"
  },

  // Payment Options & Details
  "Bank Direct Transfer (DBT)": { TE: "బ్యాంక్ డైరెక్ట్ ట్రాన్స్‌ఫర్ (DBT)", HI: "बैंक डायरेक्ट ट्रांसफर (डीबीटी)" },
  "Direct credit to Aadhaar-linked Bank A/C ****4821 (Recommended)": {
    TE: "ఆధార్ అనుసంధాన బ్యాంక్ ఖాతా ****4821 కు నేరుగా జమ (సిఫార్సు చేయబడింది)",
    HI: "आधार से जुड़े बैंक खाते ****4821 में सीधे जमा (अनुशंसित)"
  },
  "UPI Direct Payout": { TE: "UPI ప్రత్యక్ష చెల్లింపు", HI: "यूपीआई प्रत्यक्ष भुगतान" },
  "Instant disbursement to registered farmer UPI VPA": {
    TE: "నమోదిత రైతు UPI ఐడీకి తక్షణ చెల్లింపు",
    HI: "पंजीकृत किसान यूपीआई आईडी पर त्वरित भुगतान"
  },
  "Kisan Credit Card / RuPay": { TE: "కిసాన్ క్రెడిట్ కార్డు / RuPay", HI: "किसान क्रेडिट कार्ड / रुपे" },
  "Disbursement to Kisan Credit Card account": {
    TE: "కిసాన్ క్రెడిట్ కార్డు ఖాతాకు నిధుల జమ",
    HI: "किसान क्रेडिट कार्ड खाते में राशि का अंतरण"
  },
  "This disbursement could not be processed. Please retry.": {
    TE: "ఈ చెల్లింపు ప్రాసెస్ చేయబడలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.",
    HI: "यह भुगतान संसाधित नहीं हो सका। कृपया पुनः प्रयास करें।"
  },
  "Retry DBT Settlement Payout": { TE: "DBT చెల్లింపును మళ్ళీ ప్రయత్నించండి", HI: "डीबीटी निपटान भुगतान पुनः प्रयास करें" },
  "Verify & Receive Procurement Payment": { TE: "సేకరణ చెల్లింపును ధృవీకరించి స్వీకరించండి", HI: "खरीद भुगतान सत्यापित करें और प्राप्त करें" },
  "Profile details verified by officer.": { TE: "ప్రొఫైల్ వివరాలు అధికారి ద్వారా ధృవీకరించబడ్డాయి.", HI: "प्रोफ़ाइल विवरण अधिकारी द्वारा सत्यापित किया गया।" },
  "Your booking and status updates will appear here after an authenticated login.": {
    TE: "లాగిన్ అయిన తర్వాత మీ బుకింగ్ మరియు స్టేటస్ అప్‌డేట్‌లు ఇక్కడ కనిపిస్తాయి.",
    HI: "लॉगिन करने के पश्चात आपकी बुकिंग और स्थिति अपडेट यहां दिखाई देंगे।"
  },
  "Payment Received / Amount Credited": { TE: "చెల్లింపు అందింది / మొత్తం జమ అయింది", HI: "भुगतान प्राप्त / राशि जमा" },
  "Estimated Payout / DBT Payable": { TE: "అంచనా చెల్లింపు / చెల్లించవలసిన DBT మొత్తం", HI: "अनुमानित भुगतान / देय डीबीटी" },
  "Settled & Closed": { TE: "పరిష్కరించి ముగించబడింది", HI: "निपटाया गया एवं बंद" },
  "Ready for Payout": { TE: "చెల్లింపుకు సిద్ధంగా ఉంది", HI: "भुगतान के लिए तैयार" },
  "QC Failed": { TE: "నాణ్యత తనిఖీ విఫలమైంది", HI: "गुणवत्ता जांच विफल" },
  "QC Passed": { TE: "నాణ్యత తనిఖీ ఉత్తీర్ణమైంది", HI: "गुणवत्ता जांच उत्तीर्ण" },
  "DBT Paid": { TE: "DBT చెల్లించబడింది", HI: "डीबीटी भुगतान संपन्न" },
  "Gate Entry": { TE: "గేట్ ఎంట్రీ", HI: "गेट प्रवेश" },
  "Super Fine": { TE: "సూపర్ ఫైన్ (అత్యుత్తమ సన్న రకం)", HI: "सुपर फाइन (अति उत्तम)" },
  "FAQ Certified": { TE: "FAQ ధృవీకరించబడింది", HI: "FAQ प्रमाणित" },
  "Grade A Fine (FAQ)": { TE: "గ్రేడ్-A సన్న రకం (FAQ)", HI: "ग्रेड-ए महीन (FAQ)" },
  "Grain sample inspected. Moisture and purity meet FAQ standards.": {
    TE: "ధాన్యం నమూనా తనిఖీ చేయబడింది. తేమ మరియు స్వచ్ఛత FAQ ప్రమాణాలకు అనుగుణంగా ఉన్నాయి.",
    HI: "अनाज के नमूने का निरीक्षण किया गया। नमी और शुद्धता FAQ मानकों के अनुरूप है।"
  },
  "Farmer details unavailable": { TE: "రైతు వివరాలు అందుబాటులో లేవు", HI: "किसान विवरण अनुपलब्ध" },
  "Paddy Grain Bags": { TE: "వరి ధాన్యపు బస్తాలు", HI: "धान की बोरियां" },
  "Paddy Grain Harvest Bags": { TE: "కోత కోసిన వరి ధాన్యపు బస్తాలు", HI: "धान की फसल की बोरियां" },
  "AP Mandi Network": { TE: "AP మండీ నెట్‌వర్క్", HI: "आंध्र मंडी नेटवर्क" },
  "Guntur Rural": { TE: "గుంటూరు రూరల్", HI: "गुंटूर ग्रामीण" },
  "Vinayak Nagar": { TE: "వినాయక్ నగర్", HI: "विनायक नगर" },
  "All Categories": { TE: "అన్ని రకాలు / వర్గాలు", HI: "सभी श्रेणियां" },
  "Routing map view ready.": { TE: "రవాణా రూట్ మ్యాప్ సిద్ధంగా ఉంది.", HI: "रूट मैप तैयार है।" },
  "Helpline: 1800-000-2026": { TE: "హెల్ప్‌లైన్: 1800-000-2026", HI: "हेल्पलाइन: 1800-000-2026" },
  "Just now": { TE: "ఇప్పుడే", HI: "अभी" },
  "NIZAMABAD MARKET YARD": { TE: "నిజామాబాద్ మార్కెట్ యార్డ్", HI: "निज़ामाबाद मंडी यार्ड" },
  "Quality assessment pending": { TE: "నాణ్యతా నిర్ధారణ పెండింగ్‌లో ఉంది", HI: "गुणवत्ता मूल्यांकन लंबित" },
  "Token Active": { TE: "టోకెన్ సక్రియంగా ఉంది", HI: "टोकन सक्रिय" },
  "Mandi Officer": { TE: "మండీ సేకరణ అధికారి", HI: "मंडी अधिकारी" },
  "AP Central": { TE: "ఆంధ్రప్రదేశ్ సెంట్రల్", HI: "आंध्र सेंट्रल" },
  "Guntur Main Mandi": { TE: "గుంటూరు ప్రధాన మండీ", HI: "गुंटूर मुख्य मंडी" },
  "All farmer registrations have been processed.": {
    TE: "అన్ని రైతు నమోదులు ప్రాసెస్ చేయబడ్డాయి.",
    HI: "सभी किसान पंजीकरण संसाधित कर लिए गए हैं।"
  },
  "Centre Arrival": { TE: "కేంద్రానికి రాక", HI: "केंद्र पर आगमन" },

  // History, Logistics & Empty States
  "No history records found matching": { TE: "సరిపోలే రికార్డులు ఏవీ కనుగొనబడలేదు", HI: "कोई मेल खाता इतिहास रिकॉर्ड नहीं मिला" },
  "No Activity Records Found": { TE: "ఎటువంటి కార్యకలాప రికార్డులు కనుగొనబడలేదు", HI: "कोई गतिविधि रिकॉर्ड नहीं मिला" },
  "Try searching with a different term or clear the search filter.": {
    TE: "వేరొక పదంతో వెతకండి లేదా శోధన ఫిల్టర్‌ను క్లియర్ చేయండి.",
    HI: "किसी अन्य शब्द से खोजें या खोज फ़िल्टर को साफ़ करें।"
  },
  "You haven't made any bookings or transport requests yet. Reserve your first government MSP slot today.": {
    TE: "మీరు ఇంకా ఎటువంటి బుకింగ్స్ లేదా రవాణా అభ్యర్థనలు చేయలేదు. మీ మొదటి ప్రభుత్వ మద్దతు ధర స్లాట్‌ను ఈరోజే రిజర్వ్ చేసుకోండి.",
    HI: "आपने अभी तक कोई बुकिंग या परिवहन अनुरोध नहीं किया है। आज ही अपना पहला सरकारी एमएसपी स्लॉट आरक्षित करें।"
  },
  "Assigned Centre": { TE: "కేటాయించిన కొనుగోలు కేంద్రం", HI: "आवंटित केंद्र" },
  "Date scheduled": { TE: "షెడ్యూల్ చేసిన తేదీ", HI: "निर्धारित तिथि" },
  "Token Generated": { TE: "టోకెన్ రూపొందించబడింది", HI: "टोकन जनरेट हुआ" },
  "Mandi Procurement": { TE: "మండీ సేకరణ", HI: "मंडी खरीद" },
  "NEW APPLICANT": { TE: "కొత్త దరఖాస్తుదారు", HI: "नया आवेदक" },
  "Identity mismatch": { TE: "గుర్తింపు వివరాలు సరిపోలలేదు", HI: "पहचान मेल नहीं खाती" },
  "Logistics Officer": { TE: "రవాణా విభాగ అధికారి", HI: "लॉजिस्टिक्स अधिकारी" },
  "Payment Accounts Officer": { TE: "చెల్లింపుల ఖాతా అధికారి", HI: "भुगतान लेखा अधिकारी" },
  "Procurement Officer": { TE: "సేకరణ అధికారి", HI: "खरीद अधिकारी" },
  "Assistant Head Officer": { TE: "సహాయక ప్రధాన అధికారి", HI: "सहायक मुख्य अधिकारी" },
  "Guntur Yard": { TE: "గుంటూరు యార్డ్", HI: "गुंटूर यार्ड" },
  "Grain quality inspection, moisture/foreign matter testing, batch accept/reject grading.": {
    TE: "ధాన్యం నాణ్యత తనిఖీ, తేమ మరియు చెత్త పరీక్ష, లాట్ ఆమోదం లేదా తిరస్కరణ గ్రేడింగ్.",
    HI: "अनाज की गुणवत्ता जांच, नमी/कचरा परीक्षण, लॉट स्वीकृति अथवा अस्वीकृति ग्रेडिंग।"
  },
  "Subsidized transport allocation, vehicle tracking, delivery status updates.": {
    TE: "రాయితీ రవాణా కేటాయింపు, వాహన ట్రాకింగ్, డెలివరీ స్థితి అప్‌డేట్లు.",
    HI: "सब्सिडी परिवहन आवंटन, वाहन ट्रैकिंग, सुपुर्दगी स्थिति अपडेट।"
  },
  "DBT direct settlement authorization, subsidy release, payment auditing.": {
    TE: "DBT ప్రత్యక్ష చెల్లింపు అనుమతి, రాయితీ విడుదల, చెల్లింపుల ఆడిటింగ్.",
    HI: "डीबीटी प्रत्यक्ष निपटान प्राधिकरण, सब्सिडी जारी करना, भुगतान ऑडिटिंग।"
  },
  "Farmer registration verification, queue allotment, mandi procurement operations.": {
    TE: "రైతు నమోదు ధృవీకరణ, క్యూ కేటాయింపు, మండీ సేకరణ కార్యకలాపాలు.",
    HI: "किसान पंजीकरण सत्यापन, कतार आवंटन, मंडी खरीद संचालन।"
  },
  "Ideal for village farm paths": { TE: "గ్రామీణ మట్టి రోడ్లకు అనువైనది", HI: "कच्चे ग्रामीण रास्तों हेतु उपयुक्त" },
  "Fast direct transport": { TE: "వేగవంతమైన ప్రత్యక్ష రవాణా", HI: "त्वरित प्रत्यक्ष परिवहन" },
  "Bulk harvest movement": { TE: "భారీ పంట రవాణా", HI: "थोक फसल परिवहन" },
  "Average Modal Price": { TE: "సగటు మోడల్ ధర", HI: "औसत मॉडल भाव" },
  "AGMARKNET (Ministry of Agriculture & Farmers Welfare, GoI)": {
    TE: "అగ్‌మార్క్‌నెట్ (వ్యవసాయ & రైతు సంక్షేమ మంత్రిత్వ శాఖ, భారత ప్రభుత్వం)",
    HI: "एगमार्कनेट (कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार)"
  },
  "Cabinet Committee on Economic Affairs (CCEA) MSP Notification": {
    TE: "ఆర్థిక వ్యవహారాల క్యాబినెట్ కమిటీ (CCEA) మద్దతు ధర ఉత్తర్వు",
    HI: "आर्थिक मामलों की कैबिनेट समिति (CCEA) एमएसपी अधिसूचना"
  },
  "Kharif & Rabi 2024-25 / 2025-26": { TE: "ఖరీఫ్ & రబీ 2024-25 / 2025-26", HI: "खरीफ एवं रबी 2024-25 / 2025-26" },
  "Kharif Marketing Season 2025-26": { TE: "ఖరీఫ్ మార్కెటింగ్ సీజన్ 2025-26", HI: "खरीफ विपणन सत्र 2025-26" },
  "Fine Paddy — Grade B": { TE: "సన్న వరి — గ్రేడ్-B", HI: "महीन धान — ग्रेड-बी" },

  // Error Messages, Auth & Validations
  "Please login with your approved farmer account to continue.": {
    TE: "కొనసాగడానికి దయచేసి మీ ఆమోదించబడిన రైతు ఖాతాతో లాగిన్ అవ్వండి.",
    HI: "आगे बढ़ने के लिए कृपया अपने स्वीकृत किसान खाते से लॉगिन करें।"
  },
  "Booking data is unavailable.": { TE: "బుకింగ్ డేటా అందుబాటులో లేదు.", HI: "बुकिंग डेटा अनुपलब्ध है।" },
  "Procurement Payout": { TE: "సేకరణ చెల్లింపు", HI: "खरीद भुगतान" },
  "Aadhaar DBT / NEFT": { TE: "ఆధార్ DBT / NEFT బదిలీ", HI: "आधार डीबीटी / एनईएफटी" },
  "Failed to load farmer activity history:": { TE: "రైతు చరిత్రను లోడ్ చేయడం విఫలమైంది:", HI: "किसान गतिविधि इतिहास लोड करने में विफल:" },
  "Failed to submit staff onboarding request.": { TE: "సిబ్బంది చేరిక అభ్యర్థన సమర్పణ విఫలమైంది.", HI: "कर्मचारी नामांकन अनुरोध प्रस्तुत करने में विफल।" },
  "Failed to approve staff member.": { TE: "సిబ్బంది ఆమోదం విఫలమైంది.", HI: "कर्मचारी को स्वीकृत करने में विफल।" },
  "Failed to reject staff member.": { TE: "సిబ్బంది తిరస్కరణ విఫలమైంది.", HI: "कर्मचारी को अस्वीकार करने में विफल।" },
  "Failed to disable staff access.": { TE: "సిబ్బంది యాక్సెస్ నిలిపివేత విఫలమైంది.", HI: "कर्मचारी पहुंच अक्षम करने में विफल।" },
  "Staff member access DISABLED.": { TE: "సిబ్బంది యాక్సెస్ నిష్క్రియం చేయబడింది.", HI: "कर्मचारी पहुंच अक्षम कर दी गई।" },
  "Failed to re-enable staff access.": { TE: "సిబ్బంది యాక్సెస్‌ను తిరిగి ప్రారంభించడం విఫలమైంది.", HI: "कर्मचारी पहुंच पुनः सक्षम करने में विफल।" },
  "No pending registration found.": { TE: "ఎటువంటి పెండింగ్ నమోదులు కనుగొనబడలేదు.", HI: "कोई लंबित पंजीकरण नहीं मिला।" },
  "Approval could not be completed on server.": { TE: "సర్వర్‌లో ఆమోదం పూర్తి కాలేదు.", HI: "सर्वर पर स्वीकृति पूर्ण नहीं हो सकी।" },
  "No pending registration selected.": { TE: "ఏ పెండింగ్ నమోదు ఎంపిక కాలేదు.", HI: "कोई लंबित पंजीकरण चयनित नहीं है।" },
  "Rejection failed on server.": { TE: "సర్వర్‌లో తిరస్కరణ విఫలమైంది.", HI: "सर्वर पर अस्वीकृति विफल रही।" },
  "Could not submit quality inspection.": { TE: "నాణ్యత తనిఖీని సమర్పించలేకపోయాము.", HI: "गुणवत्ता निरीक्षण प्रस्तुत नहीं किया जा सका।" },
  "Could not update logistics status.": { TE: "రవాణా స్థితిని నవీకరించలేకపోయాము.", HI: "लॉजिस्टिक्स स्थिति अपडेट नहीं की जा सकी।" },
  "Failed to disburse payment.": { TE: "చెల్లింపు విడుదల చేయడం విఫలమైంది.", HI: "भुगतान संवितरण विफल रहा।" },
  "Failed to initiate payment.": { TE: "చెల్లింపు ప్రారంభించడం విఫలమైంది.", HI: "भुगतान आरंभ करने में विफल।" },
  "Could not update procurement stage.": { TE: "సేకరణ దశను నవీకరించలేకపోయాము.", HI: "खरीद चरण अपडेट नहीं किया जा सका।" },
  "Please enter a valid 10-digit Indian mobile number.": {
    TE: "దయచేసి సరైన 10 అంకెల భారతీయ మొబైల్ నంబర్‌ను నమోదు చేయండి.",
    HI: "कृपया वैध 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।"
  },
  "Please enter your full name (at least 2 characters).": {
    TE: "దయచేసి మీ పూర్తి పేరును నమోదు చేయండి (కనీసం 2 అక్షరాలు).",
    HI: "कृपया अपना पूरा नाम दर्ज करें (कम से कम 2 अक्षर)।"
  },
  "Password must be at least 8 characters long.": {
    TE: "పాస్‌వర్డ్ కనీసం 8 అక్షరాల పొడవు ఉండాలి.",
    HI: "पासवर्ड कम से कम 8 वर्णों का होना चाहिए।"
  },
  "Passwords do not match. Please re-enter matching passwords.": {
    TE: "పాస్‌వర్డ్‌లు సరిపోలడం లేదు. దయచేసి సరైన పాస్‌వర్డ్‌ను మళ్లీ నమోదు చేయండి.",
    HI: "पासवर्ड मेल नहीं खा रहे हैं। कृपया समान पासवर्ड पुनः दर्ज करें।"
  },
  "Please enter your village and district.": {
    TE: "దయచేసి మీ గ్రామం మరియు జిల్లాను నమోదు చేయండి.",
    HI: "कृपया अपना गांव और जिला दर्ज करें।"
  },
  "Registration submitted! Your account is PENDING officer review.": {
    TE: "నమోదు సమర్పించబడింది! మీ ఖాతా అధికారి సమీక్ష కోసం వేచి ఉంది.",
    HI: "पंजीकरण प्रस्तुत! आपका खाता अधिकारी समीक्षा हेतु लंबित है।"
  },
  "Please enter your registered 10-digit mobile number.": {
    TE: "దయచేసి మీ నమోదిత 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి.",
    HI: "कृपया अपना पंजीकृत 10 अंकों का मोबाइल नंबर दर्ज करें।"
  },
  "Please enter the last 4 digits of your registered Aadhaar.": {
    TE: "దయచేసి మీ నమోదిత ఆధార్ నంబర్ చివరి 4 అంకెలను నమోదు చేయండి.",
    HI: "कृपया अपने पंजीकृत आधार के अंतिम 4 अंक दर्ज करें।"
  },
  "Please enter your registered village name.": {
    TE: "దయచేసి మీ నమోదిత గ్రామం పేరును నమోదు చేయండి.",
    HI: "कृपया अपने पंजीकृत गांव का नाम दर्ज करें।"
  },
  "Please enter your registered Farmer Code (e.g. FARM-2026-9482).": {
    TE: "దయచేసి మీ నమోదిత రైతు కోడ్‌ను నమోదు చేయండి (ఉదా: FARM-2026-9482).",
    HI: "कृपया अपना पंजीकृत किसान कोड दर्ज करें (जैसे FARM-2026-9482)।"
  },
  "Verification session expired. Please verify your identity again.": {
    TE: "ధృవీకరణ సమయం ముగిసింది. దయచేసి మీ గుర్తింపును మళ్లీ ధృవీకరించుకోండి.",
    HI: "सत्यापन सत्र समाप्त हो गया। कृपया अपनी पहचान पुनः सत्यापित करें।"
  },
  "New password must be at least 8 characters long.": {
    TE: "కొత్త పాస్‌వర్డ్ కనీసం 8 అక్షరాలు ఉండాలి.",
    HI: "नया पासवर्ड कम से कम 8 वर्णों का होना चाहिए।"
  },
  "Password reset failed.": { TE: "పాస్‌వర్డ్ రీసెట్ విఫలమైంది.", HI: "पासवर्ड रीसेट विफल रहा।" },
  "Please enter your Officer / Login ID.": { TE: "దయచేసి మీ అధికారి / లాగిన్ ID ని నమోదు చేయండి.", HI: "कृपया अपनी अधिकारी / लॉगिन आईडी दर्ज करें।" },
  "Please enter your registered Email ID or Mobile number.": {
    TE: "దయచేసి మీ నమోదిత ఈమెయిల్ లేదా మొబైల్ నంబర్‌ను నమోదు చేయండి.",
    HI: "कृपया अपना पंजीकृत ईमेल अथवा मोबाइल नंबर दर्ज करें।"
  },
  "Failed to submit reset request.": { TE: "రీసెట్ అభ్యర్థన సమర్పణ విఫలమైంది.", HI: "रीसेट अनुरोध प्रस्तुत करने में विफल।" },
  "Reset request submitted. Pending Head Officer approval.": {
    TE: "రీసెట్ అభ్యర్థన సమర్పించబడింది. ప్రధాన అధికారి ఆమోదం కోసం వేచి ఉంది.",
    HI: "रीसेट अनुरोध प्रस्तुत किया गया। मुख्य अधिकारी की स्वीकृति लंबित है।"
  },
  "Please enter your Officer Code.": { TE: "దయచేసి మీ అధికారి కోడ్‌ను నమోదు చేయండి.", HI: "कृपया अपना अधिकारी कोड दर्ज करें।" },
  "Please enter the 24-hour Approval Token provided by your Head Officer.": {
    TE: "దయచేసి మీ ప్రధాన అధికారి అందించిన 24 గంటల ఆమోద టోకెన్‌ను నమోదు చేయండి.",
    HI: "कृपया अपने मुख्य अधिकारी द्वारा प्रदान किया गया 24 घंटे का स्वीकृति टोकन दर्ज करें।"
  },
  "Password must include at least one uppercase letter, one lowercase letter, and one number.": {
    TE: "పాస్‌వర్డ్‌లో కనీసం ఒక పెద్ద అక్షరం, ఒక చిన్న అక్షరం మరియు ఒక సంఖ్య ఉండాలి.",
    HI: "पासवर्ड में कम से कम एक बड़ा अक्षर, एक छोटा अक्षर और एक संख्या होनी चाहिए।"
  },
  "Failed to approve password reset.": { TE: "పాస్‌వర్డ్ రీసెట్ ఆమోదం విఫలమైంది.", HI: "पासवर्ड रीसेट स्वीकृत करने में विफल।" },
  "Staff Member": { TE: "శాఖ సిబ్బంది", HI: "विभागीय कर्मचारी" },
  "Identity or department mismatch": { TE: "గుర్తింపు లేదా శాఖ వివరాలు సరిపోలలేదు", HI: "पहचान या विभाग मेल नहीं खाता" },
  "Failed to reject password reset.": { TE: "పాస్‌వర్డ్ రీసెట్ తిరస్కరణ విఫలమైంది.", HI: "पासवर्ड रीसेट अस्वीकार करने में विफल।" },
  "Your registration requires officer approval before login.": {
    TE: "లాగిన్ కావడానికి ముందు మీ నమోదును అధికారి ఆమోదించాలి.",
    HI: "लॉगिन करने से पहले आपके पंजीकरण को अधिकारी द्वारा स्वीकृत किया जाना आवश्यक है।"
  },
  "Login failed. Please check your credentials.": {
    TE: "లాగిన్ విఫలమైంది. దయచేసి మీ వివరాలను తనిఖీ చేయండి.",
    HI: "लॉगिन विफल। कृपया अपने क्रेडेंशियल जांचें।"
  },
  "Officer login failed.": { TE: "అధికారి లాగిన్ విఫలమైంది.", HI: "अधिकारी लॉगिन विफल रहा।" },
  "Net Banking": { TE: "నెట్ బ్యాంకింగ్", HI: "नेट बैंकिंग" },
  "Payment could not be started.": { TE: "చెల్లింపు ప్రారంభం కాలేదు.", HI: "भुगतान आरंभ नहीं हो सका।" },
  "Payment processing could not begin.": { TE: "చెల్లింపు ప్రాసెసింగ్ ప్రారంభం కాలేదు.", HI: "भुगतान प्रक्रिया शुरू नहीं हो सकी।" },
  "Secure payment checkout could not load. Please try again.": {
    TE: "సురక్షిత చెల్లింపు చెక్‌అవుట్ లోడ్ కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.",
    HI: "सुरक्षित भुगतान चेकआउट लोड नहीं हो सका। कृपया पुनः प्रयास करें।"
  },
  "Payment was cancelled before confirmation.": {
    TE: "ధృవీకరణకు ముందే చెల్లింపు రద్దు చేయబడింది.",
    HI: "पुष्टि से पहले भुगतान रद्द कर दिया गया।"
  },
  "Payment verification failed.": { TE: "చెల్లింపు ధృవీకరణ విఫలమైంది.", HI: "भुगतान सत्यापन विफल रहा।" },
  "The selected provider did not authorise this payment attempt.": {
    TE: "ఎంచుకున్న బ్యాంక్/గేట్‌వే ఈ చెల్లింపు ప్రయత్నాన్ని అనుమతించలేదు.",
    HI: "चयनित प्रदाता ने इस भुगतान प्रयास को अधिकृत नहीं किया।"
  },
  "Payment could not be completed.": { TE: "చెల్లింపు పూర్తి కాలేదు.", HI: "भुगतान पूर्ण नहीं हो सका।" },
  "Payment failed. Please try another method.": {
    TE: "చెల్లింపు విఫలమైంది. దయచేసి వేరొక పద్ధతిని ప్రయత్నించండి.",
    HI: "भुगतान विफल रहा। कृपया किसी अन्य विधि से प्रयास करें।"
  },
  "AI assistant is busy. Please wait a few seconds and try again.": {
    TE: "AI అసిస్టెంట్ రద్దీగా ఉంది. దయచేసి కొన్ని సెకన్లు ఆగి మళ్ళీ ప్రయత్నించండి.",
    HI: "एआई सहायक व्यस्त है। कृपया कुछ सेकंड प्रतीक्षा करें और पुनः प्रयास करें।"
  },
  "Rate limit reached. Please wait a moment before sending another query.": {
    TE: "ప్రశ్నల పరిమితి ముగిసింది. దయచేసి కాసేపు ఆగి మళ్ళీ ప్రశ్న అడగండి.",
    HI: "दर सीमा समाप्त। कृपया अगला प्रश्न पूछने से पहले थोड़ा इंतजार करें।"
  },
  "Request took longer than expected. Retrying or switching to offline guidance.": {
    TE: "అభ్యర్థనకు సమయం పట్టింది. తిరిగి ప్రయత్నిస్తున్నాము లేదా ఆఫ్‌లైన్ మార్గదర్శకానికి మారుతున్నాము.",
    HI: "अनुरोध में अपेक्षा से अधिक समय लगा। पुनः प्रयास या ऑफ़लाइन मार्गदर्शन पर स्विच किया जा रहा है।"
  },
  "Gemini service temporarily unreachable. No fabricated visual diagnosis provided.": {
    TE: "జెమినీ సర్వీస్ తాత్కాలికంగా స్పందించడం లేదు. తప్పుడు సమాచారం అందించబడదు.",
    HI: "जेमिनी सेवा अस्थायी रूप से अनुपलब्ध है। कोई असत्यापित दृश्य निदान प्रदान नहीं किया गया।"
  },
  "Officer AI Copilot is busy. Please wait a few seconds and try again.": {
    TE: "అధికారి AI కోపైలట్ రద్దీగా ఉంది. దయచేసి కొన్ని సెకన్లు వేచి ఉండండి.",
    HI: "अधिकारी एआई कोपायलट व्यस्त है। कृपया कुछ सेकंड प्रतीक्षा करें।"
  },
  "Voice response is not available in this browser. You can read the answer on screen.": {
    TE: "ఈ బ్రౌజర్‌లో వాయిస్ సమాధానం లభించదు. మీరు తెరపై సమాధానాన్ని చదువుకోవచ్చు.",
    HI: "इस ब्राउज़र में वॉयस प्रतिक्रिया उपलब्ध नहीं है। आप स्क्रीन पर उत्तर पढ़ सकते हैं।"
  },
  "Choose paddy, centre, date, and time from available capacity.": {
    TE: "లభ్యమైన స్లాట్ల నుండి వరి రకం, కేంద్రం, తేదీ మరియు సమయాన్ని ఎంచుకోండి.",
    HI: "उपलब्ध क्षमता से धान, केंद्र, तिथि और समय का चयन करें।"
  },
  "Verify your registered mobile number and identity details to reset your password.": {
    TE: "పాస్‌వర్డ్‌ను రీసెట్ చేయడానికి మీ నమోదిత మొబైల్ నంబర్ మరియు గుర్తింపు వివరాలను ధృవీకరించండి.",
    HI: "पासवर्ड रीसेट करने हेतु अपना पंजीकृत मोबाइल नंबर और पहचान विवरण सत्यापित करें।"
  },
  "Set your new account password below.": { TE: "దిగువన మీ కొత్త ఖాతా పాస్‌వర్డ్‌ను సెట్ చేయండి.", HI: "नीचे अपना नया खाता पासवर्ड सेट करें।" },
  "Your password has been successfully updated.": { TE: "మీ పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది.", HI: "आपका पासवर्ड सफलतापूर्वक अपडेट हो गया है।" },
  "Aadhaar number (last 4 digits)": { TE: "ఆధార్ నంబర్ (చివరి 4 అంకెలు)", HI: "आधार संख्या (अंतिम 4 अंक)" },
  "Registered village name": { TE: "నమోదిత గ్రామం పేరు", HI: "पंजीकृत गांव का नाम" },
  "Farmer Code (e.g. FARM-2026-9482)": { TE: "రైతు కోడ్ (ఉదా: FARM-2026-9482)", HI: "किसान कोड (जैसे FARM-2026-9482)" },
  "Your registration is approved. You can login.": { TE: "మీ నమోదు ఆమోదించబడింది. మీరు లాగిన్ కావచ్చు.", HI: "आपका पंजीकरण स्वीकृत हो गया है। आप लॉगिन कर सकते हैं।" },
  "Registration must be approved by an officer.": { TE: "నమోదును తప్పనిసరిగా అధికారి ఆమోదించాలి.", HI: "पंजीकरण को अधिकारी द्वारा अनुमोदित किया जाना चाहिए।" },
  "Sunny & Clear": { TE: "ఎండ మరియు నిర్మలమైన ఆకాశం", HI: "धूप एवं साफ मौसम" },
  "Low rain risk": { TE: "తక్కువ వర్ష ముప్పు", HI: "कम बारिश का जोखिम" },
  "Day After": { TE: "ఎల్లుండి", HI: "परसों" },
  "In 3 Days": { TE: "3 రోజుల్లో", HI: "3 दिनों में" },
};

module.exports = { EXHAUSTIVE_PLATFORM_STRINGS };

