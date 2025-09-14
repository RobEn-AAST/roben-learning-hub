export function RobenLogo() {
  return (
    <div className="flex items-center space-x-2">
      {/* You can replace this with an actual image */}
      <img 
        src="/assets/roben-logo.png" 
        alt="Roben Learning" 
        width={40} 
        height={40}
        className="object-contain"
        onError={(e) => {
          // Fallback to text logo if image fails to load
          e.currentTarget.style.display = 'none';
          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
          if (nextElement) nextElement.style.display = 'block';
        }}
      />
      {/* Fallback text logo */}
      <div className="hidden font-bold text-2xl text-blue-600">
        Roben
      </div>
      <span className="font-semibold text-lg text-gray-800">Learning</span>
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