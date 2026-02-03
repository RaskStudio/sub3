import { Link, useLocation } from 'react-router-dom'

function BottomNav() {
  const location = useLocation()
  
  // Er vi på Hall of Fame (forside)?
  const isHome = location.pathname === '/'
  // Er vi et sted under "Fester" (enten liste eller specifik fest)?
  const isPartySection = location.pathname.startsWith('/fester') || location.pathname.startsWith('/fest/')

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-2 shadow-2xl z-50 safe-area-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center">
        
        <Link to="/" className={`flex flex-col items-center p-3 px-8 rounded-xl transition ${isHome ? 'text-yellow-500 bg-slate-700/50' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-2xl">🏆</span>
          <span className="text-xs font-bold mt-1">Hall of Fame</span>
        </Link>

        <Link to="/fester" className={`flex flex-col items-center p-3 px-8 rounded-xl transition ${isPartySection ? 'text-yellow-500 bg-slate-700/50' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-2xl">🎉</span>
          <span className="text-xs font-bold mt-1">Fester</span>
        </Link>

      </div>
    </div>
  )
}

export default BottomNav