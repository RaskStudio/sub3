import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Skeleton from './Skeleton'
import PinModal from './PinModal'

function PartyList() {
  const [parties, setParties] = useState([])
  const [newPartyName, setNewPartyName] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)

  const handleEditClick = () => {
    if (isEditMode) {
      setIsEditMode(false) // Slå fra uden kode
    } else {
      setShowPinModal(true) // Vis modal for at slå til
    }
  }

  const fetchParties = async () => {
    try {
      const res = await fetch('/api/parties')
      const data = await res.json()
      if (data.data) setParties(data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
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

  const handleDelete = async (e, id) => {
    e.preventDefault(); // Undgå navigation
    if (!window.confirm("Er du sikker på, at du vil slette denne fest og ALLE tider?")) return;

    try {
      const res = await fetch(`/api/parties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setParties(parties.filter(p => p.id !== id));
      } else {
        const errData = await res.json();
        alert("Fejl ved sletning: " + (errData.error || "Ukendt fejl"));
      }
    } catch (err) {
      console.error(err);
      alert("Netværksfejl ved sletning");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-32">
      <div className="max-w-md mx-auto pt-4">
        
        {/* HEADER */}
        <header className="text-center mb-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/50 block mb-2">Oversigt</span>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">Dine Fester</h1>
        </header>

        {/* LOADING */}
        {loading ? (
          <Skeleton />
        ) : (
          <>
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
              <div className="flex justify-between items-center px-1 mb-1">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alle Fester</h2>
                {parties.length > 0 && (
                  <button 
                    onClick={handleEditClick} 
                    className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition border ${isEditMode ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'text-slate-500 border-slate-700 hover:border-slate-500'}`}
                  >
                    {isEditMode ? 'Færdig' : 'Rediger'}
                  </button>
                )}
              </div>
              
              {parties.map(party => (
                <Link to={`/fest/${party.id}`} key={party.id} className="block group relative">
                  <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl flex flex-col gap-4 hover:bg-slate-800 hover:border-slate-600 transition-all shadow-sm active:scale-[0.98]">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition leading-tight">{party.name}</h3>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1 opacity-60">
                          {new Date(party.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      
                      {isEditMode ? (
                        <button
                          onClick={(e) => handleDelete(e, party.id)}
                          className="text-red-400 bg-red-900/30 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm font-bold text-sm z-10 shrink-0"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-white group-hover:border-slate-500 transition shrink-0">
                          →
                        </div>
                      )}
                    </div>

                    {/* TOP 3 PREVIEW */}
                    {party.topThree && party.topThree.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/30 flex items-center gap-2">
                        <div className="flex -space-x-3">
                          {party.topThree.map((p, idx) => (
                            <div 
                              key={idx} 
                              className="relative transition-transform hover:scale-110" 
                              style={{ zIndex: 3 - idx }}
                              title={`${p.name}: ${p.time.toFixed(2)}s`}
                            >
                              {p.image_url ? (
                                <img src={p.image_url} className={`w-8 h-8 rounded-full border-2 border-slate-800 object-cover bg-slate-700 ${idx === 0 ? 'ring-2 ring-yellow-500/50 shadow-lg' : ''}`} />
                              ) : (
                                <div className={`w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold ${idx === 0 ? 'ring-2 ring-yellow-500/50' : ''}`}>
                                  {p.name.charAt(0)}
                                </div>
                              )}
                              {idx === 0 && <span className="absolute -top-1.5 -right-0.5 text-[10px] drop-shadow-md">👑</span>}
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-2">
                          {party.topThree[0].name} fører ({party.topThree[0].time.toFixed(2)}s)
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
              
              {parties.length === 0 && !showInput && (
                <div className="text-center py-12 text-slate-600 text-sm font-medium">Ingen fester endnu. Sæt i gang! 🚀</div>
              )}
            </div>
          </>
        )}
        
        <PinModal 
          isOpen={showPinModal} 
          onClose={() => setShowPinModal(false)} 
          onSuccess={() => setIsEditMode(true)} 
        />
      </div>
    </div>
  )
}

export default PartyList