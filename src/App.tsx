import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { RoleProvider } from '@/roles/RoleProvider'
import { AppRoutes } from '@/routes/AppRoutes'

// staleTime: Infinity (TAD §0.5/ADR-014) — a deployment's data is immutable once built.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } },
})

function App() {
  return (
    <RoleProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </RoleProvider>
  )
}

export default App
