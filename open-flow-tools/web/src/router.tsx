import { createBrowserRouter, Navigate } from 'react-router'
import App from '@/App'
import { steps } from '@/steps'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      ...steps.map((s) => ({
        path: s.path,
        lazy: async () => ({ Component: (await s.load()).default }),
      })),
    ],
  },
])
