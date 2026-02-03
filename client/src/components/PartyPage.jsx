import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import Skeleton from './Skeleton'

function PartyPage() {
  const { id: partyId } = useParams()
  const [attempts, setAttempts] = useState([])
  const [partyInfo, setPartyInfo] = useState(null)
  
  const [name, setName] = useState('')
  const [beerType, setBeerType] = useState('')
  const [method, setMethod] = useState('Glas')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [time, setTime] = useState(0)
  const [isManualInput, setIsManualInput] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)
  const fileInputRef = useRef(null)

  const uniqueParticipants = [...new Set(attempts.map(a => a.name))].sort()

  const fetchData = async () => {
    if (!partyInfo) setLoading(true)
    try {
      const [attemptsRes, partyRes] = await Promise.all([
        fetch(`/api/attempts?partyId=${partyId}`),
        fetch(`/api/parties/${partyId}`)
      ])
      const attemptsData = await attemptsRes.json()
      const partyData = await partyRes.json()
      setAttempts(attemptsData.data)
      setPartyInfo(partyData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [partyId])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = (now - startTimeRef.current) / 1000
        setTime(elapsed)
      }, 10)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  const handleStartStop = (e) => {
    e.preventDefault()
    if (isRunning) {
      setIsRunning(false)
    } else {
      setTime(0)
      startTimeRef.current = Date.now()
      setIsRunning(true)
    }
  }

  const handleReset = (e) => {
    e.preventDefault()
    setIsRunning(false)
    setTime(0)
  }

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          const width = (scaleSize < 1) ? MAX_WIDTH : img.width;
          const height = (scaleSize < 1) ? img.height * scaleSize : img.height;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
      try {
        const compressed = await compressImage(file);
        setImageFile(compressed);
      } catch (err) {
        setImageFile(file);
      }
    }
  }

  const selectParticipant = (selectedName) => {
    setName(selectedName)
    const lastAttempt = attempts.find(a => a.name === selectedName)
    if (lastAttempt) {
      setBeerType(lastAttempt.beer_type || '')
      setMethod(lastAttempt.method || 'Glas')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || time <= 0) {
      alert("Husk navn!")
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('name', name); formData.append('time', time); formData.append('beer_type', beerType);
    formData.append('method', method); formData.append('partyId', partyId);
    if (imageFile) formData.append('image', imageFile)
    try {
      await fetch('/api/attempts', { method: 'POST', body: formData })
      setName(''); setBeerType(''); setMethod('Glas'); setTime(0);
      setIsRunning(false); setImageFile(null); setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowForm(false); fetchData();
    } catch (error) { alert(`Fejl: ${error.message}`) } finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Slet?')) return
    try { await fetch(`/api/attempts/${id}`, { method: 'DELETE' }); fetchData() } catch (error) { console.error(error) }
  }

  const formatTime = (t) => t.toFixed(2)
  const formatClock = (d) => {
    try { return "kl. " + new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) } catch(e) { return '??:??'}
  }

  const PodiumItem = ({ attempt, place }) => {
    if (!attempt) return <div className="w-1/3"></div>
    let heightClass = 'h-16'
    if (place === 1) heightClass = 'h-32'
    if (place === 2) heightClass = 'h-24'
    let colorClass = place === 1 ? 'bg-gradient-to-t from-yellow-600 to-yellow-400' : place === 2 ? 'bg-gradient-to-t from-slate-500 to-slate-300' : 'bg-gradient-to-t from-orange-800 to-orange-600'
    let icon = place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'
    let orderClass = place === 1 ? 'order-2' : place === 2 ? 'order-1' : 'order-3'
    let imgSize = place === 1 ? 'w-12 h-12' : place === 2 ? 'w-10 h-10' : 'w-9 h-9'

    return (
      <div className={`w-1/3 flex flex-col items-center justify-end ${orderClass}`}>
        <div className="mb-2 text-center flex flex-col items-center">
          {attempt.image_url ? (
            <img src={attempt.image_url} className={`${imgSize} rounded-lg object-cover mb-1 shadow-md bg-slate-800`} />
          ) : <div className={`${imgSize} rounded-lg bg-slate-700 flex items-center justify-center text-sm mb-1`}>👤</div>}
          <p className="font-bold text-white truncate w-20 mx-auto text-[10px] uppercase tracking-wide opacity-80 mb-0 leading-none">{attempt.name}</p>
          <p className={`font-mono font-bold ${attempt.time<3.0?'text-green-400':'text-slate-200'} text-base`}>{attempt.time.toFixed(2)}s</p>
        </div>
        <div className={`w-full ${heightClass} ${colorClass} rounded-t-lg flex justify-center pt-2 relative`}>
          <span className="text-xl filter drop-shadow-md z-10">{icon}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-24">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-8 mt-2">
          <Link to="/fester" className="w-10 h-10 flex items-center justify-center bg-slate-800/50 rounded-xl text-slate-400 hover:text-white transition border border-slate-700 shadow-sm">
            <span className="text-lg">←</span>
          </Link>
          <div className="flex-1 text-center min-w-0">
            {partyInfo && (
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500/50 block mb-1">
                {new Date(partyInfo.created_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            <h1 className="text-2xl font-black text-white uppercase tracking-tight truncate">
              {partyInfo ? partyInfo.name : 'Indlæser...'}
            </h1>
          </div>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 flex items-center justify-center bg-yellow-500 rounded-xl text-slate-900 shadow-md transform active:scale-95 transition-all duration-200">
            <span className="text-2xl font-bold">+</span>
          </button>
        </div>

        {loading ? (
          <>
            <Skeleton />
          </>
        ) : (
          <>
            {attempts.length > 0 ? (
              <div className="relative mb-8 px-2">
                <div className="flex items-end justify-center gap-2">
                  <PodiumItem attempt={attempts[1]} place={2} />
                  <PodiumItem attempt={attempts[0]} place={1} />
                  <PodiumItem attempt={attempts[2]} place={3} />
                </div>
                <div className="h-0.5 w-full bg-slate-800 rounded-full mt-0 shadow-inner opacity-50"></div>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700 mb-8">
                <p className="text-slate-500 text-sm font-medium mb-3">Ingen har drukket endnu...</p>
                <button onClick={() => setShowForm(true)} className="bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-lg text-sm font-bold border border-yellow-500/20 hover:bg-yellow-500/20 transition">Start festen nu</button>
              </div>
            )}

            {showForm && (
              <div className="fixed inset-0 bg-slate-950/90 sm:bg-slate-900/80 sm:backdrop-blur-sm z-[60] flex items-center justify-center animate-fade-in p-4" onClick={() => setShowForm(false)}>
                <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-slate-900 sm:bg-slate-800 flex flex-col rounded-3xl shadow-2xl border border-slate-700 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900 sm:bg-slate-800 shrink-0">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">Nyt Forsøg</h2>
                    <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center bg-slate-800 sm:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition">✕</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:p-6">
                    <form id="attempt-form" onSubmit={handleSubmit} className="space-y-4 pb-20 sm:pb-0">
                      {uniqueParticipants.length > 0 && (
                        <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                          <div className="flex gap-2">
                            {uniqueParticipants.map(p => (
                              <button key={p} type="button" onClick={() => selectParticipant(p)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition border ${name === p ? 'bg-yellow-500 text-slate-900 border-yellow-600 shadow-md' : 'bg-slate-700/50 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-white'}`}>{p}</button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 ml-2 mb-1 block tracking-wider">Navn</label>
                          <div className="flex items-stretch gap-2">
                            <div className="relative flex-1">
                              <style>{`input::-webkit-calendar-picker-indicator { display: none !important; opacity: 0; }`}</style>
                              <input type="text" list="participant-suggestions" value={name} onChange={e => { setName(e.target.value); if (uniqueParticipants.includes(e.target.value)) selectParticipant(e.target.value); }} placeholder="Hvem bunder?" className="w-full h-full pl-4 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-yellow-500 outline-none transition text-base font-medium" required />
                              <datalist id="participant-suggestions">
                                {uniqueParticipants.map(p => <option key={p} value={p} />)}
                              </datalist>
                              {imagePreview && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                  <img src={imagePreview} className="w-8 h-8 rounded-lg object-cover border border-slate-700 shadow-sm" />
                                </div>
                              )}
                            </div>
                            <label className={`cursor-pointer w-12 flex items-center justify-center rounded-xl border transition shadow-sm ${imagePreview ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}>
                              <span className="text-xl">📷</span>
                              <input type="file" accept="image/*" capture="user" onChange={handleImageChange} className="hidden" ref={fileInputRef}/>
                            </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-2 mb-1 block tracking-wider">Øl</label>
                            <input type="text" value={beerType} onChange={e=>setBeerType(e.target.value)} placeholder="Type" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-yellow-500 transition font-medium text-sm" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-2 mb-1 block tracking-wider">Metode</label>
                            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700 h-[50px]">
                              <button type="button" onClick={()=>setMethod('Glas')} className={`flex-1 rounded-lg transition-all duration-200 text-sm ${method==='Glas'?'bg-yellow-500 text-slate-900 font-bold shadow':'text-slate-500 hover:text-slate-300'}`}>🍺</button>
                              <button type="button" onClick={()=>setMethod('Dåse')} className={`flex-1 rounded-lg transition-all duration-200 text-sm ${method==='Dåse'?'bg-yellow-500 text-slate-900 font-bold shadow':'text-slate-500 hover:text-slate-300'}`}>🥫</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="py-2">
                        <div className="flex justify-between items-center mb-2"><label className="text-[10px] uppercase font-bold text-slate-500 ml-2 tracking-wider">Tid</label><button type="button" onClick={()=>{setIsManualInput(!isManualInput);setIsRunning(false)}} className="text-[10px] uppercase font-bold text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">{isManualInput ? 'Stopur' : 'Indtast'}</button></div>
                        {isManualInput ? (
                          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 shadow-inner">
                            <input type="number" step="0.01" inputMode="decimal" value={time===0?'':time} onChange={e=>setTime(e.target.value)} className="w-full text-center text-4xl font-mono font-black bg-transparent text-white outline-none" placeholder="0.00" />
                          </div>
                        ) : (
                          <div className="bg-slate-900 p-5 rounded-3xl flex flex-col items-center gap-4 border border-slate-700 shadow-inner">
                              <div className={`text-5xl font-mono font-black tabular-nums tracking-tighter whitespace-nowrap ${isRunning?'text-yellow-400 animate-pulse':time>0&&time<3?'text-green-400':'text-white'}`}>{formatTime(parseFloat(time))}</div>
                              <div className="flex gap-3 w-full">
                                <button type="button" onClick={handleStartStop} className={`flex-1 py-4 rounded-xl font-black text-xl shadow-lg transition transform active:scale-95 border-b-4 ${isRunning?'bg-red-500 text-white border-red-700':'bg-green-500 text-slate-900 border-green-700'}`}>{isRunning?'STOP!':'START'}</button>
                                {!isRunning && time>0 && <button type="button" onClick={handleReset} className="px-6 bg-slate-700 rounded-xl text-white shadow-md active:bg-slate-600 transition border-b-2 border-slate-800">↺</button>}
                              </div>
                          </div>
                        )}
                      </div>
                      <button type="submit" disabled={loading||isRunning||time<=0} className="hidden sm:block w-full bg-yellow-500 py-4 rounded-xl font-black text-slate-900 text-lg uppercase tracking-widest shadow-md transform active:scale-95 transition-all disabled:opacity-20 border-b-4 border-yellow-600 mt-6">Gem Rekord</button>
                    </form>
                  </div>

                  <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md safe-area-bottom sm:hidden shrink-0">
                    <button type="submit" form="attempt-form" disabled={loading||isRunning||time<=0} className="w-full bg-yellow-500 py-4 rounded-xl font-black text-slate-900 text-lg uppercase tracking-widest shadow-lg transform active:scale-95 transition-all disabled:opacity-20 border-b-4 border-yellow-600">Gem Rekord</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1 mb-1">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alle Resultater</h2>
                {attempts.length>0 && <button onClick={()=>setIsEditMode(!isEditMode)} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition border ${isEditMode?'bg-red-500/20 text-red-400 border-red-500/50':'text-slate-500 border-slate-700 hover:border-slate-500'}`}>{isEditMode?'Færdig':'Rediger'}</button>}
              </div>
              {attempts.map((a,i)=>{
                const personAttempts = attempts.filter(att => att.name === a.name).sort((x, y) => new Date(x.created_at) - new Date(y.created_at));
                const attemptNumber = personAttempts.findIndex(att => att.id === a.id) + 1;
                return (
                <div key={a.id} className={`p-3 rounded-xl flex items-center justify-between gap-2 border transition-all duration-300 ${a.time<3?'bg-gradient-to-r from-yellow-900/20 to-slate-800/50 border-yellow-500/30 shadow-sm':'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'}`}>
                   <div className="flex items-center gap-3 min-w-0 flex-1">
                     <span className={`text-xl font-black w-6 shrink-0 text-center ${i===0?'text-yellow-400':i===1?'text-slate-300':i===2?'text-orange-400':'text-slate-600'}`}>#{i+1}</span>
                     <div className="relative shrink-0">
                      {a.image_url ? <img src={a.image_url} className="w-10 h-10 rounded-lg object-cover bg-slate-700 border border-slate-600 shadow-sm"/> : <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 text-lg border border-slate-600">👤</div>}
                      <span className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full px-1 py-0 text-[8px] border border-slate-700 shadow-sm">{a.method === 'Glas' ? '🍺' : '🥫'}</span>
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="font-bold text-white text-sm leading-tight flex items-center gap-1.5">
                         <span className="truncate">{a.name}</span>
                         <span className="text-[8px] font-bold bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-600 shrink-0 uppercase tracking-tighter">
                           {attemptNumber}. forsøg
                         </span>
                       </p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate">{a.beer_type} • {formatClock(a.created_at)}</p>
                     </div>
                   </div>
                   <div className="text-right flex items-center gap-3 shrink-0 ml-2">
                     <span className={`font-mono font-black text-xl ${a.time<3?'text-green-400':'text-slate-200'}`}>{a.time.toFixed(2)}s</span>
                     {isEditMode && <button onClick={()=>handleDelete(a.id)} className="text-red-400 bg-red-900/30 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm font-bold text-sm">✕</button>}
                   </div>
                </div>
              )})}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export default PartyPage