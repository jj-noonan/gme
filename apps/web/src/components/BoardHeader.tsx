import { Icon } from "./Icon";

/** Column placard above the trip list. Shown at every width. */
export function BoardHeader() {
  return (
    <div className="board-header">
      <div className="board-header__col"><Icon name="departs" size={16} /> Depart</div>
      <div className="board-header__col"><Icon name="station" size={16} /> Change</div>
      <div className="board-header__col"><Icon name="arrives" size={16} /> Arrive</div>
    </div>
  );
}
