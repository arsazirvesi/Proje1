module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // === Official brand palette ===
        // Main Navy:        #27357A (RGB 39, 53, 122)
        // Dark Navy Shadow: #1B2559 (RGB 27, 37, 89)
        // Main Yellow:      #F4BE08 (RGB 244, 190, 8)
        "summit-navy": "#27357A",
        "summit-navy-dark": "#1B2559",
        "summit-navy-light": "#3A4A9A",
        "summit-paper": "#F8F9FB",
        "summit-surface": "#EDF0F5",
        "summit-card": "#FFFFFF",
        "summit-gold": "#F4BE08",
        "summit-gold-light": "#FFD333",
        "summit-gold-dark": "#C99A00",
        "summit-orange": "#27357A",
        "summit-yellow": "#F4BE08",
        "summit-accent": "#F4BE08",
        "summit-text": "#1F2937",
        "summit-text-secondary": "#4B5563",
        "summit-text-muted": "#9CA3AF",
        "summit-border": "#E5E7EB",
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', "sans-serif"],
        display: ['Poppins', "sans-serif"],
        body: ['Poppins', 'system-ui', "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(to bottom, rgba(27,37,89,0.3) 0%, rgba(27,37,89,0.7) 60%, #1B2559 100%)",
        "gold-gradient": "linear-gradient(135deg, #F4BE08 0%, #FFD333 50%, #F4BE08 100%)",
        "card-gradient": "linear-gradient(135deg, #27357A 0%, #1B2559 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.8s ease-out forwards",
        "slide-up": "slideUp 0.7s ease-out forwards",
        "slide-in-left": "slideInLeft 0.7s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        ticker: "ticker 40s linear infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(212,175,55,0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(212,175,55,0.6)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
