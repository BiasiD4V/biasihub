import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    const main = document.querySelector('main.erp-main')
    if (main) main.scrollTop = 0
  }, [pathname])
  return null
}
