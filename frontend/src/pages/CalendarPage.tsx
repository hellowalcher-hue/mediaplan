// src/pages/CalendarPage.tsx
import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import CalendarHeader from '../components/Calendar/CalendarHeader'
import CalendarGrid from '../components/Calendar/CalendarGrid'
import Sidebar from '../components/Sidebar/Sidebar'
import ActivityModal from '../components/Modals/ActivityModal'
import type { Activity } from '../types'
import './CalendarPage.css'

export default function CalendarPage() {
  const { error, loading } = useApp()
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [createDate, setCreateDate] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  function openCreate(date: string) {
    setSelectedActivity(null)
    setCreateDate(date)
    setModalOpen(true)
  }

  function openEdit(activity: Activity) {
    setSelectedActivity(activity)
    setCreateDate(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedActivity(null)
    setCreateDate(null)
  }

  return (
    <div className="calendar-page">
      <CalendarHeader onOpenCreate={() => openCreate(new Date().toISOString().slice(0, 10))} />

      {error && (
        <div className="error-bar">⚠️ {error}</div>
      )}

      <div className="calendar-body">
        <Sidebar onOpenActivity={openEdit} onCreateActivity={openCreate} />
        <div className="calendar-main">
          {loading && !error ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <CalendarGrid onClickDay={openCreate} onClickCard={openEdit} />
          )}
        </div>
      </div>

      {modalOpen && (
        <ActivityModal
          activity={selectedActivity}
          defaultDate={createDate}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
