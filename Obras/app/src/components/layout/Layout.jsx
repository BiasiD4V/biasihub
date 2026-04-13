import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ScrollToTop from './ScrollToTop';
import { ChatMembros } from '../ChatMembros';
import { ObraProvider } from '../../context/ObraContext';
import { SidebarProvider, useSidebar } from '../../context/SidebarContext';

function LayoutContent() {
  const { sidebarAberta, fecharSidebar } = useSidebar();
  const [chatAberto, setChatAberto] = useState(false);

  return (
    <div className="biasi-shell-bg biasi-theme relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-[#2E63D5]/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#FFC82D]/10 blur-[120px]" />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:sticky md:top-0 md:h-screen ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onAbrirChat={() => setChatAberto(true)} />
      </div>

      {sidebarAberta && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={fecharSidebar}
        />
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="fixed left-0 right-0 top-0 z-40 flex-shrink-0 md:left-64">
          <Header />
        </div>

        <main className="erp-main flex-1 overflow-y-auto overflow-x-hidden p-6" style={{ marginTop: '56px' }}>
          <ScrollToTop />
          <Outlet />
        </main>
      </div>

      <ChatMembros aberto={chatAberto} onFechar={() => setChatAberto(false)} />
    </div>
  );
}

export default function Layout() {
  return (
    <ObraProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </ObraProvider>
  );
}
