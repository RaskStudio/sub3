import { useState, useEffect, useRef } from 'react'

function App() {
  const [attempts, setAttempts] = useState([])
  const [name, setName] = useState('')
  const [beerType, setBeerType] = useState('')
  const [method, setMethod] = useState('Glas')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Stopwatch & Input states
  const [time, setTime] = useState(0)
  const [isManualInput, setIsManualInput] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)
  const fileInputRef = useRef(null)

  const fetchAttempts = async () => {
    try {
      const response = await fetch('/api/attempts')
      const data = await response.json()
      setAttempts(data.data)
    } catch (error) {
      console.error('Error fetching attempts:', error)
    }
  }

  useEffect(() => {
    fetchAttempts()
  }, [])

  // Stopwatch Logic
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

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      // Lav preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || time <= 0) {
      alert("Husk navn og en gyldig tid!")
      return
    }
    setLoading(true)

    // Brug FormData til at sende billede + data
    const formData = new FormData()
    formData.append('name', name)
    formData.append('time', time)
    formData.append('beer_type', beerType)
    formData.append('method', method)
    if (imageFile) {
      formData.append('image', imageFile)
    }

    try {
      await fetch('/api/attempts', {
        method: 'POST',
        body: formData, // Send formData direkte (ingen Content-Type header, browseren sætter den selv)
      })
      
      // Reset
      setName('')
      setBeerType('')
      setMethod('Glas') 
      setTime(0)
      setIsRunning(false)
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      fetchAttempts()
    } catch (error) {
      console.error('Error submitting attempt:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Er du sikker på, at du vil slette denne tid?')) return

    try {
      await fetch(`/api/attempts/${id}`, {
        method: 'DELETE',
      })
      fetchAttempts()
    } catch (error) {
      console.error('Error deleting attempt:', error)
    }
  }

  const formatTime = (t) => t.toFixed(2)

  // Helper til Podie-kort
  const PodiumItem = ({ attempt, place }) => {
    if (!attempt) return <div className="w-1/3"></div>

    let heightClass = 'h-24'
    let colorClass = 'bg-slate-700'
    let orderClass = 'order-2'
    let icon = '🥉'
    let translateClass = 'translate-y-0'
    let imgSize = 'w-12 h-12'

    if (place === 1) {
      heightClass = 'h-40'
      colorClass = 'bg-gradient-to-t from-yellow-600 to-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
      orderClass = 'order-2'
      icon = '👑'
      translateClass = '-translate-y-4'
      imgSize = 'w-16 h-16 border-2 border-yellow-200'
    } else if (place === 2) {
      heightClass = 'h-32'
      colorClass = 'bg-gradient-to-t from-slate-500 to-slate-300'
      orderClass = 'order-1'
      icon = '🥈'
      imgSize = 'w-14 h-14 border-2 border-slate-200'
    } else if (place === 3) {
      heightClass = 'h-24'
      colorClass = 'bg-gradient-to-t from-orange-800 to-orange-600'
      orderClass = 'order-3'
      icon = '🥉'
      imgSize = 'w-12 h-12 border-2 border-orange-200'
    }

    return (
      <div className={`w-1/3 flex flex-col items-center justify-end ${orderClass} ${translateClass}`}>
        <div className="mb-2 text-center flex flex-col items-center">
          {attempt.image_url ? (
            <img src={attempt.image_url} alt={attempt.name} className={`${imgSize} rounded-full object-cover mb-1 shadow-md bg-slate-800`} />
          ) : (
             <div className={`${imgSize} rounded-full bg-slate-700 flex items-center justify-center text-xl mb-1 shadow-md`}>
               👤
             </div>
          )}
          <p className={`font-bold text-white truncate w-24 mx-auto ${place === 1 ? 'text-lg' : 'text-sm'}`}>
            {attempt.name}
          </p>
          <p className={`font-mono font-bold ${attempt.time < 3.0 ? 'text-green-400' : 'text-slate-200'}`}>
            {attempt.time.toFixed(2)}s
          </p>
        </div>
        
        <div className={`w-full ${heightClass} ${colorClass} rounded-t-lg relative flex justify-center pt-2`}>
          <span className="text-2xl filter drop-shadow-md">{icon}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-20">
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6 pt-4">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            Sub3
          </h1>
          <p className="text-slate-400">Den ultimative øl-bunde logbog</p>
        </header>

        {/* PODIUM */}
        {attempts.length > 0 && (
          <div className="mb-10 mt-6 flex items-end justify-center gap-2 sm:gap-4 px-2">
            <PodiumItem attempt={attempts[1]} place={2} />
            <PodiumItem attempt={attempts[0]} place={1} />
            <PodiumItem attempt={attempts[2]} place={3} />
          </div>
        )}

        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl mb-8 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Ny Rekord?</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Navn</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Navn..."
                      className="w-full pl-4 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white placeholder-slate-600"
                      required
                    />
                    {/* Billed Preview i input feltet */}
                    {imagePreview && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <img src={imagePreview} alt="Preview" className="w-8 h-8 rounded-full object-cover border border-slate-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Kamera Knap */}
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user" // Tvinger kamera på mobil hvis muligt
                      onChange={handleImageChange}
                      ref={fileInputRef}
                      className="hidden" 
                      id="cameraInput"
                    />
                    <label 
                      htmlFor="cameraInput" 
                      className={`flex items-center justify-center w-12 h-[50px] rounded-lg border cursor-pointer transition ${imagePreview ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-400 mb-1">Øl</label>
                <input
                  type="text"
                  value={beerType}
                  onChange={(e) => setBeerType(e.target.value)}
                  placeholder="Type..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-white placeholder-slate-600"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-400 mb-1">Metode</label>
                 <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 h-[50px]">
                  <button
                    type="button"
                    onClick={() => setMethod('Glas')}
                    className={`flex-1 rounded-md font-medium transition ${method === 'Glas' ? 'bg-yellow-500 text-slate-900' : 'text-slate-400'}`}
                  >
                    🍺
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('Dåse')}
                    className={`flex-1 rounded-md font-medium transition ${method === 'Dåse' ? 'bg-yellow-500 text-slate-900' : 'text-slate-400'}`}
                  >
                    🥫
                  </button>
                </div>
              </div>
            </div>

            {/* TID OMRÅDE */}
            <div className="py-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-400">Tid</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualInput(!isManualInput)
                    setIsRunning(false)
                  }}
                  className="text-xs text-yellow-500 hover:text-yellow-400 underline"
                >
                  {isManualInput ? 'Brug Stopur' : 'Indtast manuelt'}
                </button>
              </div>
              
              {isManualInput ? (
                // MANUELT INPUT
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                   <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={time === 0 ? '' : time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-center text-4xl font-mono font-bold bg-transparent border-b-2 border-slate-600 focus:border-yellow-500 outline-none text-white placeholder-slate-700 py-2"
                      autoFocus
                    />
                    <span className="absolute right-4 bottom-4 text-xl text-slate-500 font-bold">s</span>
                   </div>
                </div>
              ) : (
                // STOPUR DISPLAY
                <div className="flex flex-col items-center gap-4 bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                  <div className={`text-6xl font-mono font-black tabular-nums tracking-tighter ${
                      isRunning 
                        ? 'text-yellow-400 animate-pulse' 
                        : time > 0 && time < 3.0 
                          ? 'text-green-400' 
                          : time > 0 
                            ? 'text-white' 
                            : 'text-slate-600'
                    }`}
                  >
                    {formatTime(typeof time === 'string' ? parseFloat(time) : time)}<span className="text-2xl text-slate-500 ml-1">s</span>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={handleStartStop}
                      type="button"
                      className={`flex-1 py-4 rounded-xl font-black text-xl tracking-wider transition transform active:scale-95 shadow-lg ${
                        isRunning 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-slate-900'
                      }`}
                    >
                      {isRunning ? 'STOP!' : (time > 0 ? 'PRØV IGEN' : 'START')}
                    </button>
                    
                    {!isRunning && time > 0 && (
                      <button
                        onClick={handleReset}
                        type="button"
                        className="px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 transition"
                        title="Nulstil"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || isRunning || time <= 0}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-4 rounded-lg transition transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wide"
            >
              {loading ? 'Gemmer...' : 'Gem Rekord'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-xl font-semibold text-white">Alle Forsøg</h2>
            {attempts.length > 0 && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full transition border ${
                  isEditMode 
                    ? 'bg-red-500/10 text-red-400 border-red-500/50' 
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                }`}
              >
                {isEditMode ? 'Færdig' : 'Rediger'}
              </button>
            )}
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-10 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
              Ingen forsøg endnu. Sæt i gang!
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt, index) => {
                const isSub3 = attempt.time < 3.0
                const rank = index + 1
                let rankColor = 'text-slate-400'
                if (rank === 1) rankColor = 'text-yellow-400'
                if (rank === 2) rankColor = 'text-slate-300'
                if (rank === 3) rankColor = 'text-orange-400'

                return (
                  <div 
                    key={attempt.id} 
                    className={`relative p-4 rounded-xl flex items-center justify-between border transition-all duration-300 ${isSub3 ? 'bg-gradient-to-r from-yellow-900/30 to-slate-800 border-yellow-500/50' : 'bg-slate-800 border-slate-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-black w-8 text-center ${rankColor}`}>#{rank}</span>
                      
                      {/* Avatar i listen */}
                      {attempt.image_url ? (
                        <img src={attempt.image_url} alt="User" className="w-10 h-10 rounded-full object-cover bg-slate-700 border border-slate-600" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 border border-slate-600">
                          👤
                        </div>
                      )}

                      <div>
                        <p className="font-bold text-lg text-white">
                          {attempt.name}
                          <span className="ml-2 text-sm font-normal text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            {attempt.method === 'Glas' ? '🍺' : '🥫'}
                            {attempt.method}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 flex gap-2 mt-1">
                          <span>{attempt.beer_type || 'Ukendt øl'}</span>
                          <span>•</span>
                          <span>kl. {new Date(attempt.created_at.replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-4">
                      <span className={`text-2xl font-mono font-bold ${isSub3 ? 'text-green-400' : 'text-slate-200'}`}>
                        {attempt.time.toFixed(2)}s
                      </span>
                      
                      {isEditMode && (
                        <button 
                          onClick={() => handleDelete(attempt.id)}
                          className="ml-2 p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors animate-fade-in"
                          title="Slet forsøg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App