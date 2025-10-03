export function RobenLogo() {
  return (
    <div className="flex items-center justify-center w-full">
      <img 
        src="/assets/roben-logo.png" 
        alt="Roben Logo" 
        width={64} 
        height={64}
        className="object-contain mx-auto"
      />
    </div>
  );
}

// Alternative: Pure SVG logo (you can customize this)
export function RobenLogoSVG() {
  return (
    <div className="flex items-center space-x-2">
      <svg 
        width="40" 
        height="40" 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="text-blue-600"
      >
        {/* Simple R letter design */}
        <rect width="40" height="40" rx="8" fill="currentColor"/>
        <path 
          d="M12 10h8c3 0 5 2 5 5s-2 5-5 5h-3l5 8h-4l-4-7h-2v7h-3V10z M15 13v7h5c1.5 0 2.5-1 2.5-2.5S21.5 15 20 15h-5z" 
          fill="white"
        />
      </svg>
      <span className="font-bold text-xl text-gray-800">Roben Learning</span>
    </div>
  );
}