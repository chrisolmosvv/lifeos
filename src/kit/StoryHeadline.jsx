import './formGuide.css'

// StoryHeadline — the one broadsheet "story" line at the top of the Form Guide.
// Sealed gym-kit block: presentation only. The text is built offline by
// gymStory.storyHeadline (NO AI) and passed in; this just sets it in the serif
// display face (the data-page Fraunces exception), calm and centred above the band.
export default function StoryHeadline({ text }) {
  if (!text) return null
  return <p className="fg-story">{text}</p>
}
