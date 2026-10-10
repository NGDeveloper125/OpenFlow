export const steps = [
  { path: 'projects', label: 'Projects', load: () => import('@/views/ProjectsView') },
  { path: 'data', label: 'Data', load: () => import('@/views/DataView') },
  { path: 'model', label: 'Model', load: () => import('@/views/ModelView') },
  { path: 'training-setup', label: 'Training setup', load: () => import('@/views/TrainingSetupView') },
  { path: 'train', label: 'Train', load: () => import('@/views/TrainView') },
  { path: 'evaluate', label: 'Evaluate', load: () => import('@/views/EvaluateView') },
  { path: 'playground', label: 'Playground', load: () => import('@/views/PlaygroundView') },
]
