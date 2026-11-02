/** A ghost of the gesture: a hand tapping the thing to tap (as Starweave's own
 *  tour does). Each room places it on its target (CSS in rooms.css). */
export default function TapHand() {
  return (
    <svg className="tap-hand" viewBox="0 0 44 54" aria-hidden="true">
      <path d="M15 27V7a4 4 0 0 1 8 0v12a4 4 0 0 1 8 0a3.6 3.6 0 0 1 7 1v13c0 9-6 16-14 16h-3c-6 0-9-3-12-8l-6-10a3.6 3.6 0 0 1 6-4l6 6z" />
      <path className="tap-hand-crease" d="M23 19v6M31 20v5" />
    </svg>
  );
}
