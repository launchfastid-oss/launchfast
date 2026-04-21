'use client'

interface Task {
  id: string
  task: string
  category: string
  priority: 'high' | 'medium' | 'low'
  estimated_hours: number
  completed?: boolean
  completed_note?: string
}

interface Week {
  week: number
  title: string
  tasks: Task[]
}

interface ChecklistData {
  weeks?: Week[]
  auto_checked?: Record<string, boolean>
}

const CATEGORY_COLORS: Record<string, string> = {
  Brand: '#8B5CF6',
  Digital: '#3B82F6',
  Sales: '#10B981',
  Operations: '#F59E0B',
  Legal: '#EF4444',
}

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Prioritas Tinggi',
  medium: 'Prioritas Sedang',
  low: 'Prioritas Rendah',
}

export function ChecklistTab({ data }: { data: Record<string, unknown> }) {
  const d = data as ChecklistData
  const weeks = d.weeks || []

  if (weeks.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>✅</p>
        <p style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '4px' }}>Checklist belum tersedia</p>
        <p style={{ fontSize: '13px', color: '#888' }}>Generate ulang brand kit untuk mendapatkan checklist</p>
      </div>
    )
  }

  const totalTasks = weeks.reduce((sum, w) => sum + w.tasks.length, 0)
  const completedTasks = weeks.reduce((sum, w) => sum + w.tasks.filter(t => t.completed).length, 0)
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Progress Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Progress Peluncuran</p>
            <p style={{ fontWeight: 800, fontSize: '28px', color: '#1A1A1A' }}>{progressPct}%</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 700, color: '#1A1A1A', fontSize: '18px' }}>{completedTasks}<span style={{ color: '#888', fontWeight: 400, fontSize: '14px' }}>/{totalTasks}</span></p>
            <p style={{ fontSize: '12px', color: '#888' }}>Task selesai</p>
          </div>
        </div>
        <div style={{ background: '#F0F0F0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ background: '#1D9E75', height: '100%', width: progressPct + '%', borderRadius: '999px', transition: 'width 0.5s ease' }} />
        </div>
        {d.auto_checked && (
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(d.auto_checked).map(([key, val]) => val && (
              <span key={key} style={{ background: '#E8F7F2', color: '#1D9E75', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px' }}>
                ✓ {key.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Weeks */}
      {weeks.map((week) => {
        const weekCompleted = week.tasks.filter(t => t.completed).length
        return (
          <div key={week.week} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Minggu {week.week}</p>
                <p style={{ fontWeight: 700, fontSize: '16px', color: '#1A1A1A' }}>{week.title}</p>
              </div>
              <span style={{ fontSize: '12px', color: '#888', background: '#F5F5F5', padding: '4px 10px', borderRadius: '999px' }}>
                {weekCompleted}/{week.tasks.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {week.tasks.map((task) => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px', borderRadius: '10px',
                  background: task.completed ? '#F0FBF6' : '#FAFAFA',
                  border: '1px solid ' + (task.completed ? '#BBE8D5' : '#EFEFEF'),
                  opacity: task.completed ? 0.85 : 1,
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                    background: task.completed ? '#1D9E75' : 'white',
                    border: '2px solid ' + (task.completed ? '#1D9E75' : '#DDD'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px',
                  }}>
                    {task.completed && <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontWeight: 600, fontSize: '13px', color: '#1A1A1A',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      marginBottom: task.completed_note ? '4px' : '6px',
                    }}>{task.task}</p>
                    {task.completed_note && (
                      <p style={{ fontSize: '11px', color: '#1D9E75', marginBottom: '6px' }}>✓ {task.completed_note}</p>
                    )}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: CATEGORY_COLORS[task.category] || '#888', background: (CATEGORY_COLORS[task.category] || '#888') + '18', padding: '2px 7px', borderRadius: '999px' }}>
                        {task.category}
                      </span>
                      <span style={{ fontSize: '11px', color: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#888' }}>
                        {PRIORITY_LABEL[task.priority] || task.priority}
                      </span>
                      {task.estimated_hours > 0 && (
                        <span style={{ fontSize: '11px', color: '#AAA' }}>~{task.estimated_hours}h</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
