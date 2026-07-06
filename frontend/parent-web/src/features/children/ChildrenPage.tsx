import { useState } from 'react'
import { Plus, Pencil, Key, Trash2, Users } from 'lucide-react'
import { useChildren, useChildMutations } from '@/hooks/useChildren'
import { useConfirm } from '@/components/ConfirmDialog'
import { ChildFormDialog } from './ChildFormDialog'
import { SetPinDialog } from './SetPinDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ChildProfileDto, CreateChildDto } from '@/types/homework'

export function ChildrenPage() {
  const { data: children = [], isLoading } = useChildren()
  const m = useChildMutations()
  const confirm = useConfirm()

  const [formOpen, setFormOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<ChildProfileDto | null>(null)
  const [pinChild, setPinChild] = useState<ChildProfileDto | null>(null)

  const openForm = (child: ChildProfileDto | null = null) => {
    setEditingChild(child)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingChild(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">孩子</h1>
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4" />
          新建
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted">加载中…</div>
      ) : children.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/20 p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="text-muted">还没有孩子档案，先添加一个孩子</p>
          <Button className="mt-4" onClick={() => openForm()}>
            <Plus className="h-4 w-4" />
            添加孩子
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{child.avatarKey ?? '🐼'}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink">{child.displayName}</div>
                    <div className="text-sm text-muted">{child.grade} 年级</div>
                  </div>
                  <Badge variant={child.hasPin ? 'success' : 'secondary'} className="shrink-0 text-xs">
                    {child.hasPin ? '已设 PIN' : '未设 PIN'}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openForm(child)}>
                    <Pencil className="h-3.5 w-3.5" />
                    编辑
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPinChild(child)}>
                    <Key className="h-3.5 w-3.5" />
                    设置 PIN
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-error-500 hover:bg-error-500/10 hover:text-error-500"
                    onClick={async () => {
                      if (await confirm('删除孩子？', '将移除该孩子及其数据，无法恢复。')) {
                        m.remove.mutate(child.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <ChildFormDialog
          key={editingChild?.id ?? 'new'}
          open
          onClose={closeForm}
          child={editingChild}
          onSubmit={(dto: CreateChildDto) => {
            if (editingChild) {
              m.update.mutate({ id: editingChild.id, dto }, { onSuccess: closeForm })
            } else {
              m.create.mutate(dto, { onSuccess: closeForm })
            }
          }}
          isPending={m.create.isPending || m.update.isPending}
        />
      )}

      {pinChild && (
        <SetPinDialog
          key={pinChild.id}
          open
          onClose={() => setPinChild(null)}
          child={pinChild}
          onSubmit={(dto) => {
            m.setPin.mutate({ id: pinChild.id, dto }, { onSuccess: () => setPinChild(null) })
          }}
          isPending={m.setPin.isPending}
        />
      )}
    </div>
  )
}
