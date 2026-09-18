import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LearningModeSelector } from '../components/learn/LearningModeSelector'
import { CompletePage } from '../pages/CompletePage'
import { PathPage } from '../pages/PathPage'
import { StoriesPage } from '../pages/StoriesPage'
import { EpicPage } from '../pages/EpicPage'
import { makeStateWithProfile, renderWithProviders } from './testUtils'

describe('V2 learning navigation', () => {
  it('switches between Slokas and Stories with a keyboard-native control', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<LearningModeSelector value="slokas" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Slokas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: 'Stories' }))
    expect(onChange).toHaveBeenCalledWith('stories')
  })

  it('renders both epic cards on the Stories landing page', () => {
    renderWithProviders(
      <Routes>
        <Route path="/stories" element={<StoriesPage />} />
      </Routes>,
      { route: '/stories', state: makeStateWithProfile() },
    )
    expect(screen.getByRole('heading', { name: 'Ramayana' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mahabharata' })).toBeInTheDocument()
  })

  it('shows the editorial status of every sloka path node', () => {
    renderWithProviders(
      <Routes>
        <Route path="/slokas" element={<PathPage />} />
      </Routes>,
      { route: '/slokas', state: makeStateWithProfile() },
    )

    // 7 original interactive lessons + Shuklam Baradharam + Shivashtakam.
    expect(screen.getAllByText('Editorial review')).toHaveLength(9)
    expect(screen.getAllByText('Draft')).toHaveLength(2)
    expect(
      screen.getByRole('link', {
        name: 'Saraswati Namastubhyam. Ready to start. Editorial review',
      }),
    ).toBeInTheDocument()
  })

  it('renders the Ramayana and Mahabharata chapter paths', () => {
    const state = makeStateWithProfile()
    const ramayana = renderWithProviders(
      <Routes>
        <Route path="/stories/:epicId" element={<EpicPage />} />
      </Routes>,
      { route: '/stories/ramayana', state },
    )
    expect(
      screen.getByRole('heading', { name: 'Ayodhya and King Dasharatha' }),
    ).toBeInTheDocument()
    ramayana.unmount()

    renderWithProviders(
      <Routes>
        <Route path="/stories/:epicId" element={<EpicPage />} />
      </Routes>,
      { route: '/stories/mahabharata', state },
    )
    expect(screen.getByRole('heading', { name: 'The Kuru Family' })).toBeInTheDocument()
  })

  it('renders the generic completion route for both content types', () => {
    const slokaState = makeStateWithProfile({
      lastCompletion: {
        contentType: 'sloka',
        contentId: 'saraswati-namastubhyam',
        stars: 3,
        xpEarned: 20,
        badgeUnlockedId: 'first-steps',
        isFirstCompletion: true,
      },
    })
    const sloka = renderWithProviders(
      <Routes>
        <Route path="/complete/:contentType/:contentId" element={<CompletePage />} />
      </Routes>,
      {
        route: '/complete/sloka/saraswati-namastubhyam',
        state: slokaState,
      },
    )
    expect(screen.getByRole('heading', { name: 'Lesson Complete!' })).toBeInTheDocument()
    sloka.unmount()

    const storyState = makeStateWithProfile({
      lastCompletion: {
        contentType: 'story',
        contentId: 'ramayana-ayodhya-and-king-dasharatha',
        stars: 3,
        xpEarned: 20,
        badgeUnlockedId: 'ayodhya-story-listener',
        isFirstCompletion: true,
      },
    })
    renderWithProviders(
      <Routes>
        <Route path="/complete/:contentType/:contentId" element={<CompletePage />} />
      </Routes>,
      {
        route: '/complete/story/ramayana-ayodhya-and-king-dasharatha',
        state: storyState,
      },
    )
    expect(screen.getByRole('heading', { name: 'Chapter complete!' })).toBeInTheDocument()
    expect(screen.getByText('Ayodhya and King Dasharatha')).toBeInTheDocument()
  })
})
