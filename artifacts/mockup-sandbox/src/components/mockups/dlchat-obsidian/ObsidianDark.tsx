import React from 'react';
import { Search, MessageCircle, Rss, Users, LayoutGrid, User, Plus, Battery, Wifi, Signal } from 'lucide-react';

const STORIES = [
  { id: '1', name: 'Your Story', isUser: true },
  { id: '2', name: 'Alex', initials: 'AX', color: 'from-pink-500 to-rose-400' },
  { id: '3', name: 'Sarah', initials: 'SR', color: 'from-cyan-500 to-blue-500' },
  { id: '4', name: 'Mike', initials: 'MK', color: 'from-amber-500 to-orange-500' },
  { id: '5', name: 'Emma', initials: 'EM', color: 'from-emerald-500 to-teal-500' },
  { id: '6', name: 'David', initials: 'DV', color: 'from-purple-500 to-indigo-500' },
];

const CHATS = [
  { id: '1', name: 'Design Team', initials: 'DT', color: 'from-indigo-600 to-purple-600', msg: 'The new obsidian theme looks sick! 🔥', time: '10:42', unread: 3 },
  { id: '2', name: 'Sarah Miller', initials: 'SM', color: 'from-pink-600 to-rose-600', msg: 'Are we still on for the meeting at 2?', time: '09:15', unread: 1 },
  { id: '3', name: 'Crypto Alpha', initials: 'CA', color: 'from-emerald-600 to-teal-600', msg: 'BTC just broke resistance. Check the charts.', time: 'Yesterday', unread: 0 },
  { id: '4', name: 'Alex', initials: 'AX', color: 'from-blue-600 to-cyan-600', msg: 'Sent an image.', time: 'Yesterday', unread: 0 },
  { id: '5', name: 'Emma Watson', initials: 'EW', color: 'from-amber-600 to-orange-600', msg: 'Thanks for the update!', time: 'Mon', unread: 0 },
  { id: '6', name: 'David', initials: 'DV', color: 'from-purple-600 to-violet-600', msg: 'I\'ll look into the bugs tomorrow morning.', time: 'Sun', unread: 0 },
];

export function ObsidianDark() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .font-inter {
          font-family: 'Inter', sans-serif;
        }

        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }

        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(124, 121, 240, 0.4)); }
          50% { filter: drop-shadow(0 0 16px rgba(124, 121, 240, 0.8)); }
        }

        .active-tab {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>

      {/* Phone Wrapper */}
      <div className="w-[390px] h-[844px] bg-[#0A0A0B] rounded-[40px] overflow-hidden relative shadow-[0_0_40px_rgba(124,121,240,0.15)] border border-[#222] font-inter flex flex-col">
        
        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 pt-4 pb-2 text-white/90 text-sm font-semibold z-10">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <Signal size={16} />
            <Wifi size={16} />
            <Battery size={20} />
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-2">
          <h1 className="text-[28px] font-bold text-[#F0EEEA] tracking-tight">DLChat</h1>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C79F0] to-[#A3A1F7] p-[2px]">
            <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center border-2 border-[#0A0A0B]">
              <User size={20} className="text-[#F0EEEA]" />
            </div>
          </div>
        </div>

        {/* Stories */}
        <div className="mt-4">
          <div className="flex overflow-x-auto scrollbar-hide px-6 gap-4 pb-4">
            {STORIES.map((story) => (
              <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
                {story.isUser ? (
                  <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center backdrop-blur-sm shadow-sm relative">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center">
                       <User size={24} className="text-gray-400" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#7C79F0] rounded-full flex items-center justify-center border-2 border-[#0A0A0B]">
                      <Plus size={12} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#7C79F0] to-[#514EBA] p-[2px] shadow-[0_0_12px_rgba(124,121,240,0.3)]">
                    <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center border-2 border-[#0A0A0B]">
                      <div className={`w-full h-full rounded-full bg-gradient-to-tr ${story.color} opacity-80 flex items-center justify-center text-white font-semibold text-lg`}>
                        {story.initials}
                      </div>
                    </div>
                  </div>
                )}
                <span className="text-xs font-medium text-[#888884]">{story.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 my-2">
          <div className="h-12 bg-white/5 backdrop-blur-xl border border-white/5 rounded-full flex items-center px-4 gap-3">
            <Search size={20} className="text-[#888884]" />
            <input 
              type="text" 
              placeholder="Cari pesan..." 
              className="bg-transparent border-none outline-none text-[#F0EEEA] placeholder-[#888884] flex-1 text-base font-medium"
              disabled
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-4 pb-28 flex flex-col">
          {CHATS.map((chat, idx) => (
            <div key={chat.id} className="flex items-center py-4 gap-4 relative group cursor-pointer">
              {/* Subtle divider except for first */}
              {idx !== 0 && <div className="absolute top-0 left-16 right-0 h-[1px] bg-white/[0.03]"></div>}
              
              <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${chat.color} flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg`}>
                {chat.initials}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-[#F0EEEA] font-semibold text-[17px] truncate pr-2">{chat.name}</h3>
                  <span className="text-xs font-medium text-[#888884] shrink-0">{chat.time}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className={`text-[15px] truncate ${chat.unread > 0 ? 'text-[#E0E0E0] font-medium' : 'text-[#888884]'}`}>
                    {chat.msg}
                  </p>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#7C79F0] flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-[0_0_8px_rgba(124,121,240,0.5)]">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Tab Bar (Floating) */}
        <div className="absolute bottom-8 left-6 right-6 h-16 bg-[#161618]/80 backdrop-blur-2xl border border-white/10 rounded-[24px] flex items-center justify-around px-2 shadow-2xl">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#7C79F0] active-tab">
            <MessageCircle size={24} className="fill-[#7C79F0]/20" />
          </div>
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#888884] hover:text-[#F0EEEA] transition-colors">
            <Rss size={24} />
          </div>
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#888884] hover:text-[#F0EEEA] transition-colors">
            <Users size={24} />
          </div>
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#888884] hover:text-[#F0EEEA] transition-colors">
            <LayoutGrid size={24} />
          </div>
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-[#888884] hover:text-[#F0EEEA] transition-colors">
            <User size={24} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default ObsidianDark;
