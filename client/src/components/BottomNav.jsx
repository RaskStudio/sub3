import { Link, useLocation } from 'react-router-dom'

function BottomNav() {
  const location = useLocation()
  
  const isHome = location.pathname === '/'
  const isPartySection = location.pathname.startsWith('/fester') || location.pathname.startsWith('/fest/')

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 border-t border-slate-700 p-0.5 shadow-2xl z-50 safe-area-bottom backdrop-blur-sm">
      <div className="max-w-md mx-auto flex justify-around items-center">
        
        <Link to="/" className={`flex flex-col items-center py-1 px-8 rounded-lg transition ${isHome ? 'text-yellow-500 bg-slate-700/40' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-base">🏆</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Top 10</span>
        </Link>

        <Link to="/fester" className={`flex flex-col items-center py-1 px-8 rounded-lg transition ${isPartySection ? 'text-yellow-500 bg-slate-700/40' : 'text-slate-400 hover:text-white'}`}>
          <span className="text-base">🎉</span>
          <span className="text-[9px] font-bold uppercase tracking-wider">Fester</span>
        </Link>

      </div>
    </div>
  )
}

export default BottomNav