import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MotionGate from './components/common/MotionGate.jsx'
import SystemDialog from './components/SystemDialog.jsx'

// MotionGate wraps at the ROOT, not inside App, because App returns early for BSOD, BootSequence
// and LoginScreen — wrapping the authed tree would leave boot and login animating at full tempo.
// The CSS half of reduced motion lives in src/theme/grammar.css; Framer springs can't read CSS
// variables, so both mechanisms are required. See MotionGate for why it is a component and not a
// bare `<MotionConfig reducedMotion="user">`.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionGate>
      <App />
      {/* Sibling of App, for the same reason MotionGate wraps it: App returns early for BSOD, boot
          and login, and a dialog raised from any of those three still has to be able to appear. */}
      <SystemDialog />
    </MotionGate>
  </StrictMode>,
)
