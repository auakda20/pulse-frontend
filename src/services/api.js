import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('pulse_token')
  if (token) cfg.headers.Authorization = 'Bearer ' + token
  return cfg
})

export const authService = {
  login:          (body) => api.post('/auth/login', body).then(r => r.data),
  me:             ()     => api.get('/auth/me').then(r => r.data),
  updateProfile:  (body) => api.put('/auth/me', body).then(r => r.data),
  changePassword: (body) => api.put('/auth/password', body).then(r => r.data),
}

export const projectService = {
  list:   (vertical) => api.get('/projects' + (vertical ? '?vertical=' + vertical : '')).then(r => r.data),
  create: (body)     => api.post('/projects', body).then(r => r.data),
  update: (id, body) => api.put('/projects/' + id, body).then(r => r.data),
  remove: (id)       => api.delete('/projects/' + id).then(r => r.data),
}

export const userService = {
  list:          ()             => api.get('/users').then(r => r.data),
  create:        (body)         => api.post('/users', body).then(r => r.data),
  update:        (id, body)     => api.put('/users/' + id, body).then(r => r.data),
  resetPassword: (id, newPassword) => api.put('/users/' + id + '/password', { newPassword }).then(r => r.data),
  remove:        (id)           => api.delete('/users/' + id).then(r => r.data),
}

export const sessionService = {
  checkin:  ()      => api.post('/sessions/checkin').then(r => r.data),
  checkout: ()      => api.post('/sessions/checkout').then(r => r.data),
  today:    ()      => api.get('/sessions/today').then(r => r.data),
  history:  (range) => api.get('/sessions/history?range=' + range).then(r => r.data),
}

export const goalService = {
  today:    ()                   => api.get('/goals/today').then(r => r.data),
  create:   (body)               => api.post('/goals', body).then(r => r.data),
  toggle:   (id)                 => api.patch('/goals/' + id).then(r => r.data),
  priority: (id, priority)       => api.patch('/goals/' + id + '/priority', { priority }).then(r => r.data),
  remove:   (id)                 => api.delete('/goals/' + id).then(r => r.data),
}

export const activityService = {
  today:  ()     => api.get('/activities/today').then(r => r.data),
  create: (body) => api.post('/activities', body).then(r => r.data),
  remove: (id)   => api.delete('/activities/' + id).then(r => r.data),
}

export const teamService = {
  today:   ()      => api.get('/team/today').then(r => r.data),
  history: (range) => api.get('/team/history?range=' + range).then(r => r.data),
  log:     (range) => api.get('/team/log?range=' + range).then(r => r.data),
}

export const noteService = {
  today: (date) => api.get('/notes/today' + (date ? '?date=' + date : '')).then(r => r.data),
  save:  (content, date) => api.put('/notes/today', { content, date }).then(r => r.data),
}

export const pendenciaService = {
  list:   ()              => api.get('/pendencias').then(r => r.data),
  toggle: (id, done, doneBy) => api.patch('/pendencias/' + id, { done, doneBy }).then(r => r.data),
}

export const runbookService = {
  list:   (vertical) => api.get('/runbook' + (vertical ? '?vertical=' + vertical : '')).then(r => r.data),
  get:    (slug)     => api.get('/runbook/' + slug).then(r => r.data),
  create: (body)     => api.post('/runbook', body).then(r => r.data),
  update: (id, body) => api.put('/runbook/' + id, body).then(r => r.data),
  remove: (id)       => api.delete('/runbook/' + id).then(r => r.data),
}
