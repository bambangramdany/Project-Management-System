'use client'
import { useEffect, useState } from 'react'
import { isFinanceDirector } from '@/lib/rbac'

export function canManageKpiCriteria(evaluator, target) {
  if (!evaluator || !target) return false
  if (evaluator.role === 'OWNER' || isFinanceDirector(evaluator)) return true
  if (evaluator.role === 'DIRECTOR') return evaluator.divisi === target.divisi
  return false
}

// Inline editor for KPI criteria of a given (role, division). Pass `onChange`
// to be notified with the resolved criteria list whenever it loads/changes.
export default function KpiCriteriaEditor({ role, division, session, onChange }) {
  const [items, setItems] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [newCriterion, setNewCriterion] = useState({ key: '', label: '' })

  const canManage = canManageKpiCriteria(session?.user, { role, divisi: division })

  function load() {
    fetch(`/api/kpi/criteria?role=${role}&division=${division || ''}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setItems(list)
        onChange?.(list)
      })
  }

  useEffect(() => { load() }, [role, division])

  async function addCriterion() {
    if (!newCriterion.key.trim() || !newCriterion.label.trim()) return
    await fetch('/api/kpi/criteria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, division: division || null, key: newCriterion.key.trim(), label: newCriterion.label.trim(), order: items.length }),
    })
    setNewCriterion({ key: '', label: '' })
    load()
  }

  async function removeCriterion(key) {
    const all = await fetch('/api/kpi/criteria').then(r => r.json())
    const match = all.find(c => c.role === role && (c.division || null) === (division || null) && c.key === key && c.active)
    if (!match) return
    await fetch(`/api/kpi/criteria?id=${match.id}`, { method: 'DELETE' })
    load()
  }

  if (!canManage) return null

  return (
    <div className="mt-2">
      <button onClick={() => setEditMode(m => !m)} className="text-xs text-brand-600 hover:underline">
        {editMode ? 'Selesai' : 'Atur Kriteria KPI'}
      </button>
      {editMode && (
        <div className="mt-2 p-2 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
          {items.map(it => (
            <div key={it.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-700">{it.label} <span className="text-gray-400">({it.key})</span></span>
              <button onClick={() => removeCriterion(it.key)} className="text-red-500 hover:underline">Hapus</button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input className="input text-xs py-1 w-28" placeholder="key" value={newCriterion.key} onChange={e => setNewCriterion(c => ({ ...c, key: e.target.value }))} />
            <input className="input text-xs py-1 flex-1" placeholder="Label kriteria" value={newCriterion.label} onChange={e => setNewCriterion(c => ({ ...c, label: e.target.value }))} />
            <button onClick={addCriterion} className="btn-primary text-xs px-2 py-1">Tambah</button>
          </div>
        </div>
      )}
    </div>
  )
}
