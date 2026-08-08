// Admission Lottery Draw API helpers — shared CRUD via local Python backend
//
//   GET    /api/admission-lotteries           → { admission_lotteries: [...] }
//   POST   /api/admission-lotteries           → create → { ok, id }
//   POST   /api/admission-lotteries?id=N      → update → { ok, id }
//   DELETE /api/admission-lotteries?id=N      → delete → { ok }

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface LotteryDraw {
  id?: number
  academic_year_id: number | null
  class_name: string
  total_seats: number
  quota_config: Record<string, number>
  selected_applicant_ids: number[]
  waiting_applicant_ids: number[]
  draw_date: string
  is_published: boolean
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export function emptyLottery(): LotteryDraw {
  return {
    academic_year_id: null,
    class_name: '',
    total_seats: 40,
    quota_config: {
      general: 80,
      freedom_fighter: 10,
      disabled: 5,
      staff: 5,
    },
    selected_applicant_ids: [],
    waiting_applicant_ids: [],
    draw_date: new Date().toISOString().split('T')[0],
    is_published: false,
    is_active: true,
  }
}

export async function fetchLotteries(): Promise<LotteryDraw[]> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-lotteries`)
    if (!res.ok) return []
    const data = (await res.json()) as { admission_lotteries?: LotteryDraw[] }
    return data.admission_lotteries ?? []
  } catch {
    return []
  }
}

export async function saveLottery(lottery: LotteryDraw): Promise<boolean> {
  try {
    const isEdit = Boolean(lottery.id)
    const res = await fetch(`${API_BASE}/api/admission-lotteries${isEdit ? `?id=${lottery.id}` : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lottery),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteLottery(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admission-lotteries?id=${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}
