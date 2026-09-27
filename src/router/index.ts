import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { pageTitle } from '@/utils/format'

declare module 'vue-router' {
  interface RouteMeta {
    /** The tab title. Detail pages leave it out and set their own once loaded. */
    title?: string
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // Titles match index.html's and the ones the Worker writes (worker/src/meta.ts).
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: "Game Test Space | Taiwan's game dev playtesting community" } },
    { path: '/games', name: 'games', component: () => import('../views/GamesView.vue'), meta: { title: pageTitle('Indie Games from Taiwan') } },
    { path: '/games/:slug', name: 'game', component: () => import('../views/GameDetailView.vue'), props: true },
    { path: '/events', name: 'events', component: () => import('../views/EventsView.vue'), meta: { title: pageTitle('Game Dev Events in Taiwan') } },
    { path: '/events/:slug', name: 'event', component: () => import('../views/EventDetailView.vue'), props: true },
    { path: '/auth/discord/callback', name: 'discord-callback', component: () => import('../views/DiscordCallbackView.vue'), meta: { title: pageTitle('Signing In') } },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { title: pageTitle('Admin') },
      children: [
        { path: '', name: 'admin', component: () => import('../views/admin/AdminEventsView.vue') },
        { path: 'events/new', name: 'admin-event-new', component: () => import('../views/admin/AdminEventEditView.vue') },
        { path: 'events/:slug', name: 'admin-event', component: () => import('../views/admin/AdminEventEditView.vue'), props: true },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: pageTitle('Page Not Found') } },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Filters and search only change the query: keep the reader where they are.
    if (to.path === from.path && to.hash === from.hash) return false
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  if (to.meta.title) document.title = to.meta.title
})

export default router
