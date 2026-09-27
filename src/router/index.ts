import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: '' } },
    { path: '/games', name: 'games', component: () => import('../views/GamesView.vue'), meta: { title: '遊戲作品' } },
    { path: '/games/:slug', name: 'game', component: () => import('../views/GameDetailView.vue'), props: true },
    { path: '/events', name: 'events', component: () => import('../views/EventsView.vue'), meta: { title: '活動資訊' } },
    { path: '/events/:slug', name: 'event', component: () => import('../views/EventDetailView.vue'), props: true },
    { path: '/auth/discord/callback', name: 'discord-callback', component: () => import('../views/DiscordCallbackView.vue'), meta: { title: '登入' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: '找不到頁面' } },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

const SITE = 'The Game Test Space'
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  if (title !== undefined) document.title = title ? `${title}｜${SITE}` : `${SITE}｜台灣遊戲開發者互相試玩的社群`
})

export default router
