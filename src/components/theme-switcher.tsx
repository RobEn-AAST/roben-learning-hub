"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";


// ThemeSwitcher is now a static light mode icon
const ThemeSwitcher = () => {
  return (
    <button
      type="button"
      className="bg-white text-black border border-gray-200 rounded-md p-2 flex items-center justify-center"
      style={{ width: 32, height: 32 }}
      aria-label="Light mode enabled"
      disabled
    >
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
        <path stroke="currentColor" strokeWidth="2" d="M12 1v2m0 16v2m11-9h-2M3 12H1m16.95 6.95l-1.414-1.414M6.464 6.464L5.05 5.05m12.02 0l-1.414 1.414M6.464 17.536l-1.414 1.414" />
      </svg>
    </button>
  );
};

export { ThemeSwitcher };
