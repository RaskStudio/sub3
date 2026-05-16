import { useState, useEffect } from 'react'
import Skeleton from './Skeleton'

function HallOfFame() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  const API_BASE = '/api'

  const fetchHOF = async () => {
    try {
      const res = await fetch(`${API_BASE}/halloffame`)
      const json = await res.json()
      if (json.data) {
        setAttempts(json.data)
      } else {
        setAttempts([])
      }
      setLoading(false)
    } catch (err) {
      console.error("Error fetching Hall of Fame:", err)
      setAttempts([])
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHOF()
    // Polling hver 60. sekund for Hall of Fame (behøver ikke være så ofte)
    const interval = setInterval(fetchHOF, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-32">
      <div className="max-w-md mx-auto pt-4">

        <header className="text-center mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/50 block mb-2">Alle Tider</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Hall of Fame</h1>
        </header>

        {loading ? (
          <Skeleton />
        ) : (
          <div className="space-y-3">
            {attempts.map((a, i) => (
              <div key={a.id} className={`p-4 rounded-2xl flex items-center justify-between border relative overflow-hidden ${i===0 ? 'bg-gradient-to-r from-yellow-900/40 to-slate-800 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'bg-slate-800/40 border-slate-700/50'}`}>

                 <div className="flex items-center gap-4 z-10">
                   <div className={`w-8 text-center text-2xl font-black ${i===0?'text-yellow-400':i===1?'text-slate-300':i===2?'text-orange-400':'text-slate-600'}`}>
                     #{i+1}
                   </div>

                   <div className="relative">
                     <img 
                       src={`/api/attempts/${a.id}/image`} 
                       className="w-12 h-12 rounded-xl object-cover bg-slate-700 border border-slate-600 shadow-md"
                       onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                     />
                     <div style={{display: 'none'}} className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 text-xl border border-slate-600">👤</div>
                     {i===0 && <span className="absolute -top-3 -right-2 text-xl drop-shadow-md rotate-12">👑</span>}
                   </div>

                   <div className="min-w-0">
                     <p className="font-bold text-white text-base leading-tight truncate">{a.name}</p>
                     <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 truncate">
                        {a.partyName || 'Ukendt Fest'}
                     </p>
                   </div>
                 </div>

                 <div className="text-right z-10">
                   <span className={`font-mono font-black text-3xl ${a.time<3?'text-green-400':'text-slate-200'}`}>{a.time.toFixed(2)}s</span>
                 </div>
              </div>
            ))}

            {attempts.length === 0 && (
              <div className="text-center py-20 text-slate-600 text-sm font-medium">Ingen rekorder endnu. Bliver du den første? 🏆</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HallOfFame