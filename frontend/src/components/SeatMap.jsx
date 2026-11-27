export default function SeatMap({ occupied = [], selected = [], selectable = false, onChange = () => {} }) {
  const current = new Set(selected);
  const toggle = (seat) => {
    if (!selectable || occupied.includes(seat)) return;
    const next = new Set(current);
    if (next.has(seat)) next.delete(seat); else if (next.size < 8) next.add(seat);
    onChange([...next].sort());
  };
  return <div className="asientos-grid" aria-label="Mapa de asientos">{['A', 'B', 'C', 'D', 'E', 'F'].flatMap((row) => Array.from({ length: 8 }, (_, i) => `${row}${i + 1}`)).map((seat) => {
    const isOccupied = occupied.includes(seat); const isSelected = current.has(seat);
    return <button key={seat} type="button" className="asiento" disabled={!selectable || isOccupied} data-ocupado={isOccupied} data-seleccionado={isSelected} aria-label={`${seat}${isOccupied ? ' ocupado' : ' libre'}`} onClick={() => toggle(seat)}>{seat}</button>;
  })}</div>;
}
