import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Lazy load components
const Layout = () => import('@/views/Layout.vue')
const Login = () => import('@/views/Login.vue')
const Register = () => import('@/views/Register.vue')
const Dashboard = () => import('@/views/Dashboard.vue')
const Tasks = () => import('@/views/Tasks.vue')
const Logs = () => import('@/views/Logs.vue')
const Storages = () => import('@/views/Storages.vue')
const Notifications = () => import('@/views/Notifications.vue')
const Statistics = () => import('@/views/Statistics.vue')
const Settings = () => import('@/views/Settings.vue')
const Debug = () => import('@/views/Debug.vue')
const TestPage = () => import('@/views/TestPage.vue')
const ButtonTest = () => import('@/views/ButtonTest.vue')
const UITest = () => import('@/views/UITest.vue')
const NotFound = () => import('@/views/NotFound.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      requiresAuth: false,
      title: 'auth.loginTitle'
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
      requiresAuth: false,
      title: 'auth.registerTitle'
    }
  },
  {
    path: '/',
    component: Layout,
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: {
          title: 'nav.dashboard',
          icon: 'dashboard'
        }
      },
      {
        path: 'tasks',
        name: 'Tasks',
        component: Tasks,
        meta: {
          title: 'nav.tasks',
          icon: 'tasks'
        }
      },
      {
        path: 'logs',
        name: 'Logs',
        component: Logs,
        meta: {
          title: 'nav.logs',
          icon: 'logs'
        }
      },
      {
        path: 'storages',
        name: 'Storages',
        component: Storages,
        meta: {
          title: 'nav.storages',
          icon: 'storages'
        }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: Notifications,
        meta: {
          title: 'nav.notifications',
          icon: 'notifications'
        }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: Statistics,
        meta: {
          title: 'nav.statistics',
          icon: 'statistics'
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
        meta: {
          title: 'nav.settings',
          icon: 'settings'
        }
      },
      {
        path: 'debug',
        name: 'Debug',
        component: Debug,
        meta: {
          title: 'Debug',
          icon: 'bug'
        }
      },
      {
        path: 'test',
        name: 'Test',
        component: TestPage,
        meta: {
          title: 'Test',
          icon: 'test'
        }
      },
      {
        path: 'button-test',
        name: 'ButtonTest',
        component: ButtonTest,
        meta: {
          title: 'Button Test',
          icon: 'button'
        }
      },
      {
        path: 'ui-test',
        name: 'UITest',
        component: UITest,
        meta: {
          title: 'UI Test',
          icon: 'ui'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      requiresAuth: false,
      title: '404 - Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  console.log('Router guard:', {
    to: to.name,
    requiresAuth: to.meta.requiresAuth,
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    hasUser: !!authStore.user
  })

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    // Check if user is authenticated (only check local state first)
    if (!authStore.isAuthenticated) {
      console.log('Not authenticated, redirecting to login')
      // Redirect to login page immediately, auth check will happen in the background
      next({
        name: 'Login',
        query: { redirect: to.fullPath }
      })
      return
    }
  } else {
    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (authStore.isAuthenticated && (to.name === 'Login' || to.name === 'Register')) {
      console.log('Already authenticated, redirecting to dashboard')
      next({ name: 'Dashboard' })
      return
    }
  }

  console.log('Navigation allowed')
  next()
})

// Update document title
router.afterEach((to) => {
  const title = to.meta.title as string
  if (title) {
    // This will be updated by i18n in the component
    document.title = `${title} - 备份服务`
  }
})

export default router
