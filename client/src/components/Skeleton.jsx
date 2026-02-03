function Skeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] w-full">
      {/* CONTAINER der klipper alt af i bunden, så intet stikker ud */}
      <div className="relative w-24 h-48 flex items-end justify-center overflow-hidden pb-1">
        
        {/* STRÅLE */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 bg-amber-500 rounded-full z-0 animate-pour origin-top"></div>

        {/* GLAS */}
        <div className="relative w-full h-32 z-10">
          {/* MASK (Indholdet - klipper øllet af) */}
          <div className="absolute inset-0 rounded-b-2xl overflow-hidden bg-slate-800/20 backdrop-blur-sm">
            {/* ØL VÆSKE */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-amber-700 via-amber-500 to-yellow-400 animate-fill opacity-95">
               {/* BOBLER */}
               <div className="absolute bottom-4 left-4 w-1 h-1 bg-white/50 rounded-full animate-bubble"></div>
               <div className="absolute bottom-2 right-6 w-2 h-2 bg-white/50 rounded-full animate-bubble delay-200"></div>
            </div>
          </div>
          {/* RAMME (Ligger ovenpå) */}
          <div className="absolute inset-0 border-4 border-slate-300 border-t-0 rounded-b-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"></div>
          {/* SKUM */}
          <div className="absolute top-0 left-0 w-full bg-white rounded-t-lg animate-foam origin-bottom"></div>
        </div>

      </div>
      
      <style>{`
        @keyframes pour {
          0% { height: 0; opacity: 0; }
          10% { height: 100%; opacity: 1; }
          80% { height: 100%; opacity: 1; }
          90% { height: 0; opacity: 0; top: 60%; }
          100% { height: 0; opacity: 0; }
        }

        @keyframes fill {
          0% { height: 0%; }
          15% { height: 0%; }
          80% { height: 90%; }
          100% { height: 90%; }
        }

        @keyframes foam {
          0%, 75% { height: 0; opacity: 0; }
          85% { height: 15px; opacity: 1; transform: scaleX(1.1) translateY(-10px); }
          100% { height: 18px; opacity: 1; transform: scaleX(1.1) translateY(-10px); }
        }

        @keyframes bubble {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-60px); opacity: 0; }
        }

        .animate-pour { animation: pour 2s ease-in-out infinite; }
        .animate-fill { animation: fill 2s ease-in-out infinite; }
        .animate-foam { animation: foam 2s ease-in-out infinite; }
        .animate-bubble { animation: bubble 1.5s linear infinite; }
      `}</style>
    </div>
  )
}

export default Skeleton