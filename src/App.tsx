import { MsalProvider } from '@azure/msal-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { msalInstance } from '@/auth/msalInstance'
import { AppRoutes } from '@/routes/AppRoutes'

// staleTime: Infinity (TAD §0.5/ADR-014) — a deployment's data is immutable once built.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } },
})

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </MsalProvider>
  )
}

export default App
