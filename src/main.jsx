import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MotionGate from './components/common/MotionGate.jsx'

// MotionGate wraps at the ROOT, not inside App, because App returns early for BSOD, BootSequence
// and LoginScreen — wrapping the authed tree would leave boot and login animating at full tempo.
// The CSS half of reduced motion lives in src/theme/grammar.css; Framer springs can't read CSS
// variables, so both mechanisms are required. See MotionGate for why it is a component and not a
// bare `<MotionConfig reducedMotion="user">`.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionGate>
      <App />
    </MotionGate>
  </StrictMode>,
)
