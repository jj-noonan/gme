/** Column placard above the trip list. Shown at every width. */
export function BoardHeader() {
  return (
    <div className="board-header">
      <div className="board-header__col">Depart</div>
      <div className="board-header__col">Board</div>
      <div className="board-header__col">Arrive</div>
    </div>
  );
}
