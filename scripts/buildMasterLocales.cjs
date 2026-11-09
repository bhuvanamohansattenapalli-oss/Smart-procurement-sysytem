const fs = require('fs');
const path = require('path');

// 1. Base translations for all 298 newly identified strings
const NEW_TRANSLATIONS = {
  // Agricultural Progress & Statuses
  "· Direct Aadhaar DBT Payout Queued for Crediting": {
    TE: "· ఆధార్ DBT ద్వారా ఖాతాలో జమ చేయడానికి క్యూలో ఉంది",
    HI: "· आधार डीबीटी द्वारा खाते में जमा करने हेतु कतारबद्ध"
  },
  "· Direct DBT Bank Credit": {
    TE: "· నేరుగా బ్యాంకు ఖాతాలో DBT జమ",
    HI: "· सीधे बैंक खाते में डीबीटी भुगतान"
  },
  "· Linked Bank A/C (Aadhaar DBT Enabled upon Officer Initiation)": {
    TE: "· అనుసంధానించబడిన బ్యాంకు ఖాతా (అధికారి చర్య ద్వారా ఆధార్ DBT ప్రారంభం)",
    HI: "· लिंक किया गया बैंक खाता (अधिकारी द्वारा आधार डीबीटी सक्रिय)"
  },
  "· Ref:": {
    TE: "· సూచన నం:",
    HI: "· संदर्भ संख्या:"
  },
  ". The farmer will be notified.": {
    TE: ". రైతుకు సమాచారం పంపబడుతుంది.",
    HI: "। किसान को सूचित किया जाएगा।"
  },
  "☁️ Cotton": {
    TE: "☁️ ప్రత్తి / పత్తి",
    HI: "☁️ कपास"
  },
  "🌶️ Chilli Red": {
    TE: "🌶️ ఎండు మిరప",
    HI: "🌶️ लाल मिर्च"
  },
  "🌽 Maize": {
    TE: "🌽 మొక్కజొన్న",
    HI: "🌽 मक्का"
  },
  "🌾 Paddy": {
    TE: "🌾 వరి / ధాన్యం",
    HI: "🌾 धान"
  },
  "🧆 Bengal Gram": {
    TE: "🧆 శనగలు",
    HI: "🧆 चना"
  },
  "1. Booked": {
    TE: "1. బుక్ చేయబడింది",
    HI: "1. बुक किया गया"
  },
  "pending": {
    TE: "పెండింగ్‌లో ఉంది",
    HI: "लंबित"
  },
  "Showing results for": {
    TE: "ఫలితాలు చూపబడుతున్నాయి:",
    HI: "के परिणाम दिखाए जा रहे हैं:"
  },
  "crop": {
    TE: "పంట",
    HI: "फसल"
  },
  "crops": {
    TE: "పంటలు",
    HI: "फसलें"
  },
  "found": {
    TE: "కనుగొనబడ్డాయి",
    HI: "मिले"
  },
  "Clear filter": {
    TE: "ఫిల్టర్‌ను క్లియర్ చేయండి",
    HI: "फ़िल्टर हटाएं"
  },
  "centre": {
    TE: "కేంద్రం",
    HI: "केंद्र"
  },
  "centres": {
    TE: "కేంద్రాలు",
    HI: "केंद्र"
  },
  "Today's Weather": {
    TE: "నేటి వాతావరణం",
    HI: "आज का मौसम"
  },
  "Ask in English, Telugu, or Hindi (e.g. 'What is the paddy MSP today?')": {
    TE: "ఇంగ్లీష్, తెలుగు లేదా హిందీలో అడగండి (ఉదా: 'ఈరోజు వరి MSP ఎంత?')",
    HI: "अंग्रेजी, तेलुगु या हिंदी में पूछें (उदा. 'आज धान का एमएसपी क्या है?')"
  },
  "Full Width": {
    TE: "పూర్తి వెడల్పు",
    HI: "पूर्ण चौड़ाई"
  },
  "Phone Frame": {
    TE: "ఫోన్ ఫ్రేమ్",
    HI: "फ़ोन फ्रेम"
  },
  "AVAILABLE": {
    TE: "లభ్యంగా ఉంది",
    HI: "उपलब्ध"
  },
  "DEPARTMENT": {
    TE: "శాఖ",
    HI: "विभाग"
  },
  "FULL": {
    TE: "నిండినది",
    HI: "पूर्ण"
  },
  "PROCESSING": {
    TE: "ప్రక్రియలో ఉంది",
    HI: "प्रक्रियाधीन"
  },
  "Showing results for \"": {
    TE: "ఫలితాలు చూపబడుతున్నాయి: \"",
    HI: "के परिणाम दिखाए जा रहे हैं: \""
  },
  "Page 1": {
    TE: "పేజీ 1",
    HI: "पृष्ठ 1"
  },
  "Page 2": {
    TE: "పేజీ 2",
    HI: "पृष्ठ 2"
  },
  "Navigation": {
    TE: "నావిగేషన్",
    HI: "नेविगेशन"
  },
  "Sign in to continue": {
    TE: "కొనసాగడానికి సైన్ ఇన్ చేయండి",
    HI: "जारी रखने के लिए साइन इन करें"
  },
  "Access to this dashboard requires authentication. Continue to launch the login flow.": {
    TE: "ఈ డాష్‌బోర్డ్ యాక్సెస్ చేయడానికి లాగిన్ అవసరం. లాగిన్ చేయడానికి కొనసాగండి.",
    HI: "इस डैशबोर्ड तक पहुंचने के लिए प्रमाणीकरण की आवश्यकता है। लॉगिन शुरू करने के लिए आगे बढ़ें।"
  },
  "Sign in": {
    TE: "సైన్ ఇన్",
    HI: "साइन इन करें"
  },
  "Sign out": {
    TE: "సైన్ అవుట్",
    HI: "साइन आउट"
  },
  "Menu": {
    TE: "మెనూ",
    HI: "मेनू"
  },
  "Page Not Found": {
    TE: "పేజీ కనుగొనబడలేదు",
    HI: "पृष्ठ नहीं मिला"
  },
  "Sorry, the page you are looking for doesn't exist.": {
    TE: "క్షమించండి, మీరు వెతుకుతున్న పేజీ అందుబాటులో లేదు.",
    HI: "क्षमा करें, आप जिस पृष्ठ की तलाश कर रहे हैं वह मौजूद नहीं है।"
  },
  "It may have been moved or deleted.": {
    TE: "ఇది తరలించబడి ఉండవచ్చు లేదా తొలగించబడి ఉండవచ్చు.",
    HI: "इसे स्थानांतरित या हटाया जा सकता है।"
  },
  "Go Home": {
    TE: "హోమ్‌కు వెళ్లండి",
    HI: "होम पर जाएं"
  },
  "An unexpected error occurred.": {
    TE: "అనుకోని లోపం సంభవించింది.",
    HI: "एक अप्रत्याशित त्रुटि हुई।"
  },
  "Reload Page": {
    TE: "పేజీని రీలోడ్ చేయండి",
    HI: "पृष्ठ पुनः लोड करें"
  },
  "2. Driver Assigned": {
    TE: "2. డ్రైవర్ కేటాయించబడ్డారు",
    HI: "2. चालक आवंटित"
  },
  "3. In Transit": {
    TE: "3. మార్గంలో ఉంది",
    HI: "3. रास्ते में है"
  },
  "4. Mandi Arrival": {
    TE: "4. మార్కెట్‌కు చేరింది",
    HI: "4. मंडी आगमन"
  },
  "100% credited via direct bank transfer (DBT).": {
    TE: "100% మొత్తం నేరుగా బ్యాంకు బదిలీ (DBT) ద్వారా జమ చేయబడింది.",
    HI: "100% राशि प्रत्यक्ष बैंक अंतरण (डीबीटी) द्वारा अंतरित की गई।"
  },
  "1st Session": {
    TE: "మొదటి విడత",
    HI: "पहला सत्र"
  },
  "2d": {
    TE: "2 రోజులు",
    HI: "2 दिन"
  },
  "Aadhaar (Masked):": {
    TE: "ఆధార్ (మాస్క్ చేసినది):",
    HI: "आधार (सुरक्षित):"
  },
  "Account Status:": {
    TE: "ఖాతా స్థితి:",
    HI: "खाता स्थिति:"
  },
  "Action failed.": {
    TE: "చర్య విఫలమైంది.",
    HI: "कार्रवाई विफल रही।"
  },
  "Active queue": {
    TE: "ప్రస్తుత క్యూ",
    HI: "सक्रिय कतार"
  },
  "Active Staff Network": {
    TE: "సక్రియ సిబ్బంది నెట్‌వర్క్",
    HI: "सक्रिय कर्मचारी नेटवर्क"
  },
  "AI Help Centre": {
    TE: "AI సహాయ కేంద్రం",
    HI: "एआई सहायता केंद्र"
  },
  "AI Officer Copilot": {
    TE: "AI అధికారి కోపైలట్",
    HI: "एआई अधिकारी कोपायलट"
  },
  "AI OFFICER COPILOT · OPERATIONAL ADVISORY SUITE": {
    TE: "AI అధికారి కోపైలట్ · కార్యాచరణ సలహా విభాగం",
    HI: "एआई अधिकारी कोपायलट · संचालन परामर्श सूट"
  },
  "All Activity": {
    TE: "అన్ని కార్యకలాపాలు",
    HI: "सभी गतिविधियां"
  },
  "Amount received": {
    TE: "అందుకున్న మొత్తం",
    HI: "प्राप्त राशि"
  },
  "ANDHRA PRADESH & TELANGANA AGRICULTURAL METEOROLOGY": {
    TE: "ఆంధ్రప్రదేశ్ & తెలంగాణ వ్యవసాయ వాతావరణ విభాగం",
    HI: "आंध्र प्रदेश एवं तेलंगाना कृषि मौसम विज्ञान"
  },
  "Andhra Pradesh centre availability refreshed from the API.": {
    TE: "ఆంధ్రప్రదేశ్ సేకరణ కేంద్రాల లభ్యత API నుండి నవీకరించబడింది.",
    HI: "आंध्र प्रदेश खरीद केंद्रों की उपलब्धता एपीआई से अपडेट की गई।"
  },
  "Andhra Pradesh Districts": {
    TE: "ఆంధ్రప్రదేశ్ జిల్లాలు",
    HI: "आंध्र प्रदेश के जिले"
  },
  "Approval could not be completed.": {
    TE: "ఆమోదం పూర్తి కాలేదు.",
    HI: "स्वीकृति पूरी नहीं हो सकी।"
  },
  "Approval failed.": {
    TE: "ఆమోదం విఫలమైంది.",
    HI: "स्वीकृति विफल रही।"
  },
  "Approval token copied to clipboard!": {
    TE: "ఆమోద టోకెన్ క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!",
    HI: "स्वीकृति टोकन क्लिपबोर्ड पर कॉपी हो गया!"
  },
  "Ask in English, Telugu, or Hindi (e.g.": {
    TE: "ఇంగ్లీష్, తెలుగు లేదా హిందీలో అడగండి (ఉదా.",
    HI: "अंग्रेजी, तेलुगु या हिन्दी में पूछें (उदा."
  },
  "Ask something about this image... (or click send)": {
    TE: "ఈ చిత్రం గురించి ఏదైనా అడగండి... (లేదా పంపండి క్లిక్ చేయండి)",
    HI: "इस तस्वीर के बारे में कुछ पूछें... (या भेजें पर क्लिक करें)"
  },
  "Assigned Departments": {
    TE: "కేటాయించిన విభాగాలు",
    HI: "आवंटित विभाग"
  },
  "Attached preview": {
    TE: "జతచేసిన ప్రివ్యూ",
    HI: "संलग्न पूर्वावलोकन"
  },
  "Audit Events Logged": {
    TE: "నమోదైన ఆడిట్ ఈవెంట్‌లు",
    HI: "दर्ज ऑडिट विवरण"
  },
  "Audit Trail & Logs": {
    TE: "ఆడిట్ రికార్డులు & లాగ్‌లు",
    HI: "ऑडिट रिकॉर्ड और लॉग"
  },
  "Awaiting Grade": {
    TE: "నాణ్యత గ్రేడ్ నిర్ణయం కోసం వేచి ఉంది",
    HI: "गुणवत्ता ग्रेड की प्रतीक्षा"
  },
  "Bank network is confirming the DBT transfer. Do not close this screen.": {
    TE: "బ్యాంకు నెట్‌వర్క్ DBT బదిలీని నిర్ధారిస్తోంది. దయచేసి ఈ స్క్రీన్‌ను మూసివేయవద్దు.",
    HI: "बैंक नेटवर्क डीबीटी अंतरण की पुष्टि कर रहा है। कृपया इस स्क्रीन को बंद न करें।"
  },
  "Base MSP Value:": {
    TE: "ప్రాథమిక మద్దతు ధర (MSP) విలువ:",
    HI: "मूल एमएसपी मूल्य:"
  },
  "Book another slot": {
    TE: "మరొక స్లాట్ బుక్ చేయండి",
    HI: "एक और स्लॉट बुक करें"
  },
  "Book New Slot": {
    TE: "కొత్త స్లాట్ బుక్ చేయండి",
    HI: "नया स्लॉट बुक करें"
  },
  "Book Subsidized Vehicle for Today": {
    TE: "ఈ రోజు కోసం సబ్సిడీ రవాణా వాహనాన్ని బుక్ చేయండి",
    HI: "आज के लिए सब्सिडीयुक्त वाहन बुक करें"
  },
  "Booking confirmed and real API token generated.": {
    TE: "బుకింగ్ నిర్ధారించబడింది మరియు డిజిటల్ టోకెన్ జారీ చేయబడింది.",
    HI: "बुकिंग की पुष्टि हो गई और डिजिटल टोकन जारी किया गया।"
  },
  "Booking could not be confirmed.": {
    TE: "బుకింగ్ నిర్ధారించడం సాధ్యం కాలేదు.",
    HI: "बुकिंग की पुष्टि नहीं की जा सकी।"
  },
  "Booking Requested": {
    TE: "బుకింగ్ అభ్యర్థించబడింది",
    HI: "बुकिंग का अनुरोध किया गया"
  },
  "Bookings & queue": {
    TE: "బుకింగ్‌లు & క్యూ నిర్వహణ",
    HI: "बुकिंग और कतार"
  },
  "BOOKINGS & QUEUE MANAGEMENT": {
    TE: "బుకింగ్‌లు & క్యూ నిర్వహణ",
    HI: "बुकिंग एवं कतार प्रबंधन"
  },
  "Bookings today": {
    TE: "నేటి బుకింగ్‌లు",
    HI: "आज की बुकिंग"
  },
  "BRANCH CENTRE": {
    TE: "బ్రాంచ్ సేకరణ కేంద్రం",
    HI: "शाखा खरीद केंद्र"
  },
  "Camera is not ready yet. Please wait a moment.": {
    TE: "కెమెరా ఇంకా సిద్ధంగా లేదు. దయచేసి ఒక క్షణం వేచి ఉండండి.",
    HI: "कैमरा अभी तैयार नहीं है। कृपया कुछ क्षण प्रतीक्षा करें।"
  },
  "Cancellation failed.": {
    TE: "రద్దు చేయడం విఫలమైంది.",
    HI: "रद्दीकरण विफल रहा।"
  },
  "Cancelled": {
    TE: "రద్దు చేయబడింది",
    HI: "रद्द किया गया"
  },
  "Centre availability is unavailable.": {
    TE: "కేంద్రం లభ్యత సమాచారం అందుబాటులో లేదు.",
    HI: "केंद्र की उपलब्धता अनुपलब्ध है।"
  },
  "Chat history cleared.": {
    TE: "చాట్ చరిత్ర తొలగించబడింది.",
    HI: "चैट इतिहास साफ किया गया।"
  },
  "Check approval & sign in": {
    TE: "ఆమోదం తనిఖీ చేసి సైన్ ఇన్ అవ్వండి",
    HI: "स्वीकृति जांचें और लॉगिन करें"
  },
  "Check My Token": {
    TE: "నా టోకెన్ వివరాలు చూడండి",
    HI: "मेरा टोकन देखें"
  },
  "CHOOSE ANDHRA PRADESH PROCUREMENT CENTRE": {
    TE: "ఆంధ్రప్రదేశ్ ధాన్యం సేకరణ కేంద్రాన్ని ఎంచుకోండి",
    HI: "आंध्र प्रदेश खरीद केंद्र चुनें"
  },
  "Common Paddy": {
    TE: "సాధారణ వరి",
    HI: "सामान्य धान"
  },
  "Completed procurement": {
    TE: "పూర్తయిన సేకరణ",
    HI: "पूर्ण खरीद"
  },
  "Completed procurements": {
    TE: "పూర్తయిన ధాన్యం సేకరణలు",
    HI: "पूर्ण की गई खरीद"
  },
  "CONTACT PHONE": {
    TE: "సంప్రదింపు ఫోన్ నంబర్",
    HI: "संपर्क फोन नंबर"
  },
  "Could not hear speech clearly. Please try again or type your question.": {
    TE: "మాట స్పష్టంగా వినిపించలేదు. దయచేసి మళ్లీ ప్రయత్నించండి లేదా మీ ప్రశ్నను టైప్ చేయండి.",
    HI: "आवाज स्पष्ट सुनाई नहीं दी। कृपया पुनः प्रयास करें या अपना प्रश्न टाइप करें।"
  },
  "Could not process the selected image. Please try another photo.": {
    TE: "ఎంచుకున్న చిత్రాన్ని ప్రాసెస్ చేయడం సాధ్యం కాలేదు. దయచేసి మరొక ఫోటో ఎంచుకోండి.",
    HI: "चुनी गई तस्वीर को संसाधित नहीं किया जा सका। कृपया कोई अन्य फोटो चुनें।"
  },
  "Could not start speech recognition.": {
    TE: "వాయిస్ గుర్తింపును ప్రారంభించడం సాధ్యం కాలేదు.",
    HI: "आवाज पहचान शुरू नहीं की जा सकी।"
  },
  "Credited to Farmer:": {
    TE: "రైతు ఖాతాలో జమ చేసిన మొత్తం:",
    HI: "किसान के खाते में जमा राशि:"
  },
  "CROP TRANSPORTATION & LOGISTICS": {
    TE: "పంట రవాణా & లాజిస్టిక్స్",
    HI: "फसल परिवहन एवं रसद"
  },
  "Current Paddy MSP": {
    TE: "ప్రస్తుత వరి కనీస మద్దతు ధర (MSP)",
    HI: "वर्तमान धान एमएसपी"
  },
  "Current position": {
    TE: "ప్రస్తుత స్థానం",
    HI: "वर्तमान स्थान"
  },
  "DBT Payments": {
    TE: "DBT చెల్లింపులు",
    HI: "डीबीटी भुगतान"
  },
  "DBT Payout Settled": {
    TE: "DBT చెల్లింపు పూర్తయింది",
    HI: "डीबीटी भुगतान निपटारा पूर्ण"
  },
  "Delivered / Awaiting QC": {
    TE: "చేరింది / నాణ్యత తనిఖీ కోసం వేచి ఉంది",
    HI: "पहुंच गया / गुणवत्ता जांच प्रतीक्षारत"
  },
  "DIGITAL KRISHI HELP CENTRE · 24x7 AGRI ADVISORY": {
    TE: "డిజిటల్ కృషి సహాయ కేంద్రం · 24x7 వ్యవసాయ సలహా",
    HI: "डिजिटल कृषि सहायता केंद्र · 24x7 कृषि परामर्श"
  },
  "DIRECT BENEFIT TRANSFER (DBT) · CROP SETTLEMENT": {
    TE: "ప్రత్యక్ష నగదు బదిలీ (DBT) · పంట చెల్లింపు పరిష్కారం",
    HI: "प्रत्यक्ष लाभ अंतरण (डीबीटी) · फसल भुगतान निपटान"
  },
  "Disabled / Inactive": {
    TE: "నిష్క్రియం చేయబడింది / సక్రియంగా లేదు",
    HI: "निष्क्रिय / बंद"
  },
  "Disbursed amount": {
    TE: "విడుదల చేసిన మొత్తం",
    HI: "संवितरित राशि"
  },
  "e-Crop Land Registry:": {
    TE: "ఈ-పంట భూమి రిజిస్ట్రీ:",
    HI: "ई-फसल भूमि रजिस्ट्री:"
  },
  "Eluru District Procurement Yard": {
    TE: "ఏలూరు జిల్లా సేకరణ యార్డ్",
    HI: "एलुरु जिला खरीद यार्ड"
  },
  "EMAIL ADDRESS": {
    TE: "ఈమెయిల్ చిరునామా",
    HI: "ईमेल पता"
  },
  "ENROLLED AT": {
    TE: "నమోదు చేసుకున్న కేంద్రం",
    HI: "पंजीकृत केंद्र"
  },
  "Enter rejection reason for this officer reset request:": {
    TE: "ఈ అధికారి రీసెట్ అభ్యర్థనను తిరస్కరించడానికి గల కారణాన్ని నమోదు చేయండి:",
    HI: "इस अधिकारी पासवर्ड रीसेट अनुरोध को अस्वीकार करने का कारण दर्ज करें:"
  },
  "Failed to capture photo.": {
    TE: "ఫోటో తీయడం విఫలమైంది.",
    HI: "फोटो खींचने में विफल।"
  },
  "Failed to generate officer report PDF": {
    TE: "అధికారి నివేదిక PDF రూపొందించడం విఫలమైంది",
    HI: "अधिकारी रिपोर्ट पीडीएफ बनाने में विफल"
  },
  "Failed to generate statement PDF": {
    TE: "స్టేట్‌మెంట్ PDF రూపొందించడం విఫలమైంది",
    HI: "स्टेटमेंट पीडीएफ तैयार करने में विफल"
  },
  "Failed to reset officer password.": {
    TE: "అధికారి పాస్‌వర్డ్ రీసెట్ చేయడం విఫలమైంది.",
    HI: "अधिकारी पासवर्ड रीसेट करने में विफल।"
  },
  "Failed to reset password.": {
    TE: "పాస్‌వర్డ్ రీసెట్ చేయడం విఫలమైంది.",
    HI: "पासवर्ड रीसेट करने में विफल।"
  },
  "FAQ Acceptance Rate": {
    TE: "FAQ ప్రమాణాల ఆమోద రేటు",
    HI: "एफएक्यू स्वीकृति दर"
  },
  "FARMER ACTIVITY TIMELINE": {
    TE: "రైతు సేకరణ కాలక్రమం",
    HI: "किसान गतिविधि समयरेखा"
  },
  "FARMER PROFILE": {
    TE: "రైతు ప్రొఫైల్",
    HI: "किसान प्रोफाइल"
  },
  "Farmers waiting at procurement centre": {
    TE: "సేకరణ కేంద్రం వద్ద వేచి ఉన్న రైతులు",
    HI: "खरीद केंद्र पर प्रतीक्षारत किसान"
  },
  "Fine Paddy": {
    TE: "సన్న రకం వరి (గ్రేడ్-ఎ)",
    HI: "फाइन धान (ग्रेड ए)"
  },
  "FLEET & TRANSPORTATION MANAGEMENT": {
    TE: "రవాణా వాహనాలు & లాజిస్టిక్స్ నిర్వహణ",
    HI: "वाहन बेड़ा एवं परिवहन प्रबंधन"
  },
  "Friday, 20 March": {
    TE: "శుక్రవారం, 20 మార్చి",
    HI: "शुक्रवार, 20 मार्च"
  },
  "Full Width": {
    TE: "పూర్తి వెడల్పు",
    HI: "पूरी चौड़ाई"
  },
  "Gate pass PDF downloaded successfully": {
    TE: "గేట్ పాస్ PDF విజయవంతంగా డౌన్‌లోడ్ చేయబడింది",
    HI: "गेट पास पीडीएफ सफलतापूर्वक डाउनलोड हो गया"
  },
  "Geolocation is not supported by your browser": {
    TE: "మీ బ్రౌజర్ జియోలొకేషన్‌కు మద్దతు ఇవ్వడం లేదు",
    HI: "आपका ब्राउज़र जियोलोकेशन का समर्थन नहीं करता"
  },
  "Geolocation is not supported by your browser.": {
    TE: "మీ బ్రౌజర్ జియోలొకేషన్‌కు మద్దతు ఇవ్వడం లేదు.",
    HI: "आपका ब्राउज़र जियोलोकेशन का समर्थन नहीं करता।"
  },
  "GOVERNMENT DECLARED MSP & CROP RATES": {
    TE: "ప్రభుత్వం ప్రకటించిన కనీస మద్దతు ధరలు (MSP)",
    HI: "सरकार द्वारा घोषित एमएसपी एवं फसल दरें"
  },
  "Government Rate:": {
    TE: "ప్రభుత్వ మద్దతు ధర:",
    HI: "सरकारी दर:"
  },
  "Govt Bonus Incentive:": {
    TE: "ప్రభుత్వ ప్రోత్సాహక బోనస్:",
    HI: "सरकारी प्रोत्साहन बोनस:"
  },
  "Govt Incentive Bonus": {
    TE: "ప్రభుత్వ ప్రోత్సాహక బోనస్",
    HI: "सरकारी प्रोत्साहन बोनस"
  },
  "HEAD OFFICER GOVERNANCE · STAFF ONBOARDING": {
    TE: "ముఖ్య అధికారి పాలన · సిబ్బంది నియామకం",
    HI: "मुख्य अधिकारी प्रशासन · कर्मचारी ऑनबोर्डिंग"
  },
  "Helpline 1800-180-1551 copied.": {
    TE: "హెల్ప్‌లైన్ 1800-180-1551 కాపీ చేయబడింది.",
    HI: "हेल्पलाइन 1800-180-1551 कॉपी हो गया।"
  },
  "Helpline 1800-425-0002 copied.": {
    TE: "హెల్ప్‌లైన్ 1800-425-0002 కాపీ చేయబడింది.",
    HI: "हेल्पलाइन 1800-425-0002 कॉपी हो गया।"
  },
  "Helpline 1902 copied.": {
    TE: "హెల్ప్‌లైన్ 1902 కాపీ చేయబడింది.",
    HI: "हेल्पलाइन 1902 कॉपी हो गया।"
  },
  "History": {
    TE: "చరిత్ర & రికార్డులు",
    HI: "इतिहास एवं रिकॉर्ड"
  },
  "How do I book a 30% subsidized tractor trolley?": {
    TE: "నేను 30% సబ్సిడీ ట్రాక్టర్ ట్రాలీని ఎలా బుక్ చేయాలి?",
    HI: "मैं 30% सब्सिडीयुक्त ट्रैक्टर ट्रॉली कैसे बुक करूं?"
  },
  "Identity verification failed.": {
    TE: "గుర్తింపు ధృవీకరణ విఫలమైంది.",
    HI: "पहचान सत्यापन विफल रहा।"
  },
  "In Transit / Active": {
    TE: "రవాణాలో ఉంది / సక్రియం",
    HI: "रास्ते में / सक्रिय"
  },
  "Initiated by Head Officer · Ref:": {
    TE: "ముఖ్య అధికారి ప్రారంభించారు · సూచన నం:",
    HI: "मुख्य अधिकारी द्वारा शुरू किया गया · संदर्भ:"
  },
  "Instant operational answers for token queue, fair MSP prices, weather harvest advisories, subsidized transport, and farmer DBT settlements.": {
    TE: "టోకెన్ క్యూ, కనీస మద్దతు ధరలు, వాతావరణ కోత సలహాలు, సబ్సిడీ రవాణా మరియు రైతు DBT చెల్లింపులపై తక్షణ కార్యాచరణ సమాధానాలు.",
    HI: "टोकन कतार, निष्पक्ष एमएसपी, मौसम कटाई सलाह, सब्सिडीयुक्त परिवहन और किसान डीबीटी भुगतान के लिए तत्काल समाधान।"
  },
  "Is today": {
    TE: "ఈ రోజు",
    HI: "आज है"
  },
  "Karnal GT Road New Grain Market": {
    TE: "కర్నాల్ జి.టి రోడ్ కొత్త ధాన్యపు మార్కెట్",
    HI: "करनाल जीटी रोड नई अनाज मंडी"
  },
  "Kurnool Rythu Bharosa Kendra": {
    TE: "కర్నూలు రైతు భరోసా కేంద్రం",
    HI: "कुरनूल रायथू भरोसा केंद्र"
  },
  "LIVE QUEUE": {
    TE: "ప్రత్యక్ష క్యూ సమాచారం",
    HI: "लाइव कतार"
  },
  "Location permission denied or unavailable. Using registered farm district.": {
    TE: "లొకేషన్ అనుమతి నిరాకరించబడింది. నమోదిత పొలం జిల్లా వివరాలు ఉపయోగించబడుతున్నాయి.",
    HI: "स्थान की अनुमति अस्वीकृत या अनुपलब्ध। पंजीकृत खेत जिले का उपयोग किया जा रहा है।"
  },
  "Login as an approved farmer before confirming a booking.": {
    TE: "బుకింగ్ నిర్ధారించడానికి ముందు ఆమోదించబడిన రైతుగా లాగిన్ అవ్వండి.",
    HI: "बुकिंग की पुष्टि करने से पहले स्वीकृत किसान के रूप में लॉगिन करें।"
  },
  "Login as an approved farmer with an active booking before paying.": {
    TE: "చెల్లింపు చేయడానికి ముందు సక్రియ బుకింగ్ ఉన్న ఆమోదిత రైతుగా లాగిన్ అవ్వండి.",
    HI: "भुगतान करने से पहले सक्रिय बुकिंग वाले स्वीकृत किसान के रूप में लॉगिन करें।"
  },
  "Login as an officer before approving a registration.": {
    TE: "నమోదును ఆమోదించడానికి ముందు అధికారిగా లాగిన్ అవ్వండి.",
    HI: "पंजीकरण स्वीकृत करने से पहले अधिकारी के रूप में लॉगिन करें।"
  },
  "Login as an officer before rejecting a registration.": {
    TE: "నమోదును తిరస్కరించడానికి ముందు అధికారిగా లాగిన్ అవ్వండి.",
    HI: "पंजीकरण अस्वीकार करने से पहले अधिकारी के रूप में लॉगिन करें।"
  },
  "Login could not be completed.": {
    TE: "లాగిన్ పూర్తి కాలేదు.",
    HI: "लॉगिन पूरा नहीं हो सका।"
  },
  "Login ID copied!": {
    TE: "లాగిన్ ఐడీ కాపీ చేయబడింది!",
    HI: "लॉगिन आईडी कॉपी हो गई!"
  },
  "Logistics & Transport": {
    TE: "లాజిస్టిక్స్ & రవాణా",
    HI: "रसद एवं परिवहन"
  },
  "Logistics Subsidy Saved": {
    TE: "రవాణా సబ్సిడీ ఆదా చేయబడింది",
    HI: "रसद सब्सिडी बचत"
  },
  "Logistics update failed.": {
    TE: "రవాణా వివరాల నవీకరణ విఫలమైంది.",
    HI: "रसद अपडेट विफल रहा।"
  },
  "Ludhiana Gill Road Grain Mandi": {
    TE: "లూధియానా గిల్ రోడ్ ధాన్యపు మార్కెట్",
    HI: "लुधियाना गिल रोड अनाज मंडी"
  },
  "Lush green paddy crop field": {
    TE: "పచ్చని వరి పంట పొలం",
    HI: "लहलहाता हरा-भरा धान का खेत"
  },
  "Mandi Prices": {
    TE: "మార్కెట్ ధరలు",
    HI: "मंडी भाव"
  },
  "Microphone access was denied. Please allow microphone permissions.": {
    TE: "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది. దయచేసి మైక్రోఫోన్ అనుమతిని ప్రారంభించండి.",
    HI: "माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया माइक्रोफ़ोन की अनुमति दें।"
  },
  "Microphone permission denied.": {
    TE: "మైక్రోఫోన్ అనుమతి నిరాకరించబడింది.",
    HI: "माइक्रोफ़ोन की अनुमति अस्वीकृत।"
  },
  "Mobile Phone:": {
    TE: "మొబైల్ ఫోన్:",
    HI: "मोबाइल फोन:"
  },
  "Mobile view active notification": {
    TE: "మొబైల్ వీక్షణ సక్రియ సమాచారం",
    HI: "मोबाइल दृश्य सक्रिय सूचना"
  },
  "Nagpur Kalamna Grain Market": {
    TE: "నాగ్‌పూర్ కలమ్నా ధాన్యపు మార్కెట్",
    HI: "नागपुर कलमना अनाज मंडी"
  },
  "NATIONAL FARMER DIRECTORY": {
    TE: "జాతీయ రైతు డైరెక్టరీ",
    HI: "राष्ट्रीय किसान निर्देशिका"
  },
  "NEEDS ATTENTION": {
    TE: "పరిశీలన అవసరం",
    HI: "ध्यान देने योग्य"
  },
  "Needs Attention / Rejected": {
    TE: "పరిశీలన అవసరం / తిరస్కరించబడింది",
    HI: "ध्यान देने योग्य / अस्वीकृत"
  },
  "Nellore Coastal Paddy Mandi": {
    TE: "నెల్లూరు తీర ప్రాంత వరి మార్కెట్",
    HI: "नेल्लोर तटीय धान मंडी"
  },
  "Net Logistics Spent:": {
    TE: "నికర రవాణా ఖర్చు:",
    HI: "शुद्ध रसद खर्च:"
  },
  "NEW PROCUREMENT BOOKING": {
    TE: "కొత్త ధాన్యం సేకరణ బుకింగ్",
    HI: "नई खरीद बुकिंग"
  },
  "NIZAMABAD DISTRICT · LIVE OPERATIONS": {
    TE: "నిజామాబాద్ జిల్లా · ప్రత్యక్ష కార్యకలాపాలు",
    HI: "निजामाबाद जिला · लाइव संचालन"
  },
  "No active booking": {
    TE: "సక్రియ బుకింగ్‌లు ఏవీ లేవు",
    HI: "कोई सक्रिय बुकिंग नहीं"
  },
  "No active booking to cancel.": {
    TE: "రద్దు చేయడానికి సక్రియ బుకింగ్ ఏదీ లేదు.",
    HI: "रद्द करने के लिए कोई सक्रिय बुकिंग नहीं है।"
  },
  "No farmers found": {
    TE: "రైతుల వివరాలు కనుగొనబడలేదు",
    HI: "कोई किसान नहीं मिला"
  },
  "None": {
    TE: "ఏదీ లేదు",
    HI: "कोई नहीं"
  },
  "Officer console session closed.": {
    TE: "అధికారి కన్సోల్ సెషన్ ముగిసింది.",
    HI: "अधिकारी कंसोल सत्र समाप्त हो गया।"
  },
  "Officer Copilot conversation cleared.": {
    TE: "అధికారి కోపైలట్ సంభాషణ తొలగించబడింది.",
    HI: "अधिकारी कोपायलट बातचीत साफ की गई।"
  },
  "Officer login could not be completed.": {
    TE: "అధికారి లాగిన్ పూర్తి కాలేదు.",
    HI: "अधिकारी लॉगिन पूरा नहीं हो सका।"
  },
  "Officer Mandi Operational Report PDF downloaded.": {
    TE: "అధికారి మార్కెట్ కార్యాచరణ నివేదిక PDF డౌన్‌లోడ్ చేయబడింది.",
    HI: "अधिकारी मंडी संचालन रिपोर्ट पीडीएफ डाउनलोड हो गया।"
  },
  "Officer password updated successfully! You can now log in.": {
    TE: "అధికారి పాస్‌వర్డ్ విజయవంతంగా నవీకరించబడింది! ఇప్పుడు మీరు లాగిన్ అవ్వవచ్చు.",
    HI: "अधिकारी पासवर्ड सफलतापूर्वक अपडेट हो गया! अब आप लॉगिन कर सकते हैं।"
  },
  "OFFICIAL HARVEST PERFORMANCE": {
    TE: "అధికారిక పంట సేకరణ పనితీరు",
    HI: "आधिकारिक फसल खरीद प्रदर्शन"
  },
  "OFFICIAL MANDI PROCUREMENT PASS": {
    TE: "అధికారిక మార్కెట్ ధాన్యం సేకరణ పాస్",
    HI: "आधिकारिक मंडी खरीद पास"
  },
  "Official verified digital token pass. Present this pass or QR code at the procurement centre entry gate.": {
    TE: "అధికారికంగా ధృవీకరించబడిన డిజిటల్ టోకెన్ పాస్. సేకరణ కేంద్రం ప్రవేశ ద్వారం వద్ద ఈ పాస్ లేదా క్యూఆర్ కోడ్‌ను చూపించండి.",
    HI: "आधिकारिक सत्यापित डिजिटल टोकन पास। खरीद केंद्र के प्रवेश द्वार पर यह पास या क्यूआर कोड दिखाएं।"
  },
  "Offline Meteorological Cache:": {
    TE: "ఆఫ్‌లైన్ వాతావరణ నిల్వ సమాచారం:",
    HI: "ऑफ़लाइन मौसम कैश:"
  },
  "Opening Google Maps Directions in new tab...": {
    TE: "కొత్త ట్యాబ్‌లో గూగుల్ మ్యాప్స్ దిశలను తెరుస్తోంది...",
    HI: "नए टैब में गूगल मैप्स दिशा-निर्देश खोले जा रहे हैं..."
  },
  "Orderly procurement centre queue": {
    TE: "సేకరణ కేంద్రం వద్ద క్రమబద్ధమైన క్యూ",
    HI: "खरीद केंद्र पर व्यवस्थित कतार"
  },
  "Original photo is too large (>10MB). Please choose a smaller photo.": {
    TE: "ఫోటో పరిమాణం చాలా పెద్దదిగా ఉంది (>10MB). దయచేసి చిన్న ఫోటోను ఎంచుకోండి.",
    HI: "मूल फोटो बहुत बड़ी है (>10MB)। कृपया छोटी फोटो चुनें।"
  },
  "Paddy (Common / Grade A)": {
    TE: "వరి / ధాన్యం (సాధారణ / గ్రేడ్-ఎ)",
    HI: "धान (सामान्य / ग्रेड ए)"
  },
  "Paddy procurement settlement": {
    TE: "వరి ధాన్యం సేకరణ చెల్లింపు పరిష్కారం",
    HI: "धान खरीद भुगतान निपटान"
  },
  "Paddy sample and procurement work materials": {
    TE: "ధాన్యం నమూనా మరియు సేకరణ పని సామాగ్రి",
    HI: "धान का नमूना एवं खरीद कार्य सामग्री"
  },
  "Paddy sample in tray, clipboard and weighing equipment": {
    TE: "ట్రేలో ధాన్యం నమూనా, క్లిప్‌బోర్డ్ మరియు తూకం పరికరాలు",
    HI: "ट्रे में धान का नमूना, क्लिपबोर्ड और तौल उपकरण"
  },
  "Paddy selected": {
    TE: "వరి ఎంపిక చేయబడింది",
    HI: "धान चुना गया"
  },
  "Page 1": {
    TE: "పేజీ 1",
    HI: "पृष्ठ 1"
  },
  "Page 2": {
    TE: "పేజీ 2",
    HI: "पृष्ठ 2"
  },
  "Password Reset Requests": {
    TE: "పాస్‌వర్డ్ రీసెట్ అభ్యర్థనలు",
    HI: "पासवर्ड रीसेट अनुरोध"
  },
  "Password reset successfully! You can now log in.": {
    TE: "పాస్‌వర్డ్ విజయవంతంగా రీసెట్ చేయబడింది! ఇప్పుడు మీరు లాగిన్ అవ్వవచ్చు.",
    HI: "पासवर्ड सफलतापूर्वक रीसेट हो गया! अब आप लॉगिन कर सकते हैं।"
  },
  "Payable to Farmer:": {
    TE: "రైతుకు చెల్లించవలసిన మొత్తం:",
    HI: "किसान को देय राशि:"
  },
  "Payment": {
    TE: "చెల్లింపు",
    HI: "भुगतान"
  },
  "Payment failed.": {
    TE: "చెల్లింపు విఫలమైంది.",
    HI: "भुगतान विफल रहा।"
  },
  "Payment failed. Please try again.": {
    TE: "చెల్లింపు విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.",
    HI: "भुगतान विफल रहा। कृपया पुनः प्रयास करें।"
  },
  "Payment initiation failed.": {
    TE: "చెల్లింపు ప్రారంభం విఫలమైంది.",
    HI: "भुगतान शुरुआत विफल रही।"
  },
  "PAYMENT OPERATIONS": {
    TE: "చెల్లింపుల నిర్వహణ",
    HI: "भुगतान संचालन"
  },
  "Payment Settlement": {
    TE: "చెల్లింపు పరిష్కారం",
    HI: "भुगतान निपटान"
  },
  "Payment status could not be refreshed.": {
    TE: "చెల్లింపు స్థితిని నవీకరించడం సాధ్యం కాలేదు.",
    HI: "भुगतान स्थिति को रीफ्रेश नहीं किया जा सका।"
  },
  "Payment status refreshed from database.": {
    TE: "డేటాబేస్ నుండి చెల్లింపు స్థితి నవీకరించబడింది.",
    HI: "डेटाबेस से भुगतान स्थिति रीफ्रेश हो गई।"
  },
  "Payment successful. Your receipt is ready.": {
    TE: "చెల్లింపు విజయవంతమైంది. మీ రసీదు సిద్ధంగా ఉంది.",
    HI: "भुगतान सफल रहा। आपकी रसीद तैयार है।"
  },
  "Payout initiation failed.": {
    TE: "చెల్లింపు ప్రక్రియ ప్రారంభం విఫలమైంది.",
    HI: "भुगतान प्रक्रिया शुरुआत विफल रही।"
  },
  "PAYOUT READY": {
    TE: "చెల్లింపునకు సిద్ధంగా ఉంది",
    HI: "भुगतान हेतु तैयार"
  },
  "Pending farmers": {
    TE: "పరిశీలనలో ఉన్న రైతులు",
    HI: "प्रतीक्षारत किसान"
  },
  "Pending payments": {
    TE: "పెండింగ్‌లో ఉన్న చెల్లింపులు",
    HI: "बकाया भुगतान"
  },
  "Pending registrations": {
    TE: "పరిశీలనలో ఉన్న నమోదులు",
    HI: "लंबित पंजीकरण"
  },
  "Pending Review": {
    TE: "పరిశీలనలో ఉంది",
    HI: "समीक्षाधीन"
  },
  "Pending Scale": {
    TE: "తూకం వేయవలసి ఉంది",
    HI: "तौल लंबित"
  },
  "Pending Verification": {
    TE: "ధృవీకరణ పెండింగ్‌లో ఉంది",
    HI: "सत्यापन लंबित"
  },
  "People ahead": {
    TE: "ముందున్న వ్యక్తులు",
    HI: "कतार में आगे लोग"
  },
  "Phone Frame": {
    TE: "ఫోన్ ఫ్రేమ్",
    HI: "फोन फ्रेम"
  },
  "Photo attached ready for AI inspection.": {
    TE: "AI పరిశీలన కోసం ఫోటో జతచేయబడింది.",
    HI: "एआई जांच के लिए फोटो संलग्न है।"
  },
  "Pickup or destination location is missing.": {
    TE: "పికప్ లేదా గమ్యస్థాన వివరాలు లేవు.",
    HI: "पिकअप या गंतव्य स्थान गायब है।"
  },
  "Pickup village or destination mandi is missing for this booking.": {
    TE: "ఈ బుకింగ్‌కు పికప్ గ్రామం లేదా గమ్యస్థాన మార్కెట్ వివరాలు లేవు.",
    HI: "इस बुकिंग के लिए पिकअप गांव या गंतव्य मंडी गायब है।"
  },
  "Pickup village or destination mandi is missing.": {
    TE: "పికప్ గ్రామం లేదా గమ్యస్థాన మార్కెట్ వివరాలు లేవు.",
    HI: "पिकअप गांव या गंतव्य मंडी गायब है।"
  },
  "Please enter a pickup village name to preview driving route.": {
    TE: "ప్రయాణ మార్గాన్ని చూడటానికి దయచేసి పికప్ గ్రామం పేరును నమోదు చేయండి.",
    HI: "ड्राइविंग मार्ग देखने के लिए कृपया पिकअप गांव का नाम दर्ज करें।"
  },
  "Please select a valid JPG, PNG, or WebP photograph.": {
    TE: "దయచేసి సరైన JPG, PNG లేదా WebP ఫోటోను ఎంచుకోండి.",
    HI: "कृपया वैध जेपीजी, पीएनजी या वेबपी फोटो चुनें।"
  },
  "Previous price record not available": {
    TE: "మునుపటి ధర రికార్డు అందుబాటులో లేదు",
    HI: "पिछला मूल्य रिकॉर्ड उपलब्ध नहीं"
  },
  "Primary Crop:": {
    TE: "ప్రధాన పంట:",
    HI: "मुख्य फसल:"
  },
  "Proceed to verify payout credentials and receive payment receipt.": {
    TE: "చెల్లింపు ఆధారాలను ధృవీకరించి చెల్లింపు రసీదును పొందండి.",
    HI: "भुगतान विवरण सत्यापित करने और रसीद प्राप्त करने के लिए आगे बढ़ें।"
  },
  "Processing Direct Bank Transfer to:": {
    TE: "ఈ క్రింది ఖాతాకు నేరుగా బ్యాంకు బదిలీ చేయబడుతోంది:",
    HI: "सीधे बैंक खाते में डीबीटी प्रक्रिया जारी:"
  },
  "Procured & Graded": {
    TE: "సేకరించబడింది & గ్రేడ్ నిర్ణయించబడింది",
    HI: "खरीदी गई और ग्रेडिंग पूर्ण"
  },
  "ProcureFlow – From Farm to Procurement": {
    TE: "ప్రొక్యూర్‌ఫ్లో – రైతు క్షేత్రం నుండి సేకరణ వరకు",
    HI: "प्रोक्योरफ्लो – खेत से खरीद तक"
  },
  "ProcureFlow Copilot is analyzing operational SOPs...": {
    TE: "ప్రొక్యూర్‌ఫ్లో కోపైలట్ కార్యాచరణ నిబంధనలను విశ్లేషిస్తోంది...",
    HI: "प्रोक्योरफ्लो कोपायलट परिचालन नियमों का विश्लेषण कर रहा है..."
  },
  "ProcureFlow Krishi Assistant is thinking...": {
    TE: "ప్రొక్యూర్‌ఫ్లో కృషి సహాయకుడు సమాధానం రూపొందిస్తున్నాడు...",
    HI: "प्रोक्योरफ्लो कृषि सहायक उत्तर तैयार कर रहा है..."
  },
  "Procurement & Payment": {
    TE: "సేకరణ & చెల్లింపులు",
    HI: "खरीद एवं भुगतान"
  },
  "Procurement Completed": {
    TE: "ధాన్యం సేకరణ పూర్తయింది",
    HI: "खरीद पूर्ण हुई"
  },
  "Procurement Documents": {
    TE: "సేకరణ పత్రాలు",
    HI: "खरीद दस्तावेज"
  },
  "Procurement Payment Receipt PDF downloaded.": {
    TE: "సేకరణ చెల్లింపు రసీదు PDF డౌన్‌లోడ్ చేయబడింది.",
    HI: "खरीद भुगतान रसीद पीडीएफ डाउनलोड हो गई।"
  },
  "Procurement stage": {
    TE: "సేకరణ దశ",
    HI: "खरीद चरण"
  },
  "Procurement Statement downloaded as PDF.": {
    TE: "సేకరణ స్టేట్‌మెంట్ PDFగా డౌన్‌లోడ్ చేయబడింది.",
    HI: "खरीद विवरण पीडीएफ के रूप में डाउनलोड हो गया।"
  },
  "PROCUREMENT STATUS": {
    TE: "ధాన్యం సేకరణ స్థితి",
    HI: "खरीद की स्थिति"
  },
  "Publication date unavailable": {
    TE: "ప్రచురణ తేదీ అందుబాటులో లేదు",
    HI: "प्रकाशन तिथि उपलब्ध नहीं"
  },
  "QC inspection submission failed.": {
    TE: "నాణ్యత తనిఖీ సమర్పణ విఫలమైంది.",
    HI: "गुणवत्ता निरीक्षण प्रस्तुति विफल रही।"
  },
  "QUALITY ASSURANCE & LAB TESTING": {
    TE: "నాణ్యత ప్రమాణాలు & ల్యాబ్ పరీక్షలు",
    HI: "गुणवत्ता आश्वासन एवं प्रयोगशाला परीक्षण"
  },
  "Quick Questions:": {
    TE: "త్వరిత ప్రశ్నలు:",
    HI: "त्वरित प्रश्न:"
  },
  "Rajahmundry Godavari Collection Point": {
    TE: "రాజమండ్రి గోదావరి సేకరణ కేంద్రం",
    HI: "राजमुंदरी गोदावरी संकलन केंद्र"
  },
  "Ramesh Kumar": {
    TE: "రమేష్ కుమార్",
    HI: "रमेश कुमार"
  },
  "Ready for DBT Payout": {
    TE: "DBT చెల్లింపునకు సిద్ధంగా ఉంది",
    HI: "डीबीटी भुगतान के लिए तैयार"
  },
  "Registered Farmers": {
    TE: "నమోదిత రైతులు",
    HI: "पंजीकृत किसान"
  },
  "Registration could not be submitted.": {
    TE: "నమోదును సమర్పించడం సాధ్యం కాలేదు.",
    HI: "पंजीकरण जमा नहीं किया जा सका।"
  },
  "REGISTRATION REVIEW": {
    TE: "రైతు నమోదు పరిశీలన",
    HI: "पंजीकरण समीक्षा"
  },
  "Reject Farmer Registration": {
    TE: "రైతు నమోదును తిరస్కరించండి",
    HI: "किसान पंजीकरण अस्वीकार करें"
  },
  "Rejected by Head Officer": {
    TE: "ముఖ్య అధికారి తిరస్కరించారు",
    HI: "मुख्य अधिकारी द्वारा अस्वीकृत"
  },
  "Rejection failed.": {
    TE: "తిరస్కరణ చర్య విఫలమైంది.",
    HI: "अस्वीकृति कार्रवाई विफल रही।"
  },
  "Rejection Reason": {
    TE: "తిరస్కరణకు గల కారణం",
    HI: "अस्वीकृति का कारण"
  },
  "Requested": {
    TE: "అభ్యర్థించబడింది",
    HI: "अनुरोधित"
  },
  "RESERVE A TIME": {
    TE: "సమయ స్లాట్‌ను రిజర్వ్ చేసుకోండి",
    HI: "समय स्लॉट आरक्षित करें"
  },
  "REVIEW AND CONFIRM": {
    TE: "పరిశీలించి నిర్ధారించండి",
    HI: "समीक्षा करें और पुष्टि करें"
  },
  "Role Scope:": {
    TE: "బాధ్యతల పరిధి:",
    HI: "भूमिका का दायरा:"
  },
  "Selected Crop Summary": {
    TE: "ఎంచుకున్న పంట సారాంశం",
    HI: "चयनित फसल सारांश"
  },
  "Sign in to see API notifications": {
    TE: "API నోటిఫికేషన్‌లను చూడటానికి సైన్ ఇన్ అవ్వండి",
    HI: "एपीआई सूचनाएं देखने के लिए लॉगिन करें"
  },
  "Slot Booked": {
    TE: "స్లాట్ బుక్ చేయబడింది",
    HI: "स्लॉट बुक हो गया"
  },
  "Specify the reason for rejecting": {
    TE: "తిరస్కరించడానికి గల కారణాన్ని పేర్కొనండి",
    HI: "अस्वीकार करने का कारण बताएं"
  },
  "Staff Management → Password Reset Requests": {
    TE: "సిబ్బంది నిర్వహణ → పాస్‌వర్డ్ రీసెట్ అభ్యర్థనలు",
    HI: "कर्मचारी प्रबंधन → पासवर्ड रीसेट अनुरोध"
  },
  "Staff member access RE-ENABLED.": {
    TE: "సిబ్బంది సభ్యుని ప్రవేశం తిరిగి ప్రారంభించబడింది.",
    HI: "कर्मचारी की पहुंच पुनः सक्षम की गई।"
  },
  "Staff registration failed.": {
    TE: "సిబ్బంది నమోదు విఫలమైంది.",
    HI: "कर्मचारी पंजीकरण विफल रहा।"
  },
  "Staff Registration Submitted — Pending Head Officer Verification": {
    TE: "సిబ్బంది నమోదు సమర్పించబడింది — ముఖ్య అధికారి ధృవీకరణ పెండింగ్‌లో ఉంది",
    HI: "कर्मचारी पंजीकरण जमा — मुख्य अधिकारी सत्यापन लंबित"
  },
  "Starting camera...": {
    TE: "కెమెరాను ప్రారంభిస్తోంది...",
    HI: "कैमरा शुरू हो रहा है..."
  },
  "Status update failed.": {
    TE: "స్థితి నవీకరణ విఫలమైంది.",
    HI: "स्थिति अपडेट विफल रहा।"
  },
  "Submission failed.": {
    TE: "సమర్పణ విఫలమైంది.",
    HI: "प्रस्तुति विफल रही।"
  },
  "Submit registration": {
    TE: "నమోదును సమర్పించండి",
    HI: "पंजीकरण जमा करें"
  },
  "Subsidized Transport Pass PDF downloaded.": {
    TE: "సబ్సిడీ రవాణా పాస్ PDF డౌన్‌లోడ్ చేయబడింది.",
    HI: "सब्सिडीयुक्त परिवहन पास पीडीएफ डाउनलोड हो गया।"
  },
  "Telangana Districts": {
    TE: "తెలంగాణ జిల్లాలు",
    HI: "तेलंगाना के जिले"
  },
  "Temporary password copied!": {
    TE: "తాత్కాలిక పాస్‌వర్డ్ కాపీ చేయబడింది!",
    HI: "अस्थायी पासवर्ड कॉपी हो गया!"
  },
  "This slot booking was cancelled. Your slot capacity has been released.": {
    TE: "ఈ స్లాట్ బుకింగ్ రద్దు చేయబడింది. మీ స్లాట్ సామర్థ్యం విడుదల చేయబడింది.",
    HI: "यह स्लॉट बुकिंग रद्द कर दी गई। आपकी स्लॉट क्षमता मुक्त कर दी गई है।"
  },
  "Thursday, 19 March": {
    TE: "గురువారం, 19 మార్చి",
    HI: "गुरुवार, 19 मार्च"
  },
  "Time remaining:": {
    TE: "మిగిలి ఉన్న సమయం:",
    HI: "शेष समय:"
  },
  "Tirupati Rayalaseema Grain Yard": {
    TE: "తిరుపతి రాయలసీమ ధాన్యపు యార్డ్",
    HI: "तिरुपति रायलसीमा अनाज यार्ड"
  },
  "Today": {
    TE: "ఈ రోజు",
    HI: "आज"
  },
  "Today, 17 Mar": {
    TE: "ఈ రోజు, 17 మార్చి",
    HI: "आज, 17 मार्च"
  },
  "Token copied to clipboard!": {
    TE: "టోకెన్ క్లిప్‌బోర్డ్‌కు కాపీ చేయబడింది!",
    HI: "टोकन क्लिपबोर्ड पर कॉपी हो गया!"
  },
  "Token details copied to clipboard.": {
    TE: "టోకెన్ వివరాలు క్లిప్‌బోర్డ్‌కు కాపీ చేయబడ్డాయి.",
    HI: "टोकन विवरण क्लिपबोर्ड पर कॉपी हो गया।"
  },
  "Total bookings": {
    TE: "మొత్తం బుకింగ్‌లు",
    HI: "कुल बुकिंग"
  },
  "Total Fleet Trips": {
    TE: "మొత్తం రవాణా ట్రిప్పులు",
    HI: "कुल वाहन यात्राएं"
  },
  "Total Guaranteed:": {
    TE: "మొత్తం హామీ మొత్తం:",
    HI: "कुल गारंटीशुदा राशि:"
  },
  "Total registered farmers": {
    TE: "మొత్తం నమోదిత రైతులు",
    HI: "कुल पंजीकृत किसान"
  },
  "Total Registered Farmers": {
    TE: "మొత్తం నమోదిత రైతులు",
    HI: "कुल पंजीकृत किसान"
  },
  "Total Transport Trips:": {
    TE: "మొత్తం రవాణా ట్రిప్పులు:",
    HI: "कुल परिवहन यात्राएं:"
  },
  "Transport booking failed.": {
    TE: "రవాణా బుకింగ్ విఫలమైంది.",
    HI: "परिवहन बुकिंग विफल रही।"
  },
  "Try changing your search query or status filter.": {
    TE: "మీ శోధన పదం లేదా స్థితి ఫిల్టర్‌ను మార్చి ప్రయత్నించండి.",
    HI: "अपनी खोज या स्थिति फ़िल्टर बदलकर पुनः प्रयास करें।"
  },
  "Try clearing your search query or selecting \"All Trips\".": {
    TE: "మీ శోధనను తొలగించి లేదా \"అన్ని ట్రిప్పులు\" ఎంచుకుని ప్రయత్నించండి.",
    HI: "अपनी खोज हटाएं या \"सभी यात्राएं\" चुनकर पुनः प्रयास करें।"
  },
  "Uploaded agricultural photograph": {
    TE: "అప్‌లోడ్ చేసిన వ్యవసాయ ఫోటో",
    HI: "अपलोड की गई कृषि फोटो"
  },
  "Used & deactivated": {
    TE: "ఉపయోగించబడింది & నిష్క్రియం చేయబడింది",
    HI: "उपयोग की गई और निष्क्रिय"
  },
  "Vehicle Type:": {
    TE: "వాహనం రకం:",
    HI: "वाहन का प्रकार:"
  },
  "Verification": {
    TE: "ధృవీకరణ",
    HI: "सत्यापन"
  },
  "Verified (Pahani/1B)": {
    TE: "ధృవీకరించబడింది (పహానీ/1B)",
    HI: "सत्यापित (पाहानी/1B)"
  },
  "Verified & Approved": {
    TE: "ధృవీకరించబడింది & ఆమోదించబడింది",
    HI: "सत्यापित एवं स्वीकृत"
  },
  "Vijayawada Central Paddy Hub": {
    TE: "విజయవాడ సెంట్రల్ వరి హబ్",
    HI: "विजयवाड़ा सेंट्रल धान हब"
  },
  "Village & District:": {
    TE: "గ్రామం & జిల్లా:",
    HI: "गांव एवं जिला:"
  },
  "Visakhapatnam Anandapuram Yard": {
    TE: "విశాఖపట్నం ఆనందపురం యార్డ్",
    HI: "विशाखापट्टनम आनंदपुरम यार्ड"
  },
  "Webcam Active": {
    TE: "వెబ్‌క్యామ్ సక్రియంగా ఉంది",
    HI: "वेबकैम सक्रिय"
  },
  "Wednesday, 18 March": {
    TE: "బుధవారం, 18 మార్చి",
    HI: "बुधवार, 18 मार्च"
  },
  "Weighing & Quality": {
    TE: "తూకం & నాణ్యత తనిఖీ",
    HI: "तौल एवं गुणवत्ता"
  },
  "What is my token and estimated wait time?": {
    TE: "నా టోకెన్ సంఖ్య మరియు అంచనా వేచి ఉండే సమయం ఎంత?",
    HI: "मेरा टोकन नंबर और अनुमानित प्रतीक्षा समय क्या है?"
  },
  "What is the 2025-26 MSP rate for Grade A Paddy?": {
    TE: "గ్రేడ్-ఎ వరికి 2025-26 మద్దతు ధర (MSP) ఎంత?",
    HI: "ग्रेड-ए धान के लिए 2025-26 एमएसपी दर क्या है?"
  },
  "XXXX XXXX 4512": {
    TE: "XXXX XXXX 4512",
    HI: "XXXX XXXX 4512"
  },
  "You have been logged out from Farmer Portal.": {
    TE: "మీరు రైతు పోర్టల్ నుండి విజయవంతంగా లాగౌట్ అయ్యారు.",
    HI: "आप किसान पोर्टल से सफलतापूर्वक लॉग आउट हो गए हैं।"
  },

  // Interpolated Templates
  "Copied {{code}}": {
    TE: "{{code}} కాపీ చేయబడింది",
    HI: "{{code}} कॉपी हो गया"
  },
  "Direct Benefit Transfer: {{ref}}": {
    TE: "ప్రత్యక్ష నగదు బదిలీ (DBT): {{ref}}",
    HI: "प्रत्यक्ष लाभ अंतरण (डीबीटी): {{ref}}"
  },
  "Farmer {{name}} approved successfully!": {
    TE: "రైతు {{name}} విజయవంతంగా ఆమోదించబడ్డారు!",
    HI: "किसान {{name}} को सफलतापूर्वक स्वीकृति दी गई!"
  },
  "Identity verified for {{name}}! Set your new password.": {
    TE: "{{name}} గారి గుర్తింపు ధృవీకరించబడింది! మీ కొత్త పాస్‌వర్డ్‌ను సెట్ చేసుకోండి.",
    HI: "{{name}} की पहचान सत्यापित हो गई! अपना नया पासवर्ड सेट करें।"
  },
  "Loaded {{commodity}} ({{variety}}) into valuation calculator": {
    TE: "గణన యంత్రంలోకి {{commodity}} ({{variety}}) లోడ్ చేయబడింది",
    HI: "मूल्यांकन कैलकुलेटर में {{commodity}} ({{variety}}) लोड किया गया"
  },
  "Login ID {{code}} copied!": {
    TE: "లాగిన్ ఐడీ {{code}} కాపీ చేయబడింది!",
    HI: "लॉगिन आईडी {{code}} कॉपी हो गई!"
  },
  "Password reset approved! Token: {{token}}": {
    TE: "పాస్‌వర్డ్ రీసెట్ ఆమోదించబడింది! టోకెన్: {{token}}",
    HI: "पासवर्ड रीसेट स्वीकृत! टोकन: {{token}}"
  },
  "Payment initiated! Ref: {{ref}}": {
    TE: "చెల్లింపు ప్రారంభించబడింది! సూచన నం: {{ref}}",
    HI: "भुगतान शुरू किया गया! संदर्भ: {{ref}}"
  },
  "Procurement DBT Payment of ₹{{amount}} credited to {{name}}.": {
    TE: "{{name}} గారికి ₹{{amount}} సేకరణ DBT చెల్లింపు జమ చేయబడింది.",
    HI: "{{name}} को ₹{{amount}} खरीद डीबीटी भुगतान जमा किया गया।"
  },
  "Procurement Slot: {{variety}}": {
    TE: "సేకరణ స్లాట్: {{variety}}",
    HI: "खरीद स्लॉट: {{variety}}"
  },
  "Procurement stage updated to {{stage}}.": {
    TE: "సేకరణ దశ {{stage}}గా నవీకరించబడింది.",
    HI: "खरीद चरण को {{stage}} में अपडेट किया गया।"
  },
  "Quality inspection submitted: {{result}} ({{grade}}).": {
    TE: "నాణ్యత తనిఖీ సమర్పించబడింది: {{result}} ({{grade}}).",
    HI: "गुणवत्ता निरीक्षण दर्ज: {{result}} ({{grade}})।"
  },
  "Registration for {{name}} rejected.": {
    TE: "{{name}} గారి నమోదు తిరస్కరించబడింది.",
    HI: "{{name}} का पंजीकरण अस्वीकार कर दिया गया।"
  },
  "Reset request #{{id}} submitted for {{code}}!": {
    TE: "{{code}} కోసం రీసెట్ అభ్యర్థన #{{id}} సమర్పించబడింది!",
    HI: "{{code}} के लिए रीसेट अनुरोध #{{id}} प्रस्तुत किया गया!"
  },
  "Selected {{crop}} for valuation calculator.": {
    TE: "ధర అంచనా కోసం {{crop}} ఎంపిక చేయబడింది.",
    HI: "मूल्यांकन के लिए {{crop}} चुना गया।"
  },
  "Showing results for \"{{query}}\"": {
    TE: "\"{{query}}\" కోసం ఫలితాలు చూపబడుతున్నాయి",
    HI: "\"{{query}}\" के परिणाम दिखाए जा रहे हैं"
  },
  "Staff application for {{name}} rejected.": {
    TE: "{{name}} గారి సిబ్బంది దరఖాస్తు తిరస్కరించబడింది.",
    HI: "{{name}} का स्टाफ आवेदन अस्वीकार कर दिया गया।"
  },
  "Staff member {{name}} verified and activated.": {
    TE: "సిబ్బంది సభ్యుడు {{name}} ధృవీకరించబడ్డారు మరియు ఖాతా సక్రియం చేయబడింది.",
    HI: "कर्मचारी {{name}} सत्यापित और सक्रिय किए गए।"
  },
  "Transport: {{pickup}} → {{dest}}": {
    TE: "రవాణా: {{pickup}} → {{dest}}",
    HI: "परिवहन: {{pickup}} → {{dest}}"
  },
  "Vehicle Booked! 30% Govt subsidy (₹{{amount}}) applied. Driver: {{driver}}.": {
    TE: "వాహనం బుక్ చేయబడింది! 30% ప్రభుత్వ సబ్సిడీ (₹{{amount}}) వర్తింపజేయబడింది. డ్రైవర్: {{driver}}.",
    HI: "वाहन बुक हो गया! 30% सरकारी सब्सिडी (₹{{amount}}) लागू। चालक: {{driver}}।"
  },
  "Weather synced with farm GPS ({{lat}}°N, {{lon}}°E)": {
    TE: "పొలం GPS ఆధారంగా వాతావరణం సమకాలీకరించబడింది ({{lat}}°N, {{lon}}°E)",
    HI: "खेत जीपीएस ({{lat}}°N, {{lon}}°E) के साथ मौसम समन्वयित"
  },
  "Welcome {{name}} ({{role}})!": {
    TE: "స్వాగతం {{name}} ({{role}} గారు)!",
    HI: "स्वागत है {{name}} ({{role}})!"
  },
  "Welcome back, {{name}}.": {
    TE: "స్వాగతం, {{name}} గారు.",
    HI: "वापसी पर स्वागत है, {{name}}।"
  }
};

// 2. Load existing translations
const transSrc = fs.readFileSync('client/src/lib/translations.ts', 'utf8');

function extractDict(lang) {
  const dict = {};
  const blockRegex = new RegExp(`['"]?${lang}['"]?\\s*:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'g');
  let match;
  while ((match = blockRegex.exec(transSrc)) !== null) {
    const block = match[1];
    const pairRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    let p;
    while ((p = pairRegex.exec(block)) !== null) {
      dict[p[1].replace(/\\"/g, '"')] = p[2].replace(/\\"/g, '"');
    }
  }
  return dict;
}

const teExisting = extractDict('TE');
const hiExisting = extractDict('HI');

// 3. Merge everything into master EN, TE, HI maps
const masterEN = {};
const masterTE = { ...teExisting };
const masterHI = { ...hiExisting };

// Add all new translations
for (const [key, val] of Object.entries(NEW_TRANSLATIONS)) {
  masterTE[key] = val.TE;
  masterHI[key] = val.HI;
}

// Ensure all keys in TE & HI are represented in EN (identity mapping)
const allKeys = new Set([...Object.keys(masterTE), ...Object.keys(masterHI)]);

for (const k of allKeys) {
  masterEN[k] = k;
  if (!masterTE[k]) masterTE[k] = masterHI[k] || k;
  if (!masterHI[k]) masterHI[k] = masterTE[k] || k;
}

console.log(`Master Dictionary Compiled:`);
console.log(`- EN keys: ${Object.keys(masterEN).length}`);
console.log(`- TE keys: ${Object.keys(masterTE).length}`);
console.log(`- HI keys: ${Object.keys(masterHI).length}`);

// 4. Ensure output directory exists
const localesDir = path.join(__dirname, '..', 'client', 'src', 'locales');
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

// 5. Write JSON files
fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify(masterEN, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'te.json'), JSON.stringify(masterTE, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'hi.json'), JSON.stringify(masterHI, null, 2), 'utf8');

console.log('Successfully written en.json, te.json, hi.json to client/src/locales/');
