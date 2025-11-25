import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Briefcase, Coffee, ChevronRight, RefreshCw, Star, Volume2, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

// --- Gemini API Configuration ---
const apiKey = "AIzaSyCvemWugOF0jK7nLvmi0kkz57ZzExRcfns"; // 运行时环境会自动注入 Key，如果你在本地运行，请填入你的 Key
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// --- Topics for Randomness ---
// 通过预设具体的场景，强制 AI 每次生成不同维度的内容
const SUB_TOPICS = {
  business: [
    "SQL query optimization discussion",
    "Explaining a drop in KPI/metrics",
    "Asking for a budget approval",
    "Data visualization dashboard feedback",
    "Project timeline delay",
    "Quarterly Business Review (QBR) presentation",
    "Machine Learning model accuracy",
    "Stakeholder requirement gathering",
    "Cleaning messy datasets",
    "A/B testing results interpretation"
  ],
  life: [
    "Ordering coffee with specific preferences",
    "Complaining about the weather politely",
    "Making weekend plans with a colleague",
    "Asking for gym membership details",
    "Returning a defective product",
    "Discussing a popular TV show/Movie",
    "Explaining a food allergy at a restaurant",
    "Asking for directions in a complex building",
    "Rescheduling a dentist appointment",
    "Talking about travel experiences"
  ]
};

const SYSTEM_PROMPT = `
You are an expert English language coach specifically for a Chinese Data Analyst. 
Your goal is to generate single-sentence translation exercises.
The output MUST be valid JSON with this structure:
{
  "chinese": "The Chinese sentence for the user to translate.",
  "english": "The natural, high-quality English translation.",
  "keywords": [
    { "word": "English Word/Phrase", "def": "Chinese Definition" },
    { "word": "Another Word", "def": "Definition" }
  ]
}
IMPORTANT: Do not output markdown code blocks (like \`\`\`json). Just output the raw JSON string.
`;

const PROMPTS = {
  business: "Generate a sentence related to Data Analysis, Business Intelligence, or Corporate Strategy.",
  life: "Generate a sentence related to modern daily life in Western culture, casual conversation, travel, or office small talk."
};

// --- Fallback Data (Only used on Error) ---
const FALLBACK_DATA = {
  business: {
    chinese: "虽然我们的用户获取成本略有上升，但留存率相比上个季度提高了15%，这表明我们的目标用户更加精准了。",
    english: "Although our CAC has increased slightly, the retention rate is up 15% quarter-over-quarter, indicating we are targeting a more qualified audience.",
    keywords: [
      { word: "CAC", def: "用户获取成本" },
      { word: "Quarter-over-Quarter", def: "环比" },
      { word: "qualified audience", def: "精准受众" }
    ]
  },
  life: {
    chinese: "如果不喝一杯浓缩咖啡，我就无法开始新的一天。它能帮我提神，让我为早上的晨会做好准备。",
    english: "I can't start my day without a shot of espresso. It gives me a kick and gets me ready for the morning briefing.",
    keywords: [
      { word: "shot of espresso", def: "一杯浓缩咖啡" },
      { word: "give a kick", def: "提神" },
      { word: "briefing", def: "简报" }
    ]
  }
};

const App = () => {
  const [activeTab, setActiveTab] = useState('business');
  // Initialize as null so we show loading state first, NOT fallback data
  const [currentCard, setCurrentCard] = useState(null); 
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Ref to track if it's the first mount to prevent double firing in strict mode (optional but good practice)
  const hasFetched = useRef(false);

  // --- Tailwind Script Injection ---
  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      script.id = 'tailwind-script';
      document.head.appendChild(script);
    }
  }, []);

  // --- Auto-load content on Mount ---
  useEffect(() => {
    // Only fetch if we haven't successfully loaded a card yet
    if (!currentCard && !isLoading && !hasFetched.current) {
        generateContent('business');
        hasFetched.current = true;
    }
  }, []);

  // Function to call Gemini API
  const generateContent = async (type) => {
    setIsLoading(true);
    setError(null);
    setIsRevealed(false);

    try {
      // 1. Pick a random sub-topic to ensure variety
      const topics = SUB_TOPICS[type];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      // 2. Add a timestamp or random seed to the prompt to discourage caching
      const dynamicPrompt = `
        ${SYSTEM_PROMPT}
        
        Task Context: ${PROMPTS[type]}
        Specific Scenario: "${randomTopic}" (Make sure the sentence fits this specific scenario).
        
        Complexity: ${Math.random() > 0.5 ? "Intermediate" : "Advanced"}
        Tone: ${type === 'business' ? "Professional & Analytical" : "Casual & Idiomatic"}
      `;

      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: dynamicPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 1.1, // Increased temperature for high creativity/randomness
          }
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        // Clean up markdown if the model includes it (```json ... ```)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const newData = JSON.parse(text);
        setCurrentCard(newData);
      } else {
        throw new Error("No content generated");
      }

    } catch (err) {
      console.error("Generation failed:", err);
      setError("Failed to generate. Loading offline backup...");
      // Only use fallback if API fails
      setCurrentCard(FALLBACK_DATA[type]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    // When switching tabs, clear current card to show loading state, then fetch
    setCurrentCard(null); 
    generateContent(tab);
  };

  const handleNext = () => {
    generateContent(activeTab);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start pt-6 pb-6 px-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border-8 border-slate-900 relative min-h-[800px] flex flex-col">
        
        {/* iOS Status Bar */}
        <div className="h-7 w-full bg-white flex justify-between items-center px-6 pt-2 select-none">
          <span className="text-xs font-semibold text-black">9:41</span>
          <div className="flex gap-1">
             <div className="w-4 h-2.5 bg-black rounded-[1px]"></div>
             <div className="w-0.5 h-2.5 bg-black rounded-[1px]"></div>
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-white z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Daily Practice</h1>
              <p className="text-sm text-slate-500 font-medium">AI Powered • Analyst Edition</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Star size={20} fill="currentColor" className="text-blue-200" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl mb-2">
            <button
              onClick={() => handleTabChange('life')}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'life' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
              }`}
            >
              <Coffee size={16} />
              Life
            </button>
            <button
              onClick={() => handleTabChange('business')}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'business' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
              }`}
            >
              <Briefcase size={16} />
              Business
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4 relative">
          
          {/* Loading State Overlay */}
          {isLoading || !currentCard ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
                <p className="text-slate-600 font-medium animate-pulse">
                   {isLoading ? "Consulting AI Coach..." : "Initializing..."}
                </p>
                <p className="text-slate-400 text-xs mt-2">Generating unique scenario</p>
             </div>
          ) : null}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 flex items-center gap-2 text-sm z-30 relative">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Card Content - Only show if currentCard exists */}
          {currentCard && (
            <div className={`transition-all duration-500 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              
              {/* Chinese Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">Translate this</span>
                  {/* Debug: Show topic category simply if needed, helps understand variety */}
                  {/* <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md">New Scenario</span> */}
                </div>
                <h2 className="text-xl font-medium leading-relaxed text-slate-800 mb-2">
                  {currentCard.chinese}
                </h2>
                <div className="h-0.5 w-12 bg-gray-100 mt-4 rounded-full"></div>
              </div>

              {/* Interaction Area */}
              {!isRevealed ? (
                <button 
                  onClick={() => setIsRevealed(true)}
                  className="w-full py-4 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
                >
                  <BookOpen size={20} />
                  Reveal Answer
                </button>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* English Card */}
                  <div className="bg-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-200 text-white mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                      <Briefcase size={80} />
                    </div>
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">English</span>
                      <Volume2 className="text-indigo-200 cursor-pointer hover:text-white" size={20} />
                    </div>
                    <p className="text-lg font-medium leading-relaxed relative z-10">
                      {currentCard.english}
                    </p>
                  </div>

                  {/* Keywords */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-24">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                      <div className="p-1.5 bg-yellow-100 rounded-md text-yellow-700">
                        <Star size={14} fill="currentColor" />
                      </div>
                      <h3 className="font-semibold text-slate-700">Key Vocabulary</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {currentCard.keywords.map((kw, idx) => (
                        <div key={idx} className="group">
                          <p className="font-bold text-indigo-600 text-sm mb-0.5">{kw.word}</p>
                          <p className="text-slate-600 text-sm leading-snug">{kw.def}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        {isRevealed && !isLoading && (
          <div className="absolute bottom-6 left-0 right-0 px-6 z-20 animate-in fade-in duration-300">
            <button 
              onClick={handleNext}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-xl flex items-center justify-between px-6 transition-transform transform active:scale-[0.98]"
            >
              <span>Next Challenge</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-slate-300">New Scenario</span>
                <div className="bg-white/20 p-2 rounded-full">
                  <ArrowRight size={18} />
                </div>
              </div>
            </button>
          </div>
        )}
        
        {/* iOS Home Indicator */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-30 pointer-events-none">
          <div className="w-32 h-1 bg-slate-300 rounded-full"></div>
        </div>

      </div>
    </div>
  );
};

export default App;