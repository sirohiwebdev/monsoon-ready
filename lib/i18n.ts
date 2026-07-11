import type { Lang, Severity } from "./types";

// Static UI strings. The LLM writes the plan content natively; these cover the
// chrome (labels, buttons, section titles) so the whole screen speaks one language.

export interface UIStrings {
  tagline: string;
  useLocation: string;
  locating: string;
  areaPlaceholder: string;
  household: string;
  people: (n: number) => string;
  floorLabel: string;
  inHome: string;
  groundFloor: string;
  upperFloor: string;
  kids: string;
  elderly: string;
  vehicle: string;
  pets: string;
  language: string;
  cta: string;
  regenerate: string;
  adjustTitle: string;
  initialTitle: string;
  newPlan: string;
  loading: (place: string) => string[];
  locatingWeather: string[];
  sections: Record<"do_now" | "prepare" | "avoid" | "kit" | "contacts", string>;
  severityLabel: Record<Severity, string>;
  peakLabel: string;
  chatTitle: string;
  chatPlaceholder: string;
  chatSend: string;
  chatThinking: string;
  needLocation: string;
  checkArea: string;
  changeLocation: string;
  updated: string;
  refresh: string;
  emergencyTitle: string;
  moreNumbers: (n: number) => string;
  advisoryTitle: string;
  activeUntil: string;
  sourceLabel: string;
  noAdvisories: string;
  emptyPlanPrompt: string;
  copyPlan: string;
  copied: string;
  printPlan: string;
  planTitle: string;
}

export const STRINGS: Record<Lang, UIStrings> = {
  en: {
    tagline: "Your personal monsoon safety plan",
    useLocation: "Use my location",
    locating: "Locating…",
    areaPlaceholder: "or type your area (e.g. Kothrud, Pune)",
    household: "Household",
    people: (n) => (n === 1 ? "person" : "people"),
    floorLabel: "Floor",
    inHome: "In your home",
    groundFloor: "Ground floor",
    upperFloor: "Upper floor",
    kids: "Kids",
    elderly: "Elderly",
    vehicle: "Vehicle",
    pets: "Pets",
    language: "Language",
    cta: "Get my safety plan",
    regenerate: "Regenerate plan",
    adjustTitle: "Adjust & regenerate",
    initialTitle: "Your household",
    newPlan: "New plan",
    loading: (place) => [
      `Reading the sky over ${place}…`,
      "Weighing your household…",
      "Building your plan…",
    ],
    locatingWeather: ["Finding your area…", "Checking live weather…"],
    sections: {
      do_now: "Do now",
      prepare: "Prepare",
      avoid: "Avoid",
      kit: "Emergency kit",
      contacts: "Who to call",
    },
    severityLabel: {
      low: "Low risk",
      moderate: "Moderate risk",
      high: "High risk",
      severe: "Severe risk",
    },
    peakLabel: "Peak rain",
    chatTitle: "Ask MonsoonReady",
    chatPlaceholder: "Ask anything (e.g. water is entering my building)",
    chatSend: "Send",
    chatThinking: "Thinking…",
    needLocation: "Please enter your area or use your location.",
    checkArea: "Check my area",
    changeLocation: "Change location",
    updated: "Updated",
    refresh: "Refresh",
    emergencyTitle: "Emergency",
    moreNumbers: (n) => `More numbers (${n})`,
    advisoryTitle: "Official advisories",
    activeUntil: "Active until",
    sourceLabel: "Source",
    noAdvisories: "No official weather advisories for your area right now.",
    emptyPlanPrompt:
      "Fill in your household details and tap Get my safety plan to see a personalized action plan here.",
    copyPlan: "Copy plan",
    copied: "Copied!",
    printPlan: "Export",
    planTitle: "Monsoon Safety Plan",
  },
  hi: {
    tagline: "आपकी अपनी मानसून सुरक्षा योजना",
    useLocation: "मेरा स्थान उपयोग करें",
    locating: "स्थान खोज रहे हैं…",
    areaPlaceholder: "या अपना क्षेत्र लिखें (जैसे कोथरुड, पुणे)",
    household: "परिवार",
    people: (n) => (n === 1 ? "व्यक्ति" : "लोग"),
    floorLabel: "मंज़िल",
    inHome: "आपके घर में",
    groundFloor: "भूतल",
    upperFloor: "ऊपरी मंज़िल",
    kids: "बच्चे",
    elderly: "बुज़ुर्ग",
    vehicle: "वाहन",
    pets: "पालतू",
    language: "भाषा",
    cta: "मेरी सुरक्षा योजना पाएं",
    regenerate: "योजना फिर बनाएं",
    adjustTitle: "बदलें और फिर बनाएं",
    initialTitle: "आपका परिवार",
    newPlan: "नई योजना",
    loading: (place) => [
      `${place} के आसमान को पढ़ रहे हैं…`,
      "आपके परिवार का ध्यान रख रहे हैं…",
      "आपकी योजना बना रहे हैं…",
    ],
    locatingWeather: ["आपका क्षेत्र खोज रहे हैं…", "लाइव मौसम जांच रहे हैं…"],
    sections: {
      do_now: "अभी करें",
      prepare: "तैयारी करें",
      avoid: "इनसे बचें",
      kit: "आपातकालीन किट",
      contacts: "किसे कॉल करें",
    },
    severityLabel: {
      low: "कम जोखिम",
      moderate: "मध्यम जोखिम",
      high: "उच्च जोखिम",
      severe: "गंभीर जोखिम",
    },
    peakLabel: "तेज़ बारिश",
    chatTitle: "MonsoonReady से पूछें",
    chatPlaceholder: "कुछ भी पूछें (जैसे मेरी इमारत में पानी आ रहा है)",
    chatSend: "भेजें",
    chatThinking: "सोच रहे हैं…",
    needLocation: "कृपया अपना क्षेत्र दर्ज करें या स्थान का उपयोग करें।",
    checkArea: "मेरा क्षेत्र देखें",
    changeLocation: "स्थान बदलें",
    updated: "अपडेट किया गया",
    refresh: "रीफ्रेश करें",
    emergencyTitle: "आपातकालीन",
    moreNumbers: (n) => `और नंबर (${n})`,
    advisoryTitle: "आधिकारिक सूचनाएं",
    activeUntil: "तक सक्रिय",
    sourceLabel: "स्रोत",
    noAdvisories: "अभी आपके क्षेत्र के लिए कोई आधिकारिक मौसम चेतावनी नहीं है।",
    emptyPlanPrompt:
      "अपने परिवार का विवरण भरें और अपनी सुरक्षा योजना पाएं पर टैप करें — यहां आपकी व्यक्तिगत योजना दिखाई देगी।",
    copyPlan: "योजना कॉपी करें",
    copied: "कॉपी हुई!",
    printPlan: "निर्यात",
    planTitle: "मानसून सुरक्षा योजना",
  },
  mr: {
    tagline: "तुमची स्वतःची पावसाळी सुरक्षा योजना",
    useLocation: "माझे स्थान वापरा",
    locating: "स्थान शोधत आहोत…",
    areaPlaceholder: "किंवा तुमचा भाग लिहा (उदा. कोथरूड, पुणे)",
    household: "कुटुंब",
    people: (n) => (n === 1 ? "व्यक्ती" : "माणसे"),
    floorLabel: "मजला",
    inHome: "तुमच्या घरात",
    groundFloor: "तळमजला",
    upperFloor: "वरचा मजला",
    kids: "मुले",
    elderly: "ज्येष्ठ",
    vehicle: "वाहन",
    pets: "पाळीव प्राणी",
    language: "भाषा",
    cta: "माझी सुरक्षा योजना मिळवा",
    regenerate: "योजना पुन्हा तयार करा",
    adjustTitle: "बदला आणि पुन्हा तयार करा",
    initialTitle: "तुमचे कुटुंब",
    newPlan: "नवीन योजना",
    loading: (place) => [
      `${place} वरील आकाश वाचत आहोत…`,
      "तुमच्या कुटुंबाचा विचार करत आहोत…",
      "तुमची योजना तयार करत आहोत…",
    ],
    locatingWeather: ["तुमचा भाग शोधत आहोत…", "लाइव हवामान तपासत आहोत…"],
    sections: {
      do_now: "आत्ता करा",
      prepare: "तयारी करा",
      avoid: "हे टाळा",
      kit: "आपत्कालीन किट",
      contacts: "कोणाला कॉल करावे",
    },
    severityLabel: {
      low: "कमी धोका",
      moderate: "मध्यम धोका",
      high: "जास्त धोका",
      severe: "गंभीर धोका",
    },
    peakLabel: "जोरदार पाऊस",
    chatTitle: "MonsoonReady ला विचारा",
    chatPlaceholder: "काहीही विचारा (उदा. माझ्या इमारतीत पाणी शिरत आहे)",
    chatSend: "पाठवा",
    chatThinking: "विचार करत आहोत…",
    needLocation: "कृपया तुमचा भाग टाका किंवा स्थान वापरा.",
    checkArea: "माझा भाग तपासा",
    changeLocation: "स्थान बदला",
    updated: "अपडेट केले",
    refresh: "रिफ्रेश करा",
    emergencyTitle: "आपत्कालीन",
    moreNumbers: (n) => `आणखी क्रमांक (${n})`,
    advisoryTitle: "अधिकृत सूचना",
    activeUntil: "पर्यंत सक्रिय",
    sourceLabel: "स्रोत",
    noAdvisories: "सध्या तुमच्या भागासाठी कोणतीही अधिकृत हवामान सूचना नाही.",
    emptyPlanPrompt:
      "तुमच्या कुटुंबाचे तपशील भरा आणि माझी सुरक्षा योजना मिळवा वर टॅप करा — तुमची वैयक्तिक योजना इथे दिसेल.",
    copyPlan: "योजना कॉपी करा",
    copied: "कॉपी झाली!",
    printPlan: "निर्यात",
    planTitle: "पावसाळी सुरक्षा योजना",
  },
};
