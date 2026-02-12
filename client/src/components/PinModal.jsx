import { useState, useRef, useEffect } from 'react';

function PinModal({ isOpen, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      // Vent lidt så animationen er færdig før fokus
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === '7082') {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setPin('');
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 p-6 rounded-3xl w-full max-w-xs shadow-2xl transform transition-all scale-100" 
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 text-center">Indtast Kode</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6 relative">
            <input
              ref={inputRef}
              type="tel"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false); }}
              className={`w-full bg-slate-800 text-white text-center text-3xl font-mono tracking-[0.5em] py-4 rounded-xl border-2 outline-none transition-all ${error ? 'border-red-500 animate-shake' : 'border-slate-700 focus:border-yellow-500'}`}
              placeholder="••••"
            />
            {error && <p className="absolute -bottom-6 left-0 right-0 text-center text-red-400 text-xs font-bold mt-1 uppercase tracking-wider">Forkert kode</p>}
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
            >
              Annuller
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 rounded-xl font-black text-slate-900 bg-yellow-500 hover:bg-yellow-400 transition shadow-lg"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PinModal;
