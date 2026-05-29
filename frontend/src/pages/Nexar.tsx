import { useState } from "react";
import {
  ChevronDown,
  User,
  Mic,
  Phone,
  Bell,
  Play,
  BarChart2,
  Sparkles,
  Pencil,
  Plus
} from "lucide-react";
import { TaskCard } from "../components/TaskCard";

export default function Nexar() {
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [activeTab, setActiveTab] = useState("Workspace");

  // Crew avatar URLs
  const crewAvatars = [
    "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260403_075317_744395c6-7168-48c6-a1f6-5b9b7bd58f87.png&w=1280&q=85",
    "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260403_075333_2caea84e-742e-4846-9284-ed8532c44c99.png&w=1280&q=85",
    "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260403_075354_70a33cfd-3c9c-45ef-a7bb-d371cb8aa0af.png&w=1280&q=85",
  ];

  // Audio wave heights from specification
  const waveHeights = [
    8, 16, 12, 28, 20, 36, 42, 24, 40, 16, 44, 32, 48, 28, 20, 36, 14, 32, 22, 40,
    18, 30, 12, 26, 16, 34, 20, 38, 24, 28, 16, 22, 12, 20, 8
  ];

  return (
    <div className="opspulse-dashboard min-h-screen relative p-4 sm:p-6 lg:p-8 overflow-x-hidden font-sans text-neutral-900">
      
      {/* ── Fullscreen Looping Background Video ── */}
      <div className="fixed inset-0 z-[-10] w-full h-full pointer-events-none overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_054410_6b17f7f9-d11e-44f1-90b0-75ee563d1971.mp4"
            type="video/mp4"
          />
        </video>
        {/* Soft layout overlay for premium readability */}
        <div className="absolute inset-0 bg-neutral-950/20" />
      </div>

      {/* ── Main Layout Wrapper ── */}
      <div className="max-w-[1800px] mx-auto space-y-6 sm:space-y-8">

        {/* ── Header: Floating White Pill Bar ── */}
        <header
          className="bg-white rounded-full px-4 sm:px-6 py-2 sm:py-3 shadow-sm border border-neutral-100 flex items-center justify-between animate-fade-up pointer-events-auto"
          style={{ animationDelay: "0s" }}
        >
          {/* Left: Brand Logo & Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center p-2.5 shadow-md flex-shrink-0">
              {/* 2x2 grid of white rounded dots inside */}
              <div className="grid grid-cols-2 gap-1 w-full h-full">
                <div className="bg-white rounded-sm w-full h-full" />
                <div className="bg-white rounded-sm w-full h-full" />
                <div className="bg-white rounded-sm w-full h-full" />
                <div className="bg-white rounded-sm w-full h-full" />
              </div>
            </div>
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-black font-serif-display">
              nexar
            </span>
          </div>

          {/* Center Nav Link Nodes */}
          <div className="hidden lg:flex items-center gap-1.5 bg-neutral-100/80 p-1 rounded-full border border-neutral-200/50">
            {["Workspace", "Actions", "Performance", "AI Insights"].map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === item
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right Section: Solo/Crew toggle, Notification bell */}
          <div className="flex items-center gap-4">
            {/* Solo vs Crew Toggle */}
            <div className="flex items-center bg-gray-100 p-1 rounded-full border border-neutral-200">
              <button
                onClick={() => setIsSoloMode(true)}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  isSoloMode
                    ? "bg-white text-black shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Solo
              </button>
              <button
                onClick={() => setIsSoloMode(false)}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  !isSoloMode
                    ? "bg-black text-white rounded-full shadow-md"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Crew
              </button>
            </div>

            {/* Notification Bell */}
            <button className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white border border-neutral-800 shadow-sm relative active:scale-95 transition-all">
              <Bell className="w-4 h-4 fill-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* ── Section Header Row (below header) ── */}
        <section
          className="border-b border-black/10 pb-4 sm:pb-6 mb-4 sm:mb-6 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left side: Avatar and greeting */}
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white shadow-md">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold text-gray-900 leading-tight font-serif-display text-left">
                Hey, Alex!
              </h2>
            </div>

            {/* Center side: Label indicator */}
            <div className="hidden md:block md:col-span-4 text-center">
              <span className="text-[20px] sm:text-[24px] lg:text-[26px] tracking-[-0.04em] font-medium text-gray-800">
                Active Items
              </span>
            </div>

            {/* Right side: Crew image deck */}
            <div className="md:col-span-4 flex items-center justify-end gap-3">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-500">
                Crew:
              </span>
              <div className="flex items-center">
                <div className="flex -space-x-2.5">
                  {crewAvatars.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Team member"
                      className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                  ))}
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-white ml-2 shadow-sm">
                  +9
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main Dashboard 3-Column Responsive Grid ── */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-7">
          
          {/* ── Left Column ── */}
          <aside
            className="lg:col-span-3 space-y-6 animate-fade-up text-left"
            style={{ animationDelay: "0.15s" }}
          >
            {/* Project Selector Pill */}
            <div className="bg-[#DBECFC] rounded-full p-2.5 pl-3.5 pr-5 border border-[#C5DFF8] shadow-sm flex items-center justify-between hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                {/* Yellow X inside white circle */}
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-yellow-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#EAB308"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight leading-tight">
                    Zenith Launch
                  </h4>
                  <span className="text-[10px] text-[#597897] font-semibold uppercase tracking-wider block leading-none mt-0.5">
                    Product & Strategy
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </div>

            {/* Productivity Score */}
            <div className="p-1 sm:p-2">
              <h1 className="text-[80px] sm:text-[100px] lg:text-[120px] xl:text-[140px] tracking-[-0.04em] font-black text-black leading-none font-sans">
                85%
              </h1>
              <p className="text-xs uppercase tracking-widest font-black text-gray-500 mt-1 pl-1">
                Current efficiency
              </p>
            </div>

            {/* Sprint Metrics Card */}
            <div className="bg-white rounded-[20px] sm:rounded-[28px] overflow-visible border border-neutral-100 shadow-sm relative transition-all hover:shadow-md">
              {/* Rounded card with background image */}
              <div
                className="h-44 w-full rounded-t-[20px] sm:rounded-t-[28px] bg-cover bg-top-center relative"
                style={{
                  backgroundImage: `url("https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260403_055416_630ff6c1-4b72-4cb6-a563-0c7e41124fe1.png&w=1280&q=85")`,
                }}
              >
                {/* Soft backdrop overlay */}
                <div className="absolute inset-0 bg-neutral-900/10 rounded-t-[20px] sm:rounded-t-[28px]" />
                
                {/* Sprint Metrics Header */}
                <div className="absolute inset-x-0 top-4 px-5 flex items-center justify-between z-10">
                  <h3 className="text-white text-lg font-black tracking-tight drop-shadow-sm">
                    Sprint Metrics
                  </h3>
                  <span className="px-2.5 py-0.5 bg-white/30 backdrop-blur-md rounded-full text-[10px] font-black uppercase text-white tracking-wider border border-white/20">
                    Analytics
                  </span>
                </div>
              </div>

              {/* Card Stats Grid */}
              <div className="p-5 pt-6 pb-9 border-t border-neutral-100">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="block text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight leading-tight">
                      26h
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5">
                      Sessions
                    </span>
                  </div>
                  <div className="border-l border-neutral-100 pl-3">
                    <span className="block text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight leading-tight">
                      11h
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5">
                      Standups
                    </span>
                  </div>
                  <div className="border-l border-neutral-100 pl-3">
                    <span className="block text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight leading-tight">
                      6h
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5">
                      Audits
                    </span>
                  </div>
                </div>
              </div>

              {/* Absolutely positioned white floating circle button at bottom center */}
              <button className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-900 border border-neutral-200/80 shadow-md hover:bg-neutral-50 active:scale-95 transition-all z-20">
                <Pencil className="w-4 h-4 text-gray-800" />
              </button>
            </div>
          </aside>

          {/* ── Center Column: Task Cards ── */}
          <main className="lg:col-span-6 space-y-5 flex flex-col justify-start">
            <div className="lg:w-[85%] xl:w-[85%] 2xl:w-[60%] mx-auto w-full space-y-5">
              
              {/* Card 1 - Sprint Planning Call */}
              <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <TaskCard
                  icon={Phone}
                  title="Sprint Planning Call"
                  tagText="Session"
                  tagColor="green"
                  details={[
                    { label: "Time", value: "Today: 10:00 AM" },
                    { label: "With", value: "Product & Growth" },
                    { label: "Alert", value: "15 min" },
                  ]}
                  bottomLeftContent={
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {crewAvatars.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="avatar"
                            className="w-5 h-5 rounded-full border border-white object-cover"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-white w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center">
                        +7
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold ml-1.5">
                        Set to begin?
                      </span>
                    </div>
                  }
                  buttonText="Enter session"
                  buttonVariant="dark"
                />
              </div>

              {/* Card 2 - Layout Critique (Rotated 2 degrees) */}
              <div
                className="animate-fade-up rotate-[2deg] transform transition-transform duration-300 hover:rotate-0"
                style={{ animationDelay: "0.25s" }}
              >
                <TaskCard
                  icon={BarChart2}
                  title="Layout Critique"
                  tagText="Action"
                  tagColor="yellow"
                  details={[
                    { label: "Focus", value: "Zenith Platform" },
                    { label: "Details", value: "Verify the layout of landing screen" },
                    { label: "Due By", value: "Mar 22" },
                  ]}
                  bottomLeftContent={
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 font-semibold mr-1.5">
                        Assignees:
                      </span>
                      <div className="flex -space-x-1.5">
                        {crewAvatars.slice(0, 2).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="avatar"
                            className="w-5 h-5 rounded-full border border-white object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  }
                  buttonText="Let AI begin"
                  buttonVariant="black"
                  buttonIcon={<Sparkles className="w-3.5 h-3.5 fill-white" />}
                />
              </div>

              {/* Card 3 - Zenith Crew Check */}
              <div className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
                <TaskCard
                  icon={Phone}
                  title="Zenith Crew Check"
                  tagText="Session"
                  tagColor="green"
                  details={[
                    { label: "Time", value: "Fri: 5:30 PM" },
                    { label: "With", value: "Sales Lead & Team" },
                    { label: "Alert", value: "10 min" },
                  ]}
                  bottomLeftContent={
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {crewAvatars.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="avatar"
                            className="w-5 h-5 rounded-full border border-white object-cover"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-white w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center">
                        +5
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold ml-1.5">
                        Scheduled
                      </span>
                    </div>
                  }
                  buttonText="Show details"
                  buttonVariant="light"
                />
              </div>
            </div>
          </main>

          {/* ── Right Column ── */}
          <aside
            className="lg:col-span-3 space-y-6 animate-fade-up text-left"
            style={{ animationDelay: "0.35s" }}
          >
            {/* Fast Commands List */}
            <div className="bg-white rounded-[28px] p-5 shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-neutral-100 rounded-full flex items-center justify-center text-gray-900 text-xs shadow-sm">
                    ⭐
                  </div>
                  <h3 className="text-[20px] sm:text-[24px] lg:text-[26px] xl:text-[30px] font-bold tracking-[-0.04em] text-gray-900">
                    Fast commands
                  </h3>
                </div>
                <button className="flex items-center gap-1 text-[11px] font-bold text-gray-900 px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-all border border-neutral-200/50">
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              {/* Command Items List */}
              <div className="space-y-1.5">
                {[
                  "Review session notes and extract key discussion insights",
                  "Generate PDF report with finished items from this week",
                  "Update timeline view based on revised action items in sprint"
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 border-t border-black/10 gap-3 group cursor-pointer hover:bg-neutral-50/50 px-2 rounded-xl transition-all"
                  >
                    <p className="text-xs sm:text-sm font-medium text-gray-700 leading-tight group-hover:text-gray-900">
                      {item}
                    </p>
                    <button className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0 hover:bg-black active:scale-95 shadow-sm transition-all">
                      <Play className="w-3.5 h-3.5 fill-gray-700 stroke-gray-700 ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Voice Input Card */}
            <div className="bg-[#DBECFC] rounded-[28px] p-5 shadow-sm border border-[#C5DFF8] relative overflow-hidden flex flex-col justify-between">
              <div>
                {/* Audio Input Blue Pill Badge */}
                <div className="flex pb-4">
                  <span className="px-3.5 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-sm">
                    Audio Input
                  </span>
                </div>

                {/* Speak now heading display */}
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight font-serif-display">
                  Speak now to Nexar!
                </h3>
              </div>

              {/* Audio Waveform visualization */}
              <div className="flex items-end justify-between gap-[3px] py-12 px-2 overflow-hidden h-24">
                {waveHeights.map((h, idx) => {
                  const pixelHeight = h * 0.8;
                  return (
                    <div
                      key={idx}
                      className="w-0.5 bg-blue-400 rounded-full flex-1 transition-all duration-300"
                      style={{ height: `${pixelHeight}px` }}
                    />
                  );
                })}
              </div>

              {/* White floating microphone button at bottom center */}
              <div className="flex justify-center pb-4 pt-2">
                <button className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-md border border-[#DBECFC]/50 hover:bg-neutral-50 active:scale-95 transition-all">
                  <Mic className="w-4.5 h-4.5 fill-blue-500 stroke-blue-500" />
                </button>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
