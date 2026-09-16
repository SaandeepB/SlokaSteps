import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../context/AppStateProvider'
import { createDefaultAppState } from '../context/reducer'
import { useAppState } from '../hooks/useAppState'
import { StoryChapterPage } from '../pages/StoryChapterPage'

function StoryProgressProbe() {
  const { state } = useAppState()
  return (
    <output data-testid="story-progress">
      {JSON.stringify({
        storyChapters: state.progress.storyChapters,
        totalXp: state.progress.totalXp,
        dailyProgress: state.progress.dailyProgress,
      })}
    </output>
  )
}

describe('story listen-only mode', () => {
  it('plays through every scene without completing the chapter or awarding XP', async () => {
    const user = userEvent.setup()
    const initialState = {
      ...createDefaultAppState(),
      profile: {
        nickname: 'Mitra Friend',
        ageBand: '7-8' as const,
        dailyGoalMinutes: 10 as const,
      },
    }
    render(
      <AppStateProvider initialState={initialState}>
        <MemoryRouter
          initialEntries={[
            '/stories/ramayana/ramayana-ayodhya-and-king-dasharatha',
          ]}
        >
          <StoryProgressProbe />
          <Routes>
            <Route
              path="/stories/:epicId/:chapterId"
              element={<StoryChapterPage />}
            />
          </Routes>
        </MemoryRouter>
      </AppStateProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Listen only' }))

    for (let scene = 1; scene < 5; scene += 1) {
      await user.click(screen.getByRole('button', { name: 'Next scene' }))
    }
    await user.click(screen.getByRole('button', { name: 'Finish listening' }))

    expect(
      screen.getByRole('heading', { name: 'Listening complete' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('story-progress')).toHaveTextContent(
      JSON.stringify({
        storyChapters: {},
        totalXp: 0,
        dailyProgress: { date: '', estimatedMinutes: 0 },
      }),
    )
  })
})
