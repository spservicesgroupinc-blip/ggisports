/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Calendar, LayoutTemplate, Users, MapPin, Clock, LogOut, Settings, MessageSquare, Bike, ArrowLeft, X } from 'lucide-react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import { fetchFromGas, gasAuth } from './services/gasService';

type ViewMode = 'calendar' | 'admin' | 'chat';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(gasAuth.isAuthenticated());
  const [view, setView] = useState<ViewMode>('calendar');
  const [userRole, setUserRole] = useState<string>('user');
  
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedEventUrlId, setSelectedEventUrlId] = useState<string | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => setIsAuthenticated(false);
    window.addEventListener('gas-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('gas-unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (isAuthenticated && view === 'calendar') {
      loadEvents();
    }
  }, [isAuthenticated, view]);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const data = await fetchFromGas('getEvents');
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    setRegisteringEventId(eventId);
    try {
      await fetchFromGas('registerForEvent', { eventId });
      await loadEvents();
      alert('Successfully registered!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to register');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleLoginSuccess = (role?: string) => {
    setIsAuthenticated(true);
    if(role) setUserRole(role);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const handleLogout = () => {
    gasAuth.logout();
    setIsAuthenticated(false);
    setView('calendar');
  };

  const selectedEvent = events.find(e => e.id === selectedEventUrlId);

  return (
    <div className="h-[100dvh] w-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col md:flex-row overflow-hidden select-none">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-neutral-900/50 border-r border-neutral-800 flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">GGI Youth Sports</span>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Navigation</div>
          <button onClick={() => setView('calendar')} className={`flex w-full items-center gap-3 px-3 py-2 rounded-md transition-colors ${view === 'calendar' ? 'bg-cyan-900/20 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <Calendar className="w-5 h-5" /> Event Board
          </button>
          <button onClick={() => setView('chat')} className={`flex w-full items-center gap-3 px-3 py-2 rounded-md transition-colors ${view === 'chat' ? 'bg-cyan-900/20 text-cyan-400' : 'text-neutral-400 hover:bg-neutral-800'}`}>
            <MessageSquare className="w-5 h-5" /> Messaging
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-4">
          <div className="flex items-center justify-between gap-2 p-2 bg-neutral-800/50 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase">
                ME
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">Logged In</div>
                <div className="text-[10px] text-neutral-500 uppercase">{userRole}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-neutral-500 hover:text-white transition-colors p-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-[10px] text-neutral-600 px-2 mt-4 font-medium">
            Grant, Grace, and Isaiah Russell are the owners of this club
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {view === 'admin' ? (
          <AdminPanel 
            onBack={() => setView('calendar')} 
            userRole={userRole} 
            onRoleUpdate={setUserRole} 
          />
        ) : view === 'chat' ? (
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            <Chat onBack={() => setView('calendar')} />
          </main>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 flex flex-col h-full bg-neutral-950 overflow-y-auto">
              <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-white">Upcoming Events</h1>
                  <p className="text-[10px] md:text-xs text-neutral-500 uppercase tracking-widest mt-0.5">Explore & Register</p>
                </div>
                <button 
                  onClick={() => setView('admin')}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2"
                >
                  <Settings className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Admin Panel</span>
                </button>
              </header>

              <div className="p-4 md:p-8 max-w-5xl mx-auto w-full flex-1 md:pb-8">
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-pulse text-neutral-500 flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animation-delay-200"></div>
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animation-delay-400"></div>
                    </div>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-20 px-6 rounded-2xl border border-dashed border-neutral-800 mt-10">
                    <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white">No Events Available</h3>
                    <p className="text-sm text-neutral-500 mt-2">Check back later or contact an administrator.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {events.map((evt) => {
                      const isSelected = selectedEventUrlId === evt.id;
                      return (
                        <div 
                          key={evt.id} 
                          onClick={() => setSelectedEventUrlId(evt.id)}
                          className={`bg-neutral-900 rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                            isSelected ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500/50' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                          }`}
                        >
                          <div className="p-4 md:p-5">
                            <h3 className="text-base md:text-lg font-semibold text-white mb-2">{evt.title}</h3>
                            <div className="space-y-1.5 md:space-y-2 mt-3 md:mt-4">
                              <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
                                <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                                {new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
                                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                                {new Date(evt.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
                                <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                <span className="truncate">{evt.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 md:px-5 py-3 bg-neutral-950/50 border-t border-neutral-800 flex items-center justify-between">
                            <div className="text-[10px] md:text-xs font-medium text-neutral-500">
                              {evt.currentRegistrations} / {evt.capacity} registered
                            </div>
                            <div className="text-[10px] md:text-xs font-semibold text-cyan-500 flex items-center gap-1">
                              Details &rarr;
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>

            {/* Right Panel - Event Details (Desktop only, mobile handled via overlay) */}
            <aside className="hidden lg:flex w-80 bg-neutral-900/30 border-l border-neutral-800 flex-col shrink-0">
              {selectedEvent ? (
                <div className="p-6 h-full flex flex-col overflow-y-auto space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">{selectedEvent.title}</h2>
                    <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-cyan-900/30 text-cyan-400 w-fit rounded-full">
                      {selectedEvent.currentRegistrations} / {selectedEvent.capacity} spots filled
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <div className="flex items-start gap-3 text-neutral-300">
                      <Calendar className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Date & Time</div>
                        <div className="text-sm text-neutral-500">
                          {new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-neutral-300">
                      <MapPin className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Location</div>
                        <div className="text-sm text-neutral-500">{selectedEvent.location}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <div className="text-sm font-medium text-neutral-300 mb-2">About this event</div>
                    <p className="text-sm text-neutral-500 leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-6">
                    {selectedEvent.currentRegistrations >= selectedEvent.capacity ? (
                      <button disabled className="w-full py-3 bg-neutral-800 text-neutral-500 rounded-xl text-sm font-semibold cursor-not-allowed">
                        Event is Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(selectedEvent.id)}
                        disabled={registeringEventId === selectedEvent.id}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                      >
                        {registeringEventId === selectedEvent.id ? 'Registering...' : 'Register for Event'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4 text-neutral-500">
                  <LayoutTemplate className="w-12 h-12 text-neutral-800" />
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">No Event Selected</h3>
                    <p className="text-xs mt-1">Select an event from the board to view details.</p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden flex items-center justify-around bg-neutral-950 border-t border-neutral-800 pb-safe w-full z-20 shrink-0">
          <button 
            onClick={() => setView('calendar')} 
            className={`flex flex-col items-center gap-1 p-3 w-full ${view === 'calendar' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-medium">Events</span>
          </button>
          <button 
            onClick={() => setView('chat')} 
            className={`flex flex-col items-center gap-1 p-3 w-full ${view === 'chat' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">Chat</span>
          </button>
          <button 
            onClick={() => setView('admin')} 
            className={`flex flex-col items-center gap-1 p-3 w-full ${view === 'admin' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        </nav>

        {/* Mobile Event Details Overlay */}
        {selectedEvent && view === 'calendar' && (
          <div className="lg:hidden absolute inset-0 z-30 bg-neutral-950 flex flex-col slide-in-bottom animate-in fade-in duration-200">
            <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center px-4 sticky top-0 bg-neutral-950 shrink-0 gap-4">
              <button 
                onClick={() => setSelectedEventUrlId(null)} 
                className="p-3 -ml-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors rounded-full"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold text-white truncate flex-1">{selectedEvent.title}</h2>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-cyan-900/30 text-cyan-400 w-fit rounded-full">
                {selectedEvent.currentRegistrations} / {selectedEvent.capacity} spots filled
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-800">
                <div className="flex items-start gap-3 text-neutral-300">
                  <Calendar className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Date & Time</div>
                    <div className="text-sm text-neutral-500">
                      {new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-neutral-300">
                  <MapPin className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm text-neutral-500">{selectedEvent.location}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <div className="text-sm font-medium text-neutral-300 mb-2">About this event</div>
                <p className="text-sm text-neutral-500 leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>
            </div>

            <div className="p-4 bg-neutral-950 border-t border-neutral-800 shrink-0 pb-safe">
              {selectedEvent.currentRegistrations >= selectedEvent.capacity ? (
                <button disabled className="w-full py-3.5 bg-neutral-800 text-neutral-500 rounded-xl text-sm font-semibold cursor-not-allowed">
                  Event is Full
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(selectedEvent.id)}
                  disabled={registeringEventId === selectedEvent.id}
                  className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {registeringEventId === selectedEvent.id ? 'Registering...' : 'Register for Event'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
