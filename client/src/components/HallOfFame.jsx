import { useState, useEffect } from 'react'

function HallOfFame() {
  const [attempts, setAttempts] = useState([])

  const fetchTop10 = async () => {
    try {
      const res = await fetch('/api/halloffame')
      const data = await res.json()
      if (data.data) setAttempts(data.data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchTop10() }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-32">
      <div className="max-w-md mx-auto pt-4">
        
        {/* HEADER */}
        <header className="text-center mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/50 block mb-2">Global Top 10</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Hall of Fame</h1>
        </header>

        {/* LISTE */}
        <div className="space-y-3">
          {attempts.map((a, i) => (
            <div key={a.id} className={`p-4 rounded-2xl flex items-center justify-between border relative overflow-hidden ${i===0 ? 'bg-gradient-to-r from-yellow-900/40 to-slate-800 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'bg-slate-800/40 border-slate-700/50'}`}>
               
               {/* Rank Badge */}
               <div className="flex items-center gap-4 z-10">
                 <div className={`w-8 text-center text-2xl font-black ${i===0?'text-yellow-400':i===1?'text-slate-300':i===2?'text-orange-400':'text-slate-600'}`}>
                   #{i+1}
                 </div>
                 
                 {/* Avatar */}
                 <div className="relative">
                   {a.image_url ? (
                     <img src={a.image_url} className="w-12 h-12 rounded-xl object-cover bg-slate-700 border border-slate-600 shadow-md"/>
                   ) : (
                     <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 text-xl border border-slate-600">👤</div>
                   )}
                   {/* Guld krone på 1. pladsen */}
                   {i===0 && <span className="absolute -top-3 -right-2 text-xl drop-shadow-md rotate-12">👑</span>}
                 </div>

                 <div>
                   <p className="font-bold text-white text-lg leading-tight">{a.name}</p>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{a.partyName || 'Ukendt Fest'}</p>
                 </div>
               </div>

               {/* Tid */}
               <div className="text-right z-10">
                 <span className={`font-mono font-black text-3xl ${a.time<3?'text-green-400':'text-slate-200'}`}>{a.time.toFixed(2)}s</span>
               </div>
            </div>
          ))}

          {attempts.length === 0 && (
            <div className="text-center py-20 text-slate-600 text-sm font-medium">Ingen rekorder endnu. Bliver du den første? 🏆</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HallOfFame