import React, { createContext, useContext, useState } from 'react'

const SidebarContext = createContext()

export function SidebarProvider({ children }) {
  const [sidebarAberta, setSidebarAberta] = useState(false)

  const toggleSidebar = () => setSidebarAberta(!sidebarAberta)
  const fecharSidebar = () => setSidebarAberta(false)

  return (
    <SidebarContext.Provider value={{ sidebarAberta, toggleSidebar, fecharSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar deve ser usado dentro de SidebarProvider')
  return ctx
}
