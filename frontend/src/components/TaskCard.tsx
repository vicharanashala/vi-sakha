import React from "react";

interface DetailItem {
  label: string;
  value: string;
}

interface TaskCardProps {
  icon: React.ComponentType<any>;
  title: string;
  tagText: string;
  tagColor: "green" | "yellow" | "red";
  details: DetailItem[];
  bottomLeftContent: React.ReactNode;
  buttonText: string;
  buttonVariant: "dark" | "light" | "black";
  buttonIcon?: React.ReactNode;
  className?: string;
}

export function TaskCard({
  icon: IconComponent,
  title,
  tagText,
  tagColor,
  details,
  bottomLeftContent,
  buttonText,
  buttonVariant,
  buttonIcon,
  className = "",
}: TaskCardProps) {
  // Map tag colors
  const tagColorClasses = {
    green: "bg-green-500 text-white",
    yellow: "bg-yellow-400 text-gray-900",
    red: "bg-red-500 text-white",
  };

  // Map button variants
  const buttonVariantClasses = {
    dark: "bg-[#ECECEC] hover:bg-[#E2E2E2] text-gray-900",
    black: "bg-black hover:bg-neutral-800 text-white",
    light: "bg-gray-100 hover:bg-gray-200 text-gray-900",
  };

  return (
    <div
      className={`bg-white rounded-[20px] sm:rounded-[28px] px-4 sm:px-6 py-4 sm:py-5 shadow-sm border border-neutral-100 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.02] ${className}`}
    >
      {/* Row 1: Icon + Title (left) & Colored Pill Tag (right) */}
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/10">
        <div className="flex items-center gap-2 sm:gap-3 text-left">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-800">
            {IconComponent && <IconComponent className="w-4.5 h-4.5" />}
          </div>
          <h4 className="text-[16px] sm:text-[18px] font-bold text-gray-900 tracking-tight leading-tight">
            {title}
          </h4>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            tagColorClasses[tagColor] || tagColorClasses.green
          }`}
        >
          {tagText}
        </span>
      </div>

      {/* Row 2: 3-column detail grid */}
      <div className="py-4 border-b border-black/10 text-left">
        <div className="grid grid-cols-3 gap-2">
          {details.map((detail, idx) => {
            const isThirdCol = idx === 2;
            return (
              <div
                key={idx}
                className={`${
                  isThirdCol ? "flex-[0.5] max-w-[120px]" : "flex-1"
                }`}
              >
                <span className="block text-[10px] sm:text-xs uppercase text-gray-400 font-semibold tracking-wider">
                  {detail.label}
                </span>
                <span className="block text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {detail.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 3: Custom bottom-left content + action button */}
      <div className="pt-3 sm:pt-4 flex items-center justify-between">
        <div className="flex-1 flex items-center">{bottomLeftContent}</div>
        <button
          className={`px-4 sm:px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
            buttonVariantClasses[buttonVariant] || buttonVariantClasses.light
          }`}
        >
          {buttonIcon && <span className="w-3.5 h-3.5 flex items-center justify-center">{buttonIcon}</span>}
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
}
