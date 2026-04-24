module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "summit-navy": "#0A1128",
        "summit-paper": "#14213D",
        "summit-surface": "#1E2A4F",
        "summit-gold": "#D4AF37",
        "summit-gold-light": "#FDB813",
        "summit-gold-dark": "#997A00",
        "summit-text": "#FFFFFF",
        "summit-text-secondary": "#B0B8C8",
        "summit-text-muted": "#7A849C",
      },
      fontFamily: {
        heading: ['"Playfair Display"', "serif"],
        body: ["Outfit", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(to bottom, rgba(10,17,40,0.3) 0%, rgba(10,17,40,0.7) 60%, #0A1128 100%)",
        "gold-gradient": "linear-gradient(135deg, #D4AF37 0%, #FDB813 50%, #D4AF37 100%)",
        "card-gradient": "linear-gradient(135deg, #14213D 0%, #0A1128 100%)",
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
