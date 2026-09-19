export function BoardHeader({ showTrack }: { showTrack?: boolean }) {
  return (
    <div className="board-header">
      <div className="board-header__leave">Leave</div>
      <div className="board-header__time">Depart</div>
      <div className="board-header__main">Train</div>
      {showTrack && <div className="board-header__track">Trk</div>}
      <div className="board-header__status">Status</div>
    </div>
  );
}
