import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ScrollToTop from './ScrollToTop'
import { ChatMembros } from '../ChatMembros'
import { ObraProvider } from '../../context/ObraContext'
import { SidebarProvider, useSidebar } from '../../context/SidebarContext'

function LayoutContent() {
  const { sidebarAberta, fecharSidebar } = useSidebar()
  const [chatAberto, setChatAberto] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Sidebar: escondida em mobile por padrão */}
      <div className={`fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-40 transition-transform duration-300 ${
        sidebarAberta ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <Sidebar onAbrirChat={() => setChatAberto(true)} />
      </div>

      {/* Overlay em mobile quando sidebar aberta */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={fecharSidebar}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="fixed top-0 right-0 left-0 md:left-64 z-40 flex-shrink-0">
          <Header />
        </div>
        <main className="erp-main flex-1 overflow-y-auto p-6" style={{ marginTop: '56px' }}>
          <ScrollToTop />
          <Outlet />
        </main>
      </div>

      <ChatMembros aberto={chatAberto} onFechar={() => setChatAberto(false)} />
    </div>
  )
}

export default function Layout() {
  return (
    <ObraProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </ObraProvider>
  )
}