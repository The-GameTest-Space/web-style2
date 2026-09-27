import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/games', name: 'games', component: () => import('../views/GamesView.vue') },
    { path: '/games/:slug', name: 'game', component: () => import('../views/GameDetailView.vue'), props: true },
    { path: '/events', name: 'events', component: () => import('../views/EventsView.vue') },
    { path: '/events/:slug', name: 'event', component: () => import('../views/EventDetailView.vue'), props: true },
    { path: '/auth/discord/callback', name: 'discord-callback', component: () => import('../views/DiscordCallbackView.vue') },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      children: [
        { path: '', name: 'admin', component: () => import('../views/admin/AdminEventsView.vue') },
        { path: 'events/new', name: 'admin-event-new', component: () => import('../views/admin/AdminEventEditView.vue') },
        { path: 'events/:slug', name: 'admin-event', component: () => import('../views/admin/AdminEventEditView.vue'), props: true },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
