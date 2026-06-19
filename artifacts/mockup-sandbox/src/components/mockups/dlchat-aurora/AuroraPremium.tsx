import React from 'react';
import { Battery, Wifi, Signal, Edit, Search, Home, MessageCircle, Users, Bell, Settings, Phone, Video, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { ScrollArea, ScrollBar } from '../../ui/scroll-area';

export default function AuroraPremium() {
  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center p-4 sm:p-8 font-sans text-[#F9FAFB]">
      {/* iPhone Container */}
      <div className="w-[390px] h-[844px] bg-[#0B1224] rounded-[40px] overflow-hidden relative shadow-[0_0_80px_rgba(79,110,247,0.15)] flex flex-col border border-white/5 ring-1 ring-white/10">
        
        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 pt-3.5 pb-2 text-xs font-medium z-10">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal size={14} className="stroke-[2.5]" />
            <Wifi size={14} className="stroke-[2.5]" />
            <Battery size={16} className="stroke-[2]" />
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 z-10">
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#4F6EF7] to-[#9B5CF6] flex items-center justify-center shadow-[0_0_20px_rgba(155,92,246,0.3)] text-white hover:opacity-90 transition-opacity">
            <Edit size={20} className="stroke-[2.5] ml-0.5" />
          </button>
        </div>

        <ScrollArea className="flex-1 w-full pb-24 relative">
          <div className="px-6 space-y-6 pb-6">
            
            {/* Pinned Featured Chat */}
            <div className="w-full h-32 rounded-3xl bg-gradient-to-br from-[#4F6EF7] to-[#9B5CF6] p-5 relative overflow-hidden flex flex-col justify-end shadow-[0_10px_30px_rgba(79,110,247,0.25)] cursor-pointer group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:bg-white/20 transition-colors duration-500"></div>
              <div className="absolute top-4 left-5 flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-[#6d7df5] bg-white overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4" alt="Alex" className="w-full h-full object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-[#6d7df5] bg-white overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffdfbf" alt="Sarah" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider text-white">
                Project Alpha
              </div>
              <div className="relative z-10">
                <h3 className="text-white font-bold text-lg leading-tight">Design Sync</h3>
                <p className="text-white/80 text-sm mt-0.5 truncate pr-4">Sarah: The new aurora assets are uploaded.</p>
              </div>
            </div>

            {/* Story Bar */}
            <div className="-mx-6">
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4 px-6 py-2">
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer relative">
                    <div className="w-[68px] h-[68px] rounded-full p-[2px] bg-gradient-to-tr from-[#4F6EF7] via-[#9B5CF6] to-[#EC4899] shadow-[0_0_15px_rgba(155,92,246,0.3)]">
                      <div className="w-full h-full rounded-full border-[3px] border-[#0B1224] overflow-hidden bg-[#111827] relative">
                         <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">+</div >
                      </div>
                    </div>
                    <span className="text-xs font-medium text-white/90">Your Story</span>
                  </div>

                  {[
                    { name: 'Elena', seed: 'Elena', color: 'from-[#4F6EF7] via-[#9B5CF6] to-[#EC4899]' },
                    { name: 'Marcus', seed: 'Marcus', color: 'from-[#4F6EF7] via-[#9B5CF6] to-[#EC4899]' },
                    { name: 'Suki', seed: 'Suki', color: 'from-[#4F6EF7] via-[#9B5CF6] to-[#EC4899]' },
                    { name: 'David', seed: 'David', color: 'bg-white/10' },
                    { name: 'Chloe', seed: 'Chloe', color: 'bg-white/10' }
                  ].map((story, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 cursor-pointer">
                      <div className={`w-[68px] h-[68px] rounded-full p-[2px] ${story.color.startsWith('bg') ? story.color : `bg-gradient-to-tr ${story.color}`}`}>
                        <div className="w-full h-full rounded-full border-[3px] border-[#0B1224] overflow-hidden bg-[#111827]">
                           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${story.seed}&backgroundColor=transparent`} alt={story.name} className="w-full h-full object-cover bg-white/5" />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-white/70">{story.name}</span>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="hidden" />
              </ScrollArea>
            </div>

            {/* Chat List */}
            <div className="flex flex-col gap-1">
              {[
                { name: 'Nexus AI', msg: 'I have analyzed your recent design files.', time: 'Just now', unread: 1, isAi: true, seed: 'Bot' },
                { name: 'Isabella Nguyen', msg: 'Are we still on for lunch tomorrow? 🍣', time: '10:42 AM', unread: 3, isAi: false, seed: 'Bella' },
                { name: 'Product Team', msg: 'Mark: Deployed to staging!', time: 'Yesterday', unread: 0, isAi: false, seed: 'Team' },
                { name: 'James Wilson', msg: 'Sent an attachment', time: 'Yesterday', unread: 0, isAi: false, seed: 'James' },
                { name: 'Sofia Rodriguez', msg: 'Thanks for the update! Have a great weekend.', time: 'Friday', unread: 0, isAi: false, seed: 'Sofia' },
                { name: 'Creative Studio', msg: 'New assets available in the shared drive.', time: 'Thu', unread: 0, isAi: false, seed: 'Studio' }
              ].map((chat, i) => (
                <div key={i} className="flex items-center gap-4 p-3 -mx-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group relative">
                  <div className="relative">
                    <Avatar className="w-[52px] h-[52px] border border-white/10 bg-[#111827]">
                      <AvatarImage src={chat.isAi ? undefined : `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.seed}&backgroundColor=transparent`} />
                      <AvatarFallback className="bg-gradient-to-br from-[#1F2937] to-[#111827] text-white">
                        {chat.isAi ? <Bot size={24} className="text-[#9B5CF6]" /> : chat.seed[0]}
                      </AvatarFallback>
                    </Avatar>
                    {chat.isAi && (
                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 text-[9px] font-bold px-1.5 py-0.5 rounded-md border-2 border-[#0B1224] text-white shadow-sm">
                        AI
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-[15px] font-semibold text-[#F9FAFB] truncate pr-2">{chat.name}</h4>
                      <span className={`text-xs whitespace-nowrap ${chat.unread ? 'text-[#9B5CF6] font-medium' : 'text-[#6B7280]'}`}>
                        {chat.time}
                      </span>
                    </div>
                    <p className={`text-sm truncate pr-6 ${chat.unread ? 'text-white/90 font-medium' : 'text-[#6B7280]'}`}>
                      {chat.msg}
                    </p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gradient-to-tr from-[#4F6EF7] to-[#9B5CF6] flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_rgba(155,92,246,0.4)]">
                      {chat.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </ScrollArea>

        {/* Bottom Nav */}
        <div className="absolute bottom-0 w-full h-[88px] bg-[#111827]/90 backdrop-blur-xl border-t border-white/5 flex justify-between items-start px-6 pt-4 pb-8 z-20">
          {[
            { icon: <MessageCircle size={24} />, label: 'Chats', active: true },
            { icon: <Phone size={24} />, label: 'Calls', active: false },
            { icon: <Users size={24} />, label: 'Communities', active: false },
            { icon: <Bell size={24} />, label: 'Updates', active: false },
            { icon: <Settings size={24} />, label: 'Settings', active: false },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 cursor-pointer relative group w-12">
              <div className={`${item.active ? 'text-white' : 'text-[#6B7280] group-hover:text-white/70'} transition-colors relative`}>
                {item.icon}
                {item.active && (
                   <div className="absolute -inset-2 bg-[#9B5CF6]/20 rounded-full blur-md -z-10"></div>
                )}
              </div>
              <span className={`text-[10px] font-medium ${item.active ? 'text-white' : 'text-[#6B7280]'}`}>
                {item.label}
              </span>
              {item.active && (
                <div className="absolute -top-4 w-8 h-[3px] rounded-b-full bg-gradient-to-r from-[#4F6EF7] to-[#9B5CF6] shadow-[0_2px_8px_rgba(155,92,246,0.8)]"></div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
