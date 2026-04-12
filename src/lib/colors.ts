// Permdal Brand Colors - Centralized Color System
export const permdalColors = {
  // Primary Brand Colors
  green: {
    50: 'hsl(158 64% 96%)',
    100: 'hsl(158 64% 88%)',
    200: 'hsl(158 64% 76%)',
    300: 'hsl(158 64% 64%)',
    400: 'hsl(158 64% 52%)',
    500: 'hsl(158 64% 40%)',
    600: 'hsl(158 64% 32%)',
    700: 'hsl(158 64% 24%)',
    800: 'hsl(158 64% 16%)',
    900: 'hsl(158 64% 8%)',
  },

  // Semantic Colors
  primary: 'hsl(158 64% 32%)', // permdal-green-600
  secondary: 'hsl(158 64% 96%)', // permdal-green-50
  accent: 'hsl(158 64% 88%)', // permdal-green-100

  // Text Colors
  text: {
    primary: 'hsl(20 14.3% 4.1%)',
    secondary: 'hsl(25 5.3% 44.7%)',
    muted: 'hsl(25 5.3% 44.7%)',
  },

  // Background Colors
  background: {
    primary: 'hsl(0 0% 100%)',
    secondary: 'hsl(158 64% 96%)',
    muted: 'hsl(158 64% 96%)',
  },

  // Border Colors
  border: {
    primary: 'hsl(158 64% 88%)',
    secondary: 'hsl(158 64% 76%)',
  },
} as const;

// CSS Custom Properties for use in CSS
export const permdalCSSVariables = `
  :root {
    /* Permdal Brand Colors */
    --permdal-green-50: 158 64% 96%;
    --permdal-green-100: 158 64% 88%;
    --permdal-green-200: 158 64% 76%;
    --permdal-green-300: 158 64% 64%;
    --permdal-green-400: 158 64% 52%;
    --permdal-green-500: 158 64% 40%;
    --permdal-green-600: 158 64% 32%;
    --permdal-green-700: 158 64% 24%;
    --permdal-green-800: 158 64% 16%;
    --permdal-green-900: 158 64% 8%;
    
    /* Semantic Colors */
    --primary: 158 64% 32%;
    --primary-foreground: 0 0% 100%;
    --secondary: 158 64% 96%;
    --secondary-foreground: 158 64% 16%;
    --muted: 158 64% 96%;
    --muted-foreground: 25 5.3% 44.7%;
    --accent: 158 64% 88%;
    --accent-foreground: 158 64% 16%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 60 9.1% 97.8%;
    --border: 158 64% 88%;
    --input: 158 64% 88%;
    --ring: 158 64% 32%;
    --background: 0 0% 100%;
    --foreground: 20 14.3% 4.1%;
    --card: 0 0% 100%;
    --card-foreground: 20 14.3% 4.1%;
    --popover: 0 0% 100%;
    --popover-foreground: 20 14.3% 4.1%;
    --radius: 0.5rem;
  }
`;

// Utility function to get color with opacity
export const withOpacity = (color: string, opacity: number) => {
  return `${color} / ${opacity}`;
};

// Common color combinations
export const colorCombinations = {
  // Navbar
  navbar: {
    background: 'bg-[#272615]',
    text: 'text-white/90',
    button: 'bg-permdal-500/15 hover:bg-permdal-500/25 border-permdal-400/40 text-earth-500',
  },

  // Cards
  card: {
    background: 'bg-permdal-50/90',
    border: 'border-permdal-100',
    hover: 'hover:shadow-md',
  },

  // Buttons
  button: {
    primary: 'bg-permdal-500 hover:bg-permdal-600 text-white',
    secondary: 'bg-lilac-100 hover:bg-lilac-200 text-lilac-800',
    outline: 'border-permdal-200 hover:bg-permdal-50 text-earth-500',
  },

  // Badges
  badge: {
    success: 'bg-permdal-100 text-permdal-700',
    warning: 'bg-lilac-100 text-lilac-700',
    error: 'bg-red-100 text-red-800',
    info: 'bg-permdal-50 text-earth-500',
  },
} as const;
