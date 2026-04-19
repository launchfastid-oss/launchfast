'use client'
import { useState } from 'react'

export function ChecklistTab({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>
  const weeks = d.weeks as Array<{ week: number; title: string; tasks: Array<{ id: string; task: string; category: string; priority: string; estimated_hours: number }> }>
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  if (!weeks) return <div className="card text-center py-8 text-[#555555]">Data belum tersedia</div>
  const totalTasks = weeks.reduce((sum, w) => sum + w.tasks.length, 0)
  const doneCount = Object.values(checked).filter(Boolean).length
  const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0
  const pc: Record<string, string> = { high: 'text-red-500 bg-red-50', medium: 'text-yellow-600 bg-yellow-50', low: 'text-green-600 bg-green-50' }
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-[#1A1A1A]">Progress Keseluruhan</span>
          <span className="text-lg font-bold text-[#1D9E75]">{progress}%</span>
        </div>
        <div className="w5full bg-[#E0E0E0] rounded-full h-3">
          <div className="bg-[#1D9E75] h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-[#888888] mt-2">{doneCount} dari {totalTasks} tugas selesai</p>
      </div>
      {weeks.map(week => (
        <div key={week.week} className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-1">Minggu {week.week}</p>
          <p className="font-bold text-[#1A1A1A] mb-4">{week.title}</p>
          <div className="space-y-2">
            {week.tasks.map(task => (
              <div key={task.id}
                onClick={() => setChecked(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${checked[task.id] ? 'bg-[#E8F7F2]' : 'hover:bg-[#F5F5F5]'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${checked[task.id] ? 'border-[#1D9E75] bg-[#1D9E75]' : 'border-[#E0E0E0]'}`}>
                  {checked[task.id] && <span className="text-white text-xs">â</span>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${checked[task.id] ? 'line-through text-[#888888]' : 'text-[#1A1A1A]'}`}>{task.task}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${pc[task.priority] || 'text-gray-500 bg-gray-50'}`}>{task.priority}</span>
                    <span className="text-xs text-[#888888]">{task.category}</span>
                    <span className="text-xs text-[#888888]">~{task.estimated_hours}j</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
