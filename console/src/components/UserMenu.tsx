import { useNavigate } from 'react-router-dom'
import { User, LogOut, KeyRound, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function UserMenu() {
  const nav = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    nav('/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User size={16} />
          <span className="max-w-[120px] truncate">{user?.userName ?? '用户'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{user?.userName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Profile and ChangePassword dialogs will be wired in Chunk 6 */}
        <DropdownMenuItem disabled>
          <UserCircle size={14} />
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <KeyRound size={14} />
          修改密码
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-error-500 focus:text-error-500">
          <LogOut size={14} />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
