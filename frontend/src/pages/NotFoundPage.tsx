import { Link } from 'react-router-dom'
import { Home, Search, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-danger/10 flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-danger" />
        </div>
        <h1 className="text-display font-bold mb-2">404</h1>
        <h2 className="text-h2 mb-4">Страница не найдена</h2>
        <p className="text-text-muted mb-8">
          Похоже, этой страницы не существует или она была перемещена.
          Проверьте адрес в строке браузера.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.history.back()}>
            <Search className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Link to="/">
            <Button variant="secondary">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
