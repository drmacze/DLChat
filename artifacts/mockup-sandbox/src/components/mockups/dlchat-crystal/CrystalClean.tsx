import React, { useState } from 'react';
import { Search, MessageCircle, Phone, Users, Settings, BatteryMedium, Wifi, SignalHigh, Camera, MoreHorizontal } from 'lucide-react';

export function CrystalClean() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('chats');

  const filters = ['All', 'Unread', 'Groups'];

  const stories = [
    { id: 1, name: 'Your Story', initial: '+', isAdd: true, color: 'bg-gray-100', text: 'text-gray-500' },
    { id: 2, name: 'Sarah', initial: 'S', isAdd: false, color: 'bg-blue-100', text: 'text-blue-600' },
    { id: 3, name: 'Mike', initial: 'M', isAdd: false, color: 'bg-green-100', text: 'text-green-600' },
    { id: 4, name: 'Emma', initial: 'E', isAdd: false, color: 'bg-yellow-100', text: 'text-yellow-600' },
    { id: 5, name: 'Alex', initial: 'A', isAdd: false, color: 'bg-purple-100', text: 'text-purple-600' },
  ];

  const chats = [
    { id: 1, name: 'Sarah Jenkins', initial: 'S', preview: 'See you tomorrow! 👋', time: '10:42 AM', unread: 2, online: true },
    { id: 2, name: 'Design Team', initial: 'D', preview: 'Mike: I uploaded the new assets to Fig...', time: '9:15 AM', unread: 5, online: false },
    { id: 3, name: 'Alex Chen', initial: 'A', preview: 'Are we still on for lunch?', time: 'Yesterday', unread: 0, online: true },
    { id: 4, name: 'Emma Wilson', initial: 'E', preview: 'Thanks for the update.', time: 'Yesterday', unread: 0, online: false },
    { id: 5, name: 'Marketing Sync', initial: 'M', preview: 'You: Sounds good.', time: 'Tuesday', unread: 0, online: false },
    { id: 6, name: 'David Lee', initial: 'D', preview: 'Can you send over that file?', time: 'Monday', unread: 0, online: false },
  ];

  return (
    <div className="min-h-screen bg-[#E5E5EA] flex items-center justify-center font-sans">
      {/* iPhone Device Wrapper */}
      <div 
        className="relative overflow-hidden bg-[#F7F6F3] shadow-2xl ring-1 ring-black/5"
        style={{ width: '390px', height: '844px', borderRadius: '40px' }}
      >
        {/* Status Bar */}
        <div className="px-6 pt-3 flex justify-between items-center text-[#1A1917] text-[15px] font-semibold z-10 relative">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <SignalHigh size={16} strokeWidth={2.5} />
            <Wifi size={16} strokeWidth={2.5} />
            <BatteryMedium size={18} strokeWidth={2.5} className="rotate-90 translate-y-[1px]" />
          </div>
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-[34px] font-bold text-[#1A1917] tracking-tight">Chats</h1>
            <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#5654C0]">
              <Camera size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={18} className="text-[#6A6A66]" />
            </div>
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full bg-[#F2F2F7] text-[#1A1917] placeholder:text-[#6A6A66] rounded-full py-2.5 pl-10 pr-4 text-[17px] focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-2">
            {filters.map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter 
                    ? 'bg-[#5654C0] text-white' 
                    : 'bg-[#F2F2F7] text-[#6A6A66]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Stories */}
        <div className="px-5 py-2 overflow-hidden flex gap-4">
          {stories.map(story => (
            <div key={story.id} className="flex flex-col items-center gap-1.5">
              <div className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center ${story.isAdd ? 'border-2 border-dashed border-gray-300' : 'ring-2 ring-offset-2 ring-offset-[#F7F6F3] ring-[#5654C0]'} bg-white`}>
                <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center ${story.color} ${story.text} text-xl font-semibold`}>
                  {story.initial}
                </div>
              </div>
              <span className="text-[11px] font-medium text-[#6A6A66]">{story.name}</span>
            </div>
          ))}
        </div>

        {/* Chat List */}
        <div className="px-4 py-2 pb-24 flex flex-col gap-2.5 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {chats.map(chat => (
            <div key={chat.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <div className="relative">
                <div className="w-[52px] h-[52px] rounded-full bg-[#5654C0]/10 flex items-center justify-center text-[#5654C0] text-lg font-semibold">
                  {chat.initial}
                </div>
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-[16px] font-semibold text-[#1A1917] truncate pr-2">{chat.name}</h3>
                  <span className={`text-[12px] flex-shrink-0 ${chat.unread > 0 ? 'text-[#5654C0] font-medium' : 'text-[#6A6A66]'}`}>
                    {chat.time}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-[14px] truncate pr-2 ${chat.unread > 0 ? 'text-[#1A1917] font-medium' : 'text-[#6A6A66]'}`}>
                    {chat.preview}
                  </p>
                  {chat.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-[#5654C0] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 pb-8 pt-3 px-6 flex justify-between items-center z-10">
          <button onClick={() => setActiveTab('status')} className="flex flex-col items-center gap-1">
            <div className={`p-1.5 rounded-xl ${activeTab === 'status' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>
              <MoreHorizontal size={24} />
            </div>
            <span className={`text-[10px] font-medium ${activeTab === 'status' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>Updates</span>
          </button>
          <button onClick={() => setActiveTab('calls')} className="flex flex-col items-center gap-1">
            <div className={`p-1.5 rounded-xl ${activeTab === 'calls' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>
              <Phone size={24} />
            </div>
            <span className={`text-[10px] font-medium ${activeTab === 'calls' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>Calls</span>
          </button>
          <button onClick={() => setActiveTab('chats')} className="flex flex-col items-center gap-1">
            <div className={`p-1.5 rounded-xl ${activeTab === 'chats' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>
              <MessageCircle size={24} className={activeTab === 'chats' ? 'fill-current' : ''} />
            </div>
            <span className={`text-[10px] font-medium ${activeTab === 'chats' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>Chats</span>
          </button>
          <button onClick={() => setActiveTab('communities')} className="flex flex-col items-center gap-1">
            <div className={`p-1.5 rounded-xl ${activeTab === 'communities' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>
              <Users size={24} />
            </div>
            <span className={`text-[10px] font-medium ${activeTab === 'communities' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>Communities</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className="flex flex-col items-center gap-1">
            <div className={`p-1.5 rounded-xl ${activeTab === 'settings' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>
              <Settings size={24} />
            </div>
            <span className={`text-[10px] font-medium ${activeTab === 'settings' ? 'text-[#5654C0]' : 'text-[#6A6A66]'}`}>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
