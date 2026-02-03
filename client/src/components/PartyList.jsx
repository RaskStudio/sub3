import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function PartyList() {
  const [parties, setParties] = useState([])
  const [newPartyName, setNewPartyName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const fetchParties = async () => {
    try {
      const res = await fetch('/api/parties')
      const data = await res.json()
      if (data.data) setParties(data.data)
    } catch (err) { console.error(err) }
  }

  useEffect(() => { fetchParties() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newPartyName) return
    try {
      await fetch('/api/parties', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: newPartyName})
      })
      setNewPartyName('')
      setShowInput(false)
      fetchParties()
    } catch (err) { alert(err) }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-32">
      <div className="max-w-md mx-auto pt-4">
        
        {/* HEADER */}
        <header className="text-center mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/50 block mb-2">Oversigt</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Dine Fester</h1>
        </header>

        {/* INPUT SECTION */}
        <div className="mb-8">
          {showInput ? (
            <form onSubmit={handleCreate} className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl animate-fade-in relative">
              <button 
                type="button" 
                onClick={() => setShowInput(false)} 
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >✕</button>
              
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-2 mb-1 block tracking-wider">Navngiv festen</label>
              <input 
                autoFocus
                type="text" 
                value={newPartyName}
                onChange={e => setNewPartyName(e.target.value)}
                placeholder="F.eks. Julefrokost 24"
                className="w-full pl-4 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-yellow-500 outline-none transition text-lg font-bold mb-4"
              />
              <button type="submit" className="w-full bg-yellow-500 py-3 rounded-xl font-black text-slate-900 uppercase tracking-widest shadow-md border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all">Opret Fest</button>
            </form>
          ) : (
            <button 
              onClick={() => setShowInput(true)}
              className="w-full py-5 border-2 border-dashed border-slate-700/50 text-slate-500 rounded-3xl hover:border-yellow-500/50 hover:text-yellow-500 hover:bg-slate-800/50 transition font-bold uppercase tracking-widest flex items-center justify-center gap-2 group"
            >
              <span className="text-2xl group-hover:scale-110 transition">+</span> Ny Fest
            </button>
          )}
        </div>

        {/* LISTE */}
        <div className="space-y-3">
          {parties.map(party => (
            <Link to={`/fest/${party.id}`} key={party.id} className="block group">
              <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex justify-between items-center hover:bg-slate-800 hover:border-slate-600 transition-all shadow-sm active:scale-[0.98]">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition leading-tight">{party.name}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1 opacity-60">
                    {new Date(party.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:border-slate-500 transition">
                  →
                </div>
              </div>
            </Link>
          ))}
          
          {parties.length === 0 && !showInput && (
            <div className="text-center py-12 text-slate-600 text-sm font-medium">Ingen fester endnu. Sæt i gang! 🚀</div>
          )}
        </div>

      </div>
    </div>
  )
}

export default PartyList