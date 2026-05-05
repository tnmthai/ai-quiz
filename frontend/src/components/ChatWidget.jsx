import { useState } from 'react';
import AIChat from './AIChat';

export default function ChatWidget({ token }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 shadow-2xl rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-xs text-gray-500 transition"
            >
              ✕
            </button>
            <AIChat token={token} />
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-200 ${
          open
            ? 'bg-gray-500 hover:bg-gray-600 rotate-90'
            : 'bg-blue-500 hover:bg-blue-600 hover:scale-110'
        }`}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
