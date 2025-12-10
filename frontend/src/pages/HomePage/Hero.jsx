import { useState, useEffect } from 'react';
import { heroSlides } from "../../data/index.js";

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative text-white overflow-hidden min-h-[550px] flex items-center group">
      {/* 1. Base Gradient Background (Static) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0050] via-[#400080] to-[#1a0033] opacity-90 transition-colors duration-1000"></div>
      
      {/* 2. Subtle Dot Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, #F9E400 1px, transparent 1px)',
          backgroundSize: '32px 32px' 
        }}
      ></div>

      {/* 3. Floating Light Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7C00FE]/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F5004F]/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 4. Sliding Content Container */}
      <div className="container mx-auto px-4 relative z-10 h-full">
        <div 
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
        {heroSlides.map((slide) => (
            <div key={slide.id} className="w-full shrink-0 flex flex-col md:flex-row items-center justify-between p-10">
            
            {/* Text Section */}
            <div className="max-w-2xl mb-10 md:mb-0 pr-4">
                <div className={`inline-block bg-white/10 backdrop-blur-md text-[#F9E400] text-xs font-bold px-3 py-1 rounded-full mb-6 border border-[#F9E400]/40 shadow-lg ${slide.shadow}`}>
                ● {slide.tag}
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight drop-shadow-lg">
                {slide.title} <br/>
                <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.gradient} filter drop-shadow-sm`}>
                    {slide.highlight}
                </span>
                </h1>
                <p className="text-lg text-stone-200 mb-8 max-w-lg font-light leading-relaxed drop-shadow-md">
                {slide.description}
                </p>
                <div className="flex gap-4">
                <button className="bg-[#F5004F] hover:bg-[#d00043] text-white px-8 py-3.5 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-xl shadow-[#F5004F]/30">
                    Start Bidding
                </button>
                <button className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-3.5 rounded-full font-bold text-lg border border-white/30 transition-all hover:border-[#F9E400]/50">
                    Sell Item
                </button>
                </div>
            </div>

            {/* Floating Image Section */}
            <div className="w-full md:w-1/2 flex justify-center md:justify-end relative h-[350px] md:h-[400px]">
                <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                    src={slide.image}
                    alt="Abstract Shape" 
                    className="max-h-full max-w-full object-contain drop-shadow-2xl animate-float mix-blend-screen opacity-90"
                    style={{ 
                        maskImage: 'radial-gradient(circle, black 60%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 100%)'
                    }}
                    />
                </div>
            </div>

            </div>
        ))}
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'bg-[#F9E400] w-8' : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};